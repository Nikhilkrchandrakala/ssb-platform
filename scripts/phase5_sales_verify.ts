import fs from "fs";
import path from "path";

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

const BASE_URL = process.env.PHASE5_VERIFY_BASE_URL || "http://localhost:3000";
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "ssb_session";
const CRON_SECRET = process.env.CRON_SECRET || "";

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

async function callCron(urlPath: string, secret: string | null) {
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method: "POST",
    headers: secret ? { "x-cron-secret": secret } : {},
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
  if (!CRON_SECRET) {
    console.error("CRON_SECRET is not set — cannot call the cron routes.");
    process.exit(1);
  }

  const { connectDB } = await import("../src/server/db");
  const { signSessionToken } = await import("../src/server/auth");
  const { AdminUser } = await import("../src/server/models/AdminUser");
  const { Slot } = await import("../src/server/models/Slot");
  const { Order } = await import("../src/server/models/Order");
  const { InstallmentPlan } = await import("../src/server/models/InstallmentPlan");
  const { SalesAuditLog } = await import("../src/server/models/SalesAuditLog");
  const { User } = await import("../src/server/models/User");

  await connectDB();
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  console.log("=== Setup: sales exec, an unrelated exec, a slot, and 3 students/orders/plans ===");
  const exec = await AdminUser.create({
    name: "Phase5 Verify Exec",
    email: `phase5-verify-exec-${runId}@test.local`,
    password: "not-used",
    role: "admin",
    permissions: ["sales"],
    salesRole: "executive",
  });
  const otherExec = await AdminUser.create({
    name: "Phase5 Verify Other Exec",
    email: `phase5-verify-other-exec-${runId}@test.local`,
    password: "not-used",
    role: "admin",
    permissions: ["sales"],
    salesRole: "executive",
  });
  const slot = await Slot.create({
    title: "Phase5 Verify Batch",
    batchNo: `P5-${runId}`,
    startTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    maxStudents: 50,
    price: 5000,
    isFullCourse: true,
  });

  // --- Student A: one installment due in exactly 3 days (reminder target) ---
  const studentA = await User.create({ name: "Phase5 Student A", email: `phase5-verify-student-a-${runId}@test.local`, role: "student", isManuallyCreated: true });
  const orderA = await Order.create({ userId: studentA._id, slotId: slot._id, price: 5900, status: "paid", bookingMethod: "sales", salesPersonId: exec._id });
  const due3Days = new Date();
  due3Days.setDate(due3Days.getDate() + 3);
  const planA = await InstallmentPlan.create({
    orderId: orderA._id,
    studentId: studentA._id,
    salesPersonId: exec._id,
    totalAmount: 5900,
    initialAmount: 3000,
    status: "active",
    installments: [
      { seq: 1, amount: 3000, dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), status: "paid", paymentId: "seed_paid" },
      { seq: 2, amount: 2900, dueDate: due3Days, status: "pending" },
    ],
  });
  orderA.installmentPlanId = planA._id;
  await orderA.save();

  // --- Student B: last installment overdue and unpaid (revocation target) ---
  const studentB = await User.create({ name: "Phase5 Student B", email: `phase5-verify-student-b-${runId}@test.local`, role: "student", isManuallyCreated: true });
  const orderB = await Order.create({ userId: studentB._id, slotId: slot._id, price: 5900, status: "paid", bookingMethod: "sales", salesPersonId: exec._id, accessRevoked: false });
  const planB = await InstallmentPlan.create({
    orderId: orderB._id,
    studentId: studentB._id,
    salesPersonId: exec._id,
    totalAmount: 5900,
    initialAmount: 3000,
    status: "active",
    installments: [
      { seq: 1, amount: 3000, dueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), status: "paid", paymentId: "seed_paid" },
      { seq: 2, amount: 2900, dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), status: "pending" }, // overdue
    ],
  });
  orderB.installmentPlanId = planB._id;
  await orderB.save();

  // --- Student C: not overdue yet (control — must NOT be revoked) ---
  const studentC = await User.create({ name: "Phase5 Student C", email: `phase5-verify-student-c-${runId}@test.local`, role: "student", isManuallyCreated: true });
  const orderC = await Order.create({ userId: studentC._id, slotId: slot._id, price: 5900, status: "paid", bookingMethod: "sales", salesPersonId: exec._id });
  const planC = await InstallmentPlan.create({
    orderId: orderC._id,
    studentId: studentC._id,
    salesPersonId: exec._id,
    totalAmount: 5900,
    initialAmount: 3000,
    status: "active",
    installments: [
      { seq: 1, amount: 3000, dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), status: "paid", paymentId: "seed_paid" },
      { seq: 2, amount: 2900, dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), status: "pending" }, // not due yet
    ],
  });
  orderC.installmentPlanId = planC._id;
  await orderC.save();

  check("Setup: ephemeral accounts + slot + 3 orders/plans created", true);

  const execToken = signSessionToken({ id: String(exec._id), role: "admin" });
  const otherExecToken = signSessionToken({ id: String(otherExec._id), role: "admin" });
  const studentBToken = signSessionToken({ id: String(studentB._id), role: "student" });

  console.log("\n=== POST /api/cron/sendInstallmentReminders ===");
  const noAuth = await callCron("/api/cron/sendInstallmentReminders", null);
  check("sendInstallmentReminders: no secret -> 401", noAuth.status === 401);
  const badAuth = await callCron("/api/cron/sendInstallmentReminders", "wrong-secret");
  check("sendInstallmentReminders: wrong secret -> 401", badAuth.status === 401);

  const remindersRun1 = await callCron("/api/cron/sendInstallmentReminders", CRON_SECRET);
  check("sendInstallmentReminders: valid secret -> 200", remindersRun1.status === 200);
  check("sendInstallmentReminders: reminded exactly student A's installment", (remindersRun1.json.remindersSent as number) >= 1);

  const planAAfterRun1 = await InstallmentPlan.findById(planA._id);
  check("DB: planA's installment 2 has reminderSentAt set", !!planAAfterRun1?.installments?.[1]?.reminderSentAt);
  const planBAfterRun1 = await InstallmentPlan.findById(planB._id);
  const planCAfterRun1 = await InstallmentPlan.findById(planC._id);
  check("DB: planB (overdue, not 3-days-out) and planC (15 days out) were not reminded", !planBAfterRun1?.installments?.[1]?.reminderSentAt && !planCAfterRun1?.installments?.[1]?.reminderSentAt);

  const reminderLogCountAfterRun1 = await SalesAuditLog.countDocuments({ installmentPlanId: planA._id, action: "REMINDER_SENT" });
  check("DB: exactly one REMINDER_SENT audit entry for planA", reminderLogCountAfterRun1 === 1);

  const remindersRun2 = await callCron("/api/cron/sendInstallmentReminders", CRON_SECRET);
  check("sendInstallmentReminders: second same-day run -> 200", remindersRun2.status === 200);
  const reminderLogCountAfterRun2 = await SalesAuditLog.countDocuments({ installmentPlanId: planA._id, action: "REMINDER_SENT" });
  check("DB: second run did NOT double-send — still exactly one REMINDER_SENT entry", reminderLogCountAfterRun2 === 1);

  console.log("\n=== POST /api/cron/revokeOverdueAccess ===");
  const revokeNoAuth = await callCron("/api/cron/revokeOverdueAccess", null);
  check("revokeOverdueAccess: no secret -> 401", revokeNoAuth.status === 401);

  const purchaseBefore = await callApi("GET", "/api/checkPurchase/full_course", studentBToken);
  check("checkPurchase: student B has access before revocation (purchased: true)", purchaseBefore.json.purchased === true);

  const revokeRun = await callCron("/api/cron/revokeOverdueAccess", CRON_SECRET);
  check("revokeOverdueAccess: valid secret -> 200", revokeRun.status === 200);
  check("revokeOverdueAccess: revoked at least planB", (revokeRun.json.revoked as number) >= 1);

  const planBAfterRevoke = await InstallmentPlan.findById(planB._id);
  const orderBAfterRevoke = await Order.findById(orderB._id);
  check("DB: planB status is now 'defaulted'", planBAfterRevoke?.status === "defaulted");
  check("DB: orderB.accessRevoked is now true", orderBAfterRevoke?.accessRevoked === true);

  const planCAfterRevoke = await InstallmentPlan.findById(planC._id);
  check("DB: planC (not overdue) untouched — still 'active'", planCAfterRevoke?.status === "active");

  const revokeAuditEntry = await SalesAuditLog.findOne({ installmentPlanId: planB._id, action: "PLAN_EDITED", "meta.automatic": true });
  check("DB: an automatic PLAN_EDITED audit entry was written for planB's revocation", !!revokeAuditEntry);

  const purchaseAfter = await callApi("GET", "/api/checkPurchase/full_course", studentBToken);
  check("checkPurchase: student B's access is now revoked (purchased: false)", purchaseAfter.json.purchased === false);

  console.log("\n=== POST /api/sales/resolveDefaultedPlan ===");
  const wrongOwnerAttempt = await callApi("POST", "/api/sales/resolveDefaultedPlan", otherExecToken, {
    installmentPlanId: String(planB._id),
    action: "restoreAccess",
  });
  check("resolveDefaultedPlan: a different sales person is rejected (403)", wrongOwnerAttempt.status === 403);

  const adjustPaidRejected = await callApi("POST", "/api/sales/resolveDefaultedPlan", execToken, {
    installmentPlanId: String(planB._id),
    action: "adjustInstallments",
    installments: [{ seq: 1, amount: 100 }],
  });
  check("resolveDefaultedPlan: adjusting an already-paid installment is rejected (400)", adjustPaidRejected.status === 400);

  const adjustOk = await callApi("POST", "/api/sales/resolveDefaultedPlan", execToken, {
    installmentPlanId: String(planB._id),
    action: "adjustInstallments",
    reason: "Student requested a lower final amount",
    installments: [{ seq: 2, amount: 2000 }],
  });
  check("resolveDefaultedPlan: owning exec adjusts installment 2's amount (200)", adjustOk.status === 200);
  const planBAfterAdjust = await InstallmentPlan.findById(planB._id);
  check("DB: installment 2's amount is now 2000", planBAfterAdjust?.installments?.[1]?.amount === 2000);

  const restoreOk = await callApi("POST", "/api/sales/resolveDefaultedPlan", execToken, {
    installmentPlanId: String(planB._id),
    action: "restoreAccess",
    reason: "Student paid via bank transfer, restoring access ahead of marking it paid",
  });
  check("resolveDefaultedPlan: owning exec restores access (200)", restoreOk.status === 200);
  const orderBAfterRestore = await Order.findById(orderB._id);
  const planBAfterRestore = await InstallmentPlan.findById(planB._id);
  check("DB: orderB.accessRevoked cleared", orderBAfterRestore?.accessRevoked === false);
  check("DB: planB status un-defaulted back to 'active' (installment 2 still unpaid)", planBAfterRestore?.status === "active");

  const purchaseAfterRestore = await callApi("GET", "/api/checkPurchase/full_course", studentBToken);
  check("checkPurchase: student B's access is back (purchased: true)", purchaseAfterRestore.json.purchased === true);

  const markPaidOk = await callApi("POST", "/api/sales/resolveDefaultedPlan", execToken, {
    installmentPlanId: String(planB._id),
    action: "markPaidManual",
    seq: 2,
    reason: "Confirmed bank transfer receipt",
  });
  check("resolveDefaultedPlan: owning exec marks installment 2 paid manually (200)", markPaidOk.status === 200);
  const planBFinal = await InstallmentPlan.findById(planB._id);
  check("DB: installment 2 is now paid with a manual: paymentId", planBFinal?.installments?.[1]?.status === "paid" && String(planBFinal?.installments?.[1]?.paymentId).startsWith("manual:"));
  check("DB: plan status is now 'completed' (all installments paid)", planBFinal?.status === "completed");

  const manualAuditEntry = await SalesAuditLog.findOne({ installmentPlanId: planB._id, action: "INSTALLMENT_MARKED_PAID_MANUAL" });
  check("DB: an INSTALLMENT_MARKED_PAID_MANUAL audit entry was written", !!manualAuditEntry);

  const unknownAction = await callApi("POST", "/api/sales/resolveDefaultedPlan", execToken, {
    installmentPlanId: String(planB._id),
    action: "doSomethingElse",
  });
  check("resolveDefaultedPlan: an unknown action is rejected (400)", unknownAction.status === 400);

  console.log("\n=== Cleanup: remove every ephemeral test document ===");
  await InstallmentPlan.deleteMany({ _id: { $in: [planA._id, planB._id, planC._id] } });
  await Order.deleteMany({ _id: { $in: [orderA._id, orderB._id, orderC._id] } });
  await SalesAuditLog.deleteMany({ installmentPlanId: { $in: [planA._id, planB._id, planC._id] } });
  await User.deleteMany({ _id: { $in: [studentA._id, studentB._id, studentC._id] } });
  await AdminUser.deleteMany({ _id: { $in: [exec._id, otherExec._id] } });
  await Slot.deleteOne({ _id: slot._id });
  check("Cleanup: all ephemeral test documents removed", true);

  console.log(failures === 0 ? "\nAll Phase 5 sales checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
