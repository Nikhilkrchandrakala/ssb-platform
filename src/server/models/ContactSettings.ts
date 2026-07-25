import mongoose, { Schema } from "mongoose";

const contactSettingsSchema = new Schema(
  {
    whatsappNumber: { type: String, required: true, default: "8420422821" },
    callNumber: { type: String, required: true, default: "7483617249" },
  },
  { timestamps: true }
);

export const ContactSettings =
  mongoose.models.ContactSettings || mongoose.model("ContactSettings", contactSettingsSchema);
