import mongoose, { Schema } from "mongoose";

// Sales module (see salesimplementation.md Phase 1). Written to by every
// sales route that mutates money or shares a link — the paper trail for
// resolveDefaultedPlan (Phase 5) in particular.
const salesAuditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    action: {
      type: String,
      enum: ["LINK_GENERATED", "INSTALLMENT_MARKED_PAID_MANUAL", "PLAN_EDITED", "REMINDER_SENT"],
      required: true,
    },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    installmentPlanId: { type: Schema.Types.ObjectId, ref: "InstallmentPlan", default: null },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export const SalesAuditLog =
  mongoose.models.SalesAuditLog || mongoose.model("SalesAuditLog", salesAuditLogSchema);
