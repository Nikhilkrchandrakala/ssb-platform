import mongoose, { Schema } from "mongoose";

const franchiseSchema = new Schema(
  {
    name: String,
    email: { type: String, unique: true },
    phone: String,
    referralCode: { type: String, unique: true },
    commissionPercent: { type: Number, default: 20 },
    totalEarning: { type: Number, default: 0 },
    password: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Franchise = mongoose.models.Franchise || mongoose.model("Franchise", franchiseSchema);
