import mongoose, { Schema } from "mongoose";

// Sales module (see salesimplementation.md Phase 1). One plan per sales
// enrollment (Order.installmentPlanId); installments are Razorpay Payment
// Links reconciled by the shared "mark installment paid" logic (Phase 3).
const installmentPlanSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    salesPersonId: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    totalAmount: { type: Number, required: true },
    initialAmount: { type: Number, required: true },
    installments: [
      {
        seq: { type: Number, required: true },
        amount: { type: Number, required: true },
        dueDate: { type: Date, required: true },
        status: { type: String, enum: ["pending", "paid", "overdue", "failed"], default: "pending" },
        paymentLinkId: { type: String, default: null },
        paymentLinkUrl: { type: String, default: null },
        paymentLinkExpiresAt: { type: Date, default: null },
        paymentId: { type: String, default: null },
        paidAt: { type: Date, default: null },
        // Set whenever an installment is marked paid — "razorpay" for a real
        // gateway confirmation (webhook/checkInstallmentStatus/verifyPayment),
        // "manual" when a sales person marks an offline payment (cash, UPI,
        // bank transfer, etc.) themselves. paymentReference is always shown to
        // the student alongside the method, so both sides can later relate an
        // installment back to the actual transaction — for "razorpay" it
        // mirrors paymentId; for "manual" it's whatever the sales person typed.
        paymentMethod: { type: String, enum: ["razorpay", "manual", null], default: null },
        paymentReference: { type: String, default: null },
        markedPaidBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
        reminderSentAt: { type: Date, default: null },
      },
    ],
    status: { type: String, enum: ["active", "completed", "defaulted", "cancelled"], default: "active" },
  },
  { timestamps: true }
);

export const InstallmentPlan =
  mongoose.models.InstallmentPlan || mongoose.model("InstallmentPlan", installmentPlanSchema);
