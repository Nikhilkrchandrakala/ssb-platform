import fs from "fs";
import path from "path";
import crypto from "node:crypto";

// Same env-loading pattern as phase1/phase2_sales_verify.ts.
const envFiles = [".env.local", ".env", "env", ".env.development"];
for (const envFile of envFiles) {
  const file = path.join(process.cwd(), envFile);
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

const BASE_URL = process.env.PHASE3_VERIFY_BASE_URL || "http://localhost:3000";
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "ssb_session";
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${label}`);
  if (!condition) failures++;
}

function cookieFor(token: string) {
  return `${SESSION_COOKIE_NAME}=${token}`;
}

async function callApi(method: string, urlPath: string, token: string | null, body?: unknown) {
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Cookie: cookieFor(token) } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: Record<string, unknown> = {};
  try {
    json = await res.json();
  } catch {
    // no body
  }
  return { status: res.status, json };
}

/**
 * Posts a raw, correctly (or, if `badSignature`, deliberately incorrectly)
 * HMAC-signed webhook body to /api/webhooks/razorpay — reproducing exactly
 * what Razorpay's own webhook delivery does. This env has no public URL yet
 * (still on localhost, pre-Phase-7 deployment) so Razorpay itself cannot
 * reach this endpoint; signing a synthetic-but-real-shaped event with the
 * actual configured RAZORPAY_WEBHOOK_SECRET is the closest honest
 * equivalent, and is what the webhook handler code path actually runs on
 * regardless of who signed the request.
 */
async function postWebhook(eventObj: unknown, opts: { badSignature?: boolean } = {}) {
  const rawBody = JSON.stringify(eventObj);
  const signature = crypto
    .createHmac("sha256", opts.badSignature ? "wrong-secret" : WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const res = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": signature },
    body: rawBody,
  });
  let json: Record<string, unknown> = {};
  try {
    json = await res.json();
  } catch {
    // no body
  }
  return { status: res.status, json };
}

async function main() {
  if (!WEBHOOK_SECRET) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not set — cannot sign synthetic webhook events.");
    process.exit(1);
  }

  const { connectDB } = await import("../src/server/db");
  const { signSessionToken } = await import("../src/server/auth");
  const { razorpay } = await import("../src/server/integrations/razorpay");
  const { AdminUser } = await import("../src/server/models/AdminUser");
  const { Slot } = await import("../src/server/models/Slot");
  const { Order } = await import("../src/server/models/Order");
  const { InstallmentPlan } = await import("../src/server/models/InstallmentPlan");
  const { User } = await import("../src/server/models/User");

  await connectDB();

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  console.log("=== Setup: ephemeral sales exec, slot, and a second unrelated student ===");
  const testExec = await AdminUser.create({
    name: "Phase3 Verify Exec",
    email: `phase3-verify-exec-${runId}@test.local`,
    password: "not-used-jwt-minted-directly",
    role: "admin",
    permissions: ["sales"],
    salesRole: "executive",
  });
  const testSlot = await Slot.create({
    title: "Phase3 Verify Batch",
    batchNo: `P3-${runId}`,
    startTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    maxStudents: 50,
    price: 5000, // finalPriceInclGST = 5900
    isFullCourse: false,
  });
  const otherStudent = await User.create({
    name: "Phase3 Verify Unrelated Student",
    email: `phase3-verify-unrelated-${runId}@test.local`,
    role: "student",
    isManuallyCreated: true,
  });
  const execToken = signSessionToken({ id: String(testExec._id), role: "admin" });
  check("Setup: ephemeral accounts + slot created", true);

  const studentEmail = `phase3-verify-student-${runId}@test.local`;
  const finalDueDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  console.log("\n=== Enroll a student (Phase 2 flow) — real, unpaid Payment Link for installment 1 ===");
  const suggest = await callApi("POST", "/api/sales/suggestSchedule", execToken, {
    slotId: String(testSlot._id),
    initialAmount: 3500,
    numberOfInstallments: 1,
    finalDueDate,
  });
  const suggestedInstallments = (suggest.json.installments as { seq: number; amount: number; dueDate: string }[]) || [];
  check("suggestSchedule: 200, 1 installment suggested", suggest.status === 200 && suggestedInstallments.length === 1);

  const enroll = await callApi("POST", "/api/sales/enrollStudent", execToken, {
    studentName: "Phase3 Verify Student",
    studentEmail,
    slotId: String(testSlot._id),
    initialAmount: 3500,
    installments: suggestedInstallments,
  });
  check("enrollStudent: 200", enroll.status === 200);
  const installmentPlanId = enroll.json.installmentPlanId as string;
  const orderId = enroll.json.orderId as string;

  const planBefore = await InstallmentPlan.findById(installmentPlanId);
  const linkId = planBefore?.installments?.[0]?.paymentLinkId as string;
  check("DB: installment 1 has a real Razorpay payment link, still pending", !!linkId && planBefore?.installments?.[0]?.status === "pending");

  console.log("\n=== Webhook: bad signature is rejected ===");
  const badSig = await postWebhook(
    {
      event: "payment_link.paid",
      payload: {
        payment_link: { entity: { notes: { installmentPlanId, seq: "1" } } },
        payment: { entity: { id: "pay_should_not_apply" } },
      },
    },
    { badSignature: true }
  );
  check("webhook: invalid signature -> 400", badSig.status === 400);
  const planAfterBadSig = await InstallmentPlan.findById(installmentPlanId);
  check("webhook: bad-signature event had no effect", planAfterBadSig?.installments?.[0]?.status === "pending");

  console.log("\n=== Webhook: unrelated event (no matching notes) is a safe no-op ===");
  const unrelated = await postWebhook({
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_unrelated" } } },
  });
  check("webhook: unrelated event -> 200, handled:false", unrelated.status === 200 && unrelated.json.handled === false);

  console.log("\n=== Webhook: payment_link.paid for installment 1 — unlocks order + provisions student ===");
  const paymentId1 = `pay_phase3_verify_${runId}_1`;
  const linkPaid = await postWebhook({
    event: "payment_link.paid",
    payload: {
      payment_link: { entity: { id: linkId, notes: { orderId, installmentPlanId, seq: "1" } } },
      payment: { entity: { id: paymentId1 } },
    },
  });
  check("webhook: payment_link.paid -> 200, handled:true, not alreadyProcessed", linkPaid.status === 200 && linkPaid.json.handled === true && linkPaid.json.alreadyProcessed === false);

  const orderAfter = await Order.findById(orderId);
  const planAfter1 = await InstallmentPlan.findById(installmentPlanId);
  const studentAfter = await User.findOne({ email: studentEmail });
  const slotAfter = await Slot.findById(testSlot._id);
  check("DB: installment 1 marked paid with the webhook's paymentId", planAfter1?.installments?.[0]?.status === "paid" && planAfter1?.installments?.[0]?.paymentId === paymentId1);
  check("DB: Order flipped to status 'paid'", orderAfter?.status === "paid");
  check("DB: student provisioned — role 'student', batch synced, password set", studentAfter?.role === "student" && !!studentAfter?.batch && !!studentAfter?.password);
  check("DB: student pushed into Slot.bookedStudents", (slotAfter?.bookedStudents || []).some((id: { toString(): string }) => String(id) === String(studentAfter?._id)));
  const passwordHashAfterFirst = studentAfter?.password;

  console.log("\n=== Webhook: re-delivering the same event is idempotent (no double-processing) ===");
  const redelivered = await postWebhook({
    event: "payment_link.paid",
    payload: {
      payment_link: { entity: { id: linkId, notes: { orderId, installmentPlanId, seq: "1" } } },
      payment: { entity: { id: paymentId1 } },
    },
  });
  check("webhook: re-delivered event -> 200, alreadyProcessed:true", redelivered.status === 200 && redelivered.json.alreadyProcessed === true);
  const slotAfterRedeliver = await Slot.findById(testSlot._id);
  const studentAfterRedeliver = await User.findOne({ email: studentEmail });
  check(
    "DB: re-delivery did not duplicate the slot booking or regenerate credentials",
    (slotAfterRedeliver?.bookedStudents || []).filter((id: { toString(): string }) => String(id) === String(studentAfterRedeliver?._id)).length === 1 &&
      studentAfterRedeliver?.password === passwordHashAfterFirst
  );

  console.log("\n=== Student dashboard \"Pay Now\": /api/installments/payOrder for installment 2 ===");
  const studentToken = signSessionToken({ id: String(studentAfter!._id), role: "student" });
  const otherStudentToken = signSessionToken({ id: String(otherStudent._id), role: "student" });

  const wrongOwner = await callApi("POST", "/api/installments/payOrder", otherStudentToken, { installmentPlanId, seq: 2 });
  check("payOrder: an unrelated student is rejected (403)", wrongOwner.status === 403);

  const alreadyPaid = await callApi("POST", "/api/installments/payOrder", studentToken, { installmentPlanId, seq: 1 });
  check("payOrder: already-paid installment is rejected (400)", alreadyPaid.status === 400);

  const payOrderRes = await callApi("POST", "/api/installments/payOrder", studentToken, { installmentPlanId, seq: 2 });
  check("payOrder: owning student gets a real Razorpay order (200)", payOrderRes.status === 200 && typeof payOrderRes.json.orderId === "string" && String(payOrderRes.json.orderId).startsWith("order_"));
  const razorpayOrderId = payOrderRes.json.orderId as string;

  console.log("\n=== /api/installments/verifyPayment cannot be spoofed by signature alone ===");
  // A technically-valid checkout signature for a paymentId that was never
  // actually captured by Razorpay — the route must independently confirm
  // with Razorpay's API and reject this, not trust the signature alone.
  const fakePaymentId = `pay_phase3_spoof_${runId}`;
  const fakeSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${razorpayOrderId}|${fakePaymentId}`)
    .digest("hex");
  const spoofAttempt = await callApi("POST", "/api/installments/verifyPayment", studentToken, {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: fakePaymentId,
    razorpay_signature: fakeSignature,
    installmentPlanId,
    seq: 2,
  });
  check("verifyPayment: a signature-valid but never-captured paymentId is rejected, not trusted", spoofAttempt.status !== 200);
  const planAfterSpoof = await InstallmentPlan.findById(installmentPlanId);
  check("DB: spoofed verifyPayment call did not mark installment 2 paid", planAfterSpoof?.installments?.[1]?.status === "pending");

  console.log("\n=== Webhook: order.paid for installment 2 — marks paid without re-unlocking/re-provisioning ===");
  const paymentId2 = `pay_phase3_verify_${runId}_2`;
  const orderPaid = await postWebhook({
    event: "order.paid",
    payload: {
      order: { entity: { id: razorpayOrderId, notes: { installmentPlanId, seq: "2" } } },
      payment: { entity: { id: paymentId2 } },
    },
  });
  check("webhook: order.paid -> 200, handled:true", orderPaid.status === 200 && orderPaid.json.handled === true);

  const planFinal = await InstallmentPlan.findById(installmentPlanId);
  const studentFinal = await User.findOne({ email: studentEmail });
  check("DB: installment 2 marked paid", planFinal?.installments?.[1]?.status === "paid" && planFinal?.installments?.[1]?.paymentId === paymentId2);
  check("DB: plan status is now 'completed' (all installments paid)", planFinal?.status === "completed");
  check("DB: installment-2 payment did not touch the already-provisioned student", studentFinal?.password === passwordHashAfterFirst);

  console.log("\n=== Cleanup: cancel the live Razorpay link + remove all test documents ===");
  if (linkId) {
    try {
      await razorpay.paymentLink.cancel(linkId);
      check("Cleanup: live Razorpay payment link cancelled", true);
    } catch (err) {
      // Already paid (per our own reconciliation) — Razorpay itself never saw
      // a real payment, so cancel may 400 here; that's expected, not a failure.
      console.log(`  (payment link cancel skipped/failed, expected once reconciled: ${err instanceof Error ? err.message : err})`);
    }
  }
  await InstallmentPlan.deleteOne({ _id: installmentPlanId });
  await Order.deleteOne({ _id: orderId });
  await User.deleteMany({ email: { $in: [studentEmail, otherStudent.email] } });
  await AdminUser.deleteOne({ _id: testExec._id });
  await Slot.deleteOne({ _id: testSlot._id });
  check("Cleanup: all ephemeral test documents removed", true);

  console.log(failures === 0 ? "\nAll Phase 3 sales checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
