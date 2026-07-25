import mongoose, { Schema } from "mongoose";

const leadSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  date: { type: Date, default: Date.now },
  time: { type: String, default: () => new Date().toLocaleTimeString() },
  // Sales module (salesimplementation.md Phase 6, stretch) — set by
  // /api/sales/enrollStudent when the enrolled email matches a raw lead
  // capture, so this lead→student conversion is visible on the Leads page
  // instead of the lead sitting there looking permanently unconverted.
  convertedAt: { type: Date, default: null },
  convertedOrderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
});

export const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);
