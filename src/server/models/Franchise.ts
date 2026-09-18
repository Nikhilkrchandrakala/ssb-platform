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

// Never let the password hash reach a JSON response (admin franchise pages
// serialise whole documents).
franchiseSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.password;
    return ret;
  },
});

export const Franchise = mongoose.models.Franchise || mongoose.model("Franchise", franchiseSchema);
