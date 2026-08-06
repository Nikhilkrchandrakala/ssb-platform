import crypto from "node:crypto";
import { connectDB } from "@/server/db";
import { InstallmentPlan, Order, Slot, User, Coupon } from "@/server/models";
import { sendCredentialsEmail, sendSalesNotificationEmail } from "@/server/integrations/msg91";

interface InstallmentSubdoc {
  seq: number;
  amount: number;
  status: string;
  paymentId: string | null;
  paidAt: Date | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  markedPaidBy: unknown;
}

/**
 * The one place an installment is ever marked paid + (if it's the plan's
 * first installment) an Order unlocked and a student provisioned. Shared by
 * Phase 2's `checkInstallmentStatus` stopgap and Phase 3's webhook handler
 * (salesimplementation.md) so the two never duplicate this logic. Only ever
 * called after Razorpay itself has confirmed the payment — never from a
 * client-side redirect alone.
 *
 * Idempotent: re-calling with the same paymentId (a re-delivered webhook, or
 * a manual check after the webhook already landed) is a safe no-op.
 */
export async function markInstallmentPaid(opts: {
  installmentPlanId: string;
  seq: number;
  paymentId: string;
  /** Defaults to "razorpay" — every pre-existing caller is a real gateway confirmation. */
  method?: "razorpay" | "manual";
  /** Defaults to paymentId when omitted (razorpay's own id doubles as its reference). */
  reference?: string;
  /** AdminUser id — only meaningful for method: "manual". */
  markedPaidBy?: string;
}): Promise<{ alreadyProcessed: boolean; studentCredentials?: { email: string; password: string; emailDelivered: boolean } }> {
  await connectDB();

  const plan = await InstallmentPlan.findById(opts.installmentPlanId);
  if (!plan) throw new Error("InstallmentPlan not found");

  const installment = (plan.installments as unknown as InstallmentSubdoc[]).find((i) => i.seq === opts.seq);
  if (!installment) throw new Error(`Installment seq ${opts.seq} not found on plan ${opts.installmentPlanId}`);

  if (installment.status === "paid" && installment.paymentId === opts.paymentId) {
    return { alreadyProcessed: true };
  }

  installment.status = "paid";
  installment.paymentId = opts.paymentId;
  installment.paidAt = new Date();
  installment.paymentMethod = opts.method || "razorpay";
  installment.paymentReference = opts.reference || opts.paymentId;
  if (opts.markedPaidBy) installment.markedPaidBy = opts.markedPaidBy;

  const allPaid = (plan.installments as unknown as InstallmentSubdoc[]).every((i) => i.status === "paid");
  if (allPaid) plan.status = "completed";
  await plan.save();

  if (opts.seq !== 1) {
    return { alreadyProcessed: false };
  }

  // First installment paid: unlock the order and provision the student — the
  // same "mark fully booked" logic verifyPayment/manualBookSlot already do.
  const order = await Order.findById(plan.orderId);
  if (!order) throw new Error(`Order ${plan.orderId} not found`);
  if (order.status === "paid") {
    // Already provisioned by a prior call (e.g. a race between the webhook
    // and the checkInstallmentStatus fallback both confirming with Razorpay).
    return { alreadyProcessed: true };
  }
  order.status = "paid";
  await order.save();

  // Mirrors verifyPayment's coupon-usage bookkeeping — a sales enrollment's
  // coupon (if any) is only marked used once Razorpay actually confirms the
  // first payment, not at enrollment time, so an abandoned/unpaid link never
  // burns the student's one use of it.
  if (order.couponCode) {
    await Coupon.updateOne({ code: order.couponCode }, { $push: { usedBy: { userId: order.userId, usedAt: new Date() } } });
  }

  const student = await User.findById(plan.studentId);
  if (!student) throw new Error(`Student ${plan.studentId} not found`);

  const slot = await Slot.findById(order.slotId);
  if (slot && !slot.bookedStudents.some((id: { toString(): string }) => id.toString() === String(student._id))) {
    slot.bookedStudents.push(student._id);
    await slot.save();
  }

  student.role = "student";
  if (slot?.batchNo) student.batch = slot.batchNo.trim();
  const bookedModules: string[] = order.selectedModules || [];
  if (bookedModules.length === 1 && bookedModules[0] !== "full_course") {
    student.clinicalStage = bookedModules[0];
  } else {
    // Covers full_course, multi-module, and the empty-array (module-batch)
    // case alike — mirrors verifyPayment/manualBookSlot's exact branching.
    student.clinicalStage = "full_course";
  }

  // Credentials, per Open Decision #3: cryptographically random, never derived
  // from name/phone/DOB, never logged. `pre("save")` hashes it via bcrypt.
  const plainPassword = crypto.randomBytes(9).toString("base64url");
  student.password = plainPassword;
  await student.save();

  const mail = await sendCredentialsEmail({
    to: student.email,
    name: student.name,
    username: student.email,
    password: plainPassword,
  });

  // Notify sales team
  await sendSalesNotificationEmail({
    studentName: student.name,
    studentEmail: student.email,
    courseName: slot?.title || "Custom Batch",
    amountPaid: installment.amount,
    bookingMethod: order.bookingMethod || "sales",
    orderId: order._id.toString(),
  }).catch((err) => console.error("[msg91] sendSalesNotificationEmail failed", err));

  // Surfaced to the caller (checkInstallmentStatus/webhook) so the Sales
  // dashboard can show credentials on screen as a fallback when the email
  // above fails to deliver — see resetStudentCredentials for the on-demand
  // equivalent once this one-time reveal has been missed.
  return {
    alreadyProcessed: false,
    studentCredentials: { email: student.email, password: plainPassword, emailDelivered: mail.delivered },
  };
}
