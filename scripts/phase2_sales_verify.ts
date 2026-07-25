import fs from "fs";
import path from "path";

// Same env-loading pattern as phase1_sales_verify.ts / check_meetings.ts.
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

const BASE_URL = process.env.PHASE2_VERIFY_BASE_URL || "http://localhost:3000";
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "ssb_session";

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

async function main() {
  const { connectDB } = await import("../src/server/db");
  const { signSessionToken } = await import("../src/server/auth");
  const { razorpay } = await import("../src/server/integrations/razorpay");
  const { AdminUser } = await import("../src/server/models/AdminUser");
  const { Slot } = await import("../src/server/models/Slot");
  const { Order } = await import("../src/server/models/Order");
  const { InstallmentPlan } = await import("../src/server/models/InstallmentPlan");
  const { SalesAuditLog } = await import("../src/server/models/SalesAuditLog");
  const { User } = await import("../src/server/models/User");

  await connectDB();

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  console.log("=== Setup: ephemeral test accounts + slot ===");
  const testHead = await AdminUser.create({
    name: "Phase2 Verify Head",
    email: `phase2-verify-head-${runId}@test.local`,
    password: "not-used-jwt-minted-directly",
    role: "admin",
    permissions: ["sales"],
    salesRole: "head",
  });
  const testExec = await AdminUser.create({
    name: "Phase2 Verify Exec",
    email: `phase2-verify-exec-${runId}@test.local`,
    password: "not-used-jwt-minted-directly",
    role: "admin",
    permissions: ["sales"],
    salesRole: "executive",
    reportsTo: testHead._id,
  });
  const testOtherExec = await AdminUser.create({
    name: "Phase2 Verify Other Exec",
    email: `phase2-verify-other-exec-${runId}@test.local`,
    password: "not-used-jwt-minted-directly",
    role: "admin",
    permissions: ["sales"],
    salesRole: "executive",
  });
  const testNonSalesAdmin = await AdminUser.create({
    name: "Phase2 Verify Non-Sales Admin",
    email: `phase2-verify-nonsales-${runId}@test.local`,
    password: "not-used-jwt-minted-directly",
    role: "admin",
    permissions: ["blogs"],
  });
  const testSlot = await Slot.create({
    title: "Phase2 Verify Batch",
    startTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    maxStudents: 50,
    price: 5000, // finalPriceInclGST = 5900
    isFullCourse: false,
  });
  check("Setup: ephemeral accounts + slot created", true);

  const execToken = signSessionToken({ id: String(testExec._id), role: "admin" });
  const headToken = signSessionToken({ id: String(testHead._id), role: "admin" });
  const otherExecToken = signSessionToken({ id: String(testOtherExec._id), role: "admin" });
  const nonSalesToken = signSessionToken({ id: String(testNonSalesAdmin._id), role: "admin" });

  const studentEmail = `phase2-verify-student-${runId}@test.local`;
  const finalDueDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  console.log("\n=== suggestSchedule ===");
  const suggest = await callApi("POST", "/api/sales/suggestSchedule", execToken, {
    slotId: String(testSlot._id),
    initialAmount: 3500,
    numberOfInstallments: 2,
    finalDueDate,
  });
  check("suggestSchedule: 200", suggest.status === 200);
  check("suggestSchedule: finalPriceInclGST is 5900 (5000 * 1.18)", suggest.json.finalPriceInclGST === 5900);
  const suggestedInstallments = (suggest.json.installments as { seq: number; amount: number; dueDate: string }[]) || [];
  check("suggestSchedule: 2 installments returned", suggestedInstallments.length === 2);
  const suggestedSum = Math.round(suggestedInstallments.reduce((s, i) => s + i.amount, 0) * 100) / 100;
  check("suggestSchedule: installments sum to remaining (2400)", suggestedSum === 2400);
  check(
    "suggestSchedule: last installment date matches finalDueDate",
    suggestedInstallments.length > 0 &&
      new Date(suggestedInstallments[suggestedInstallments.length - 1].dueDate).getTime() === new Date(finalDueDate).getTime()
  );

  console.log("\n=== enrollStudent: rejection cases ===");
  const belowMin = await callApi("POST", "/api/sales/enrollStudent", execToken, {
    studentName: "Should Not Enroll",
    studentEmail: "should-not-enroll@test.local",
    slotId: String(testSlot._id),
    initialAmount: 1000, // below ₹3,000 floor
    installments: [],
  });
  check("enrollStudent: sub-₹3,000 initialAmount rejected (400)", belowMin.status === 400);

  const aboveMax = await callApi("POST", "/api/sales/enrollStudent", execToken, {
    studentName: "Should Not Enroll",
    studentEmail: "should-not-enroll@test.local",
    slotId: String(testSlot._id),
    initialAmount: 9999, // above 5900 course price
    installments: [],
  });
  check("enrollStudent: over-course-price initialAmount rejected (400)", aboveMax.status === 400);

  const badMismatch = await callApi("POST", "/api/sales/enrollStudent", execToken, {
    studentName: "Should Not Enroll",
    studentEmail: "should-not-enroll@test.local",
    slotId: String(testSlot._id),
    initialAmount: 3500,
    installments: [{ amount: 1, dueDate: finalDueDate }], // doesn't sum to remaining
  });
  check("enrollStudent: mis-summed installments rejected (400)", badMismatch.status === 400);

  const nonSalesAttempt = await callApi("POST", "/api/sales/enrollStudent", nonSalesToken, {
    studentName: "Should Not Enroll",
    studentEmail: "should-not-enroll@test.local",
    slotId: String(testSlot._id),
    initialAmount: 3500,
    installments: suggestedInstallments,
  });
  check("enrollStudent: non-sales admin account rejected (403)", nonSalesAttempt.status === 403);

  console.log("\n=== enrollStudent: real enrollment (creates a live, unpaid Razorpay Payment Link) ===");
  const enroll = await callApi("POST", "/api/sales/enrollStudent", execToken, {
    studentName: "Phase2 Verify Student",
    studentEmail,
    slotId: String(testSlot._id),
    initialAmount: 3500,
    installments: suggestedInstallments,
  });
  check("enrollStudent: 200", enroll.status === 200);
  check("enrollStudent: returns a real Razorpay payment link URL", typeof enroll.json.paymentLink === "string" && String(enroll.json.paymentLink).startsWith("http"));
  const installmentPlanId = enroll.json.installmentPlanId as string;
  const orderId = enroll.json.orderId as string;

  const dbOrder = await Order.findById(orderId);
  const dbPlan = await InstallmentPlan.findById(installmentPlanId);
  check("DB: Order created with bookingMethod 'sales' and status 'pending'", dbOrder?.bookingMethod === "sales" && dbOrder?.status === "pending");
  check("DB: Order.salesPersonId is the enrolling executive", String(dbOrder?.salesPersonId) === String(testExec._id));
  check("DB: InstallmentPlan has 3 installments (initial + 2 suggested)", dbPlan?.installments?.length === 3);
  check("DB: InstallmentPlan.installments[0] (initial) has a Razorpay payment link stored", !!dbPlan?.installments?.[0]?.paymentLinkId && !!dbPlan?.installments?.[0]?.paymentLinkUrl);
  const auditEntry = await SalesAuditLog.findOne({ installmentPlanId: dbPlan?._id, action: "LINK_GENERATED" });
  check("DB: SalesAuditLog entry written for LINK_GENERATED", !!auditEntry);

  console.log("\n=== checkInstallmentStatus: scoping + live status check ===");
  const statusAsOwner = await callApi("GET", `/api/sales/checkInstallmentStatus?installmentPlanId=${installmentPlanId}&seq=1`, execToken);
  check("checkInstallmentStatus: owning executive sees status (200)", statusAsOwner.status === 200);
  check("checkInstallmentStatus: unpaid link reports non-paid status", statusAsOwner.json.status !== "paid");

  const statusAsHead = await callApi("GET", `/api/sales/checkInstallmentStatus?installmentPlanId=${installmentPlanId}&seq=1`, headToken);
  check("checkInstallmentStatus: exec's head can see it (200)", statusAsHead.status === 200);

  const statusAsOtherExec = await callApi("GET", `/api/sales/checkInstallmentStatus?installmentPlanId=${installmentPlanId}&seq=1`, otherExecToken);
  check("checkInstallmentStatus: unrelated executive rejected (403)", statusAsOtherExec.status === 403);

  console.log("\n=== shareLink: scoping ===");
  const shareAsOwner = await callApi("POST", "/api/sales/shareLink", execToken, { installmentPlanId, seq: 1, channels: ["email"] });
  check("shareLink: owning executive can share (200)", shareAsOwner.status === 200);

  const shareAsOtherExec = await callApi("POST", "/api/sales/shareLink", otherExecToken, { installmentPlanId, seq: 1, channels: ["email"] });
  check("shareLink: unrelated executive rejected (403)", shareAsOtherExec.status === 403);

  console.log("\n=== Cleanup: cancel the live Razorpay link + remove all test documents ===");
  const linkId = dbPlan?.installments?.[0]?.paymentLinkId;
  if (linkId) {
    try {
      await razorpay.paymentLink.cancel(linkId);
      check("Cleanup: live Razorpay payment link cancelled", true);
    } catch (err) {
      check(`Cleanup: live Razorpay payment link cancelled (${err instanceof Error ? err.message : err})`, false);
    }
  }
  await InstallmentPlan.deleteOne({ _id: installmentPlanId });
  await Order.deleteOne({ _id: orderId });
  await SalesAuditLog.deleteMany({ installmentPlanId });
  await User.deleteOne({ email: studentEmail });
  await AdminUser.deleteMany({ _id: { $in: [testExec._id, testHead._id, testOtherExec._id, testNonSalesAdmin._id] } });
  await Slot.deleteOne({ _id: testSlot._id });
  check("Cleanup: all ephemeral test documents removed", true);

  console.log(failures === 0 ? "\nAll Phase 2 sales checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
