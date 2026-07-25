import fs from "fs";
import path from "path";

// Verifies the enrollStudent/suggestSchedule module-selection + coupon
// support added on top of the original 6-phase salesimplementation.md plan
// (user request: "show course not batches" -> mirror the existing admin
// "manual booking" flow's module checkboxes, and support coupons too).
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

const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:3000";
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
    headers: { "Content-Type": "application/json", ...(token ? { Cookie: cookieFor(token) } : {}) },
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
  const { markInstallmentPaid } = await import("../src/server/sales/markInstallmentPaid");
  const { AdminUser } = await import("../src/server/models/AdminUser");
  const { Slot } = await import("../src/server/models/Slot");
  const { Order } = await import("../src/server/models/Order");
  const { InstallmentPlan, SalesAuditLog } = await import("../src/server/models");
  const { User } = await import("../src/server/models/User");
  const { Course } = await import("../src/server/models/Course");
  const { Coupon } = await import("../src/server/models/Coupon");

  await connectDB();
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const psychPrice = (await Course.findOne({ courseId: "psych" }))?.price ?? 3499;
  const fullCoursePrice = (await Course.findOne({ courseId: "full_course" }))?.price ?? 12499;

  console.log("=== Setup: exec, a full-course batch, a module batch, a 10%-off coupon ===");
  const exec = await AdminUser.create({
    name: "Modules Verify Exec",
    email: `modules-verify-exec-${runId}@test.local`,
    password: "not-used",
    role: "admin",
    permissions: ["sales"],
    salesRole: "executive",
  });
  const fullCourseSlot = await Slot.create({
    title: "Modules Verify Full Course Batch",
    batchNo: `MV-${runId}`,
    startTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    maxStudents: 50,
    price: fullCoursePrice,
    isFullCourse: true,
  });
  const moduleSlot = await Slot.create({
    title: "Modules Verify Module Batch",
    batchNo: `MVM-${runId}`,
    startTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    maxStudents: 50,
    price: 5000,
    isFullCourse: false,
  });
  const coupon = await Coupon.create({
    code: `MVERIFY${runId.slice(-6)}`.toUpperCase(),
    discountType: "percent",
    discountValue: 10,
    isActive: true,
  });
  check("Setup: exec + 2 slots + 1 coupon created", true);

  const execToken = signSessionToken({ id: String(exec._id), role: "admin" });
  const finalDueDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const studentEmail = `modules-verify-student-${runId}@test.local`;

  console.log("\n=== suggestSchedule: module batch ignores selectedModules, rejects coupons ===");
  const moduleBatchPreview = await callApi("POST", "/api/sales/suggestSchedule", execToken, {
    slotId: String(moduleSlot._id),
    studentEmail,
    initialAmount: 3000,
    numberOfInstallments: 1,
    finalDueDate,
    selectedModules: ["psych"], // should be ignored — module batch always charges its own price
  });
  const expectedModuleBatchTotal = Math.round(5000 * 1.18 * 100) / 100;
  check(
    "suggestSchedule: module batch prices at its own fixed price regardless of selectedModules",
    moduleBatchPreview.status === 200 && moduleBatchPreview.json.finalPriceInclGST === expectedModuleBatchTotal
  );

  const moduleBatchCoupon = await callApi("POST", "/api/sales/suggestSchedule", execToken, {
    slotId: String(moduleSlot._id),
    studentEmail,
    initialAmount: 3000,
    numberOfInstallments: 1,
    finalDueDate,
    couponCode: coupon.code,
  });
  check("suggestSchedule: coupon rejected on a non-full-course batch (400)", moduleBatchCoupon.status === 400);

  console.log("\n=== suggestSchedule: full-course batch module pricing ===");
  const noModulesPreview = await callApi("POST", "/api/sales/suggestSchedule", execToken, {
    slotId: String(fullCourseSlot._id),
    studentEmail,
    initialAmount: 3000,
    numberOfInstallments: 1,
    finalDueDate,
  });
  const expectedFullCourseTotal = Math.round(fullCoursePrice * 1.18 * 100) / 100;
  check(
    "suggestSchedule: no modules selected -> defaults to full_course price",
    noModulesPreview.status === 200 && noModulesPreview.json.finalPriceInclGST === expectedFullCourseTotal
  );

  const psychOnlyPreview = await callApi("POST", "/api/sales/suggestSchedule", execToken, {
    slotId: String(fullCourseSlot._id),
    studentEmail,
    initialAmount: 3000,
    numberOfInstallments: 1,
    finalDueDate,
    selectedModules: ["psych"],
  });
  const expectedPsychTotal = Math.round(psychPrice * 1.18 * 100) / 100;
  check(
    "suggestSchedule: selecting just psych prices at the psych module rate, not full course",
    psychOnlyPreview.status === 200 && psychOnlyPreview.json.finalPriceInclGST === expectedPsychTotal
  );

  const allFourPreview = await callApi("POST", "/api/sales/suggestSchedule", execToken, {
    slotId: String(fullCourseSlot._id),
    studentEmail,
    initialAmount: 3000,
    numberOfInstallments: 1,
    finalDueDate,
    selectedModules: ["ssb_ppdt", "psych", "interview", "group_testing"],
  });
  check(
    "suggestSchedule: all 4 individual modules selected = same as full_course price",
    allFourPreview.status === 200 && allFourPreview.json.finalPriceInclGST === expectedFullCourseTotal
  );

  console.log("\n=== suggestSchedule: coupon on a full-course batch ===");
  const invalidCoupon = await callApi("POST", "/api/sales/suggestSchedule", execToken, {
    slotId: String(fullCourseSlot._id),
    studentEmail,
    initialAmount: 3000,
    numberOfInstallments: 1,
    finalDueDate,
    couponCode: "NOT-A-REAL-COUPON",
  });
  check("suggestSchedule: invalid coupon code rejected (400)", invalidCoupon.status === 400);

  const couponPreview = await callApi("POST", "/api/sales/suggestSchedule", execToken, {
    slotId: String(fullCourseSlot._id),
    studentEmail,
    initialAmount: 3000,
    numberOfInstallments: 1,
    finalDueDate,
    couponCode: coupon.code,
  });
  const expectedDiscount = Math.round(fullCoursePrice * 0.1 * 100) / 100;
  const expectedDiscountedTotal = Math.round((fullCoursePrice - expectedDiscount) * 1.18 * 100) / 100;
  check(
    "suggestSchedule: 10% coupon applied correctly (discount + GST-on-net total)",
    couponPreview.status === 200 && couponPreview.json.discount === expectedDiscount && couponPreview.json.finalPriceInclGST === expectedDiscountedTotal
  );
  check("suggestSchedule: response echoes the applied coupon code", couponPreview.json.couponCode === coupon.code);

  console.log("\n=== enrollStudent: real enrollment with a module selection + coupon ===");
  const enroll = await callApi("POST", "/api/sales/enrollStudent", execToken, {
    studentName: "Modules Verify Student",
    studentEmail,
    slotId: String(fullCourseSlot._id),
    initialAmount: expectedDiscountedTotal, // paid in full up front, so installments: [] is valid (remaining 0)
    installments: [],
    selectedModules: ["full_course"],
    couponCode: coupon.code,
  });
  check("enrollStudent: 200 with a coupon + module selection", enroll.status === 200);
  const orderId = enroll.json.orderId as string;
  const installmentPlanId = enroll.json.installmentPlanId as string;
  check("enrollStudent: response reflects the discounted total", enroll.json.finalPriceInclGST === expectedDiscountedTotal);

  const dbOrder = await Order.findById(orderId);
  check("DB: Order.couponCode/discount/selectedModules all persisted correctly", dbOrder?.couponCode === coupon.code && dbOrder?.discount === expectedDiscount && JSON.stringify(dbOrder?.selectedModules) === JSON.stringify(["full_course"]));

  console.log("\n=== Coupon is marked used only once Razorpay confirms the first installment (not at enrollment) ===");
  const couponBeforePayment = await Coupon.findById(coupon._id);
  check("DB: coupon not yet marked used right after enrollStudent (payment not confirmed yet)", (couponBeforePayment?.usedBy || []).length === 0);

  await markInstallmentPaid({ installmentPlanId, seq: 1, paymentId: `test_confirm_${runId}` });
  const couponAfterPayment = await Coupon.findById(coupon._id);
  const student = await User.findOne({ email: studentEmail });
  check(
    "DB: coupon marked used for this student once the first installment is confirmed paid",
    (couponAfterPayment?.usedBy || []).some((u: { userId: { toString(): string } }) => u.userId.toString() === String(student?._id))
  );

  console.log("\n=== A second enrollment reusing the same coupon for the same student is rejected ===");
  const reuseAttempt = await callApi("POST", "/api/sales/suggestSchedule", execToken, {
    slotId: String(fullCourseSlot._id),
    studentEmail,
    initialAmount: 3000,
    numberOfInstallments: 1,
    finalDueDate,
    couponCode: coupon.code,
  });
  check("suggestSchedule: coupon already used by this student is rejected (400)", reuseAttempt.status === 400);

  console.log("\n=== Cleanup ===");
  const dbPlan = await InstallmentPlan.findById(installmentPlanId);
  const linkId = dbPlan?.installments?.[0]?.paymentLinkId;
  if (linkId) {
    try {
      await razorpay.paymentLink.cancel(linkId);
      check("Cleanup: live Razorpay payment link cancelled", true);
    } catch (err) {
      console.log(`  (payment link cancel skipped, expected once reconciled: ${err instanceof Error ? err.message : err})`);
    }
  }
  await InstallmentPlan.deleteOne({ _id: installmentPlanId });
  await Order.deleteOne({ _id: orderId });
  await SalesAuditLog.deleteMany({ installmentPlanId });
  await User.deleteOne({ email: studentEmail });
  await AdminUser.deleteOne({ _id: exec._id });
  await Slot.deleteMany({ _id: { $in: [fullCourseSlot._id, moduleSlot._id] } });
  await Coupon.deleteOne({ _id: coupon._id });
  check("Cleanup: all ephemeral test documents removed", true);

  console.log(failures === 0 ? "\nAll module/coupon checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
