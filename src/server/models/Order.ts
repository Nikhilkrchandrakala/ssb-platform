import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Snapshot of the buyer's identity at purchase time. Order intentionally
    // never denormalized this before, relying entirely on live `.populate()`
    // of `userId` — so deleting that User (a real, supported admin action,
    // see DELETE /api/admin/students/[id]) silently orphaned every sales
    // record they ever paid for: populate returns null and the buyer's name
    // vanishes from Sales/Orders screens with no way to recover it. These
    // fields are the fallback so a sale stays attributable even after the
    // account behind it is gone.
    buyerName: { type: String, default: null },
    buyerEmail: { type: String, default: null },
    slotId: { type: Schema.Types.ObjectId, ref: "Slot", required: true },
    price: { type: Number, required: true },
    originalAmount: { type: Number },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    referralCode: { type: String, default: null },
    orderId: { type: String },
    paymentId: { type: String },
    signature: { type: String },
    status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    selectedModules: { type: [String], default: [] },
    bookingMethod: { type: String, enum: ["manual", "standard", "franchise", "sales"], default: null },
    // Sales module (see salesimplementation.md Phase 1) — only set when bookingMethod is "sales".
    salesPersonId: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    installmentPlanId: { type: Schema.Types.ObjectId, ref: "InstallmentPlan", default: null },
    // The real access-control flag checked at /api/checkPurchase/[courseId] (see Phase 5).
    accessRevoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
