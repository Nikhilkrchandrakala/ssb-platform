import mongoose, { Schema } from "mongoose";

// Merges the main backend's Notification (type enum, general/system/allotment)
// with psych_battery's Notification (submissionId-linked) — both wrote to the
// same default `notifications` collection already, just with different shapes.
const notificationSchema = new Schema(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    submissionId: { type: Schema.Types.ObjectId, ref: "Submission", default: null },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["ALLOTMENT", "SYSTEM", "ASSESSMENT"], default: "SYSTEM" },
    isRead: { type: Boolean, default: false },

    // Set only by the "Notify Assessors" batch-summary send (see
    // POST /api/admin/allotment-summary/notify) — lets that admin screen
    // query "who was already notified, and did it deliver" for a batch
    // instead of only holding the last send result in throwaway React state
    // (the original bug: reselecting the batch, or just navigating back,
    // showed nothing because nothing had ever been persisted).
    batch: { type: String, default: null },
    count: { type: Number, default: null },
    emailDelivered: { type: Boolean, default: null },
    smsDelivered: { type: Boolean, default: null },
  },
  { timestamps: true }
);

notificationSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    return ret;
  },
});

export const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
