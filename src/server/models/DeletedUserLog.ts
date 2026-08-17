import mongoose, { Schema } from "mongoose";

// Written once, at the moment DELETE /api/admin/students/[id] permanently
// purges an account and every record that referenced it (Orders,
// Submissions, InstallmentPlans, Notifications, SalesAuditLogs, Slot seats —
// see that route for the full cascade). Since the User document itself is
// gone afterward, this is the only place left to answer "who did we delete,
// when, and how much did it touch" — a snapshot, not a live reference.
const deletedUserLogSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: null },
    role: { type: String, default: null },
    batch: { type: String, default: null },
    chestNo: { type: String, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    deletedByName: { type: String, default: null },
    purged: {
      orders: { type: Number, default: 0 },
      submissions: { type: Number, default: 0 },
      installmentPlans: { type: Number, default: 0 },
      notifications: { type: Number, default: 0 },
      salesAuditLogs: { type: Number, default: 0 },
      slotSeatsFreed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const DeletedUserLog = mongoose.models.DeletedUserLog || mongoose.model("DeletedUserLog", deletedUserLogSchema);
