import mongoose, { Schema } from "mongoose";

const couponSchema = new Schema(
  {
    code: { type: String, unique: true, required: true },
    discountType: { type: String, enum: ["percent", "flat"], required: true },
    discountValue: { type: Number, required: true },
    franchiseId: { type: Schema.Types.ObjectId, ref: "Franchise" },
    expiry: Date,
    isActive: { type: Boolean, default: true },
    usedBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        usedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

export const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
