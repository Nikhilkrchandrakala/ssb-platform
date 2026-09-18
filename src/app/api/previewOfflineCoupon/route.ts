import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Coupon, Slot } from "@/server/models";

// Mirrors the discount math in /api/createOfflineOrder exactly (the slot's
// own price, no GST) — this route only previews the number before payment;
// the real charge is always recomputed server-side in createOfflineOrder
// itself. Fallback only, if a slot is somehow missing a price.
const OFFLINE_REGISTRATION_FEE = 5000;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { couponCode, slotId } = await req.json();
    if (!couponCode || !String(couponCode).trim()) {
      return NextResponse.json({ message: "Coupon code is required" }, { status: 400 });
    }
    if (!slotId) {
      return NextResponse.json({ message: "slotId is required" }, { status: 400 });
    }

    await connectDB();

    const slot = await Slot.findById(slotId);
    if (!slot || slot.mode !== "offline") {
      return NextResponse.json({ message: "Batch not found" }, { status: 404 });
    }
    const registrationFee = slot.price || OFFLINE_REGISTRATION_FEE;

    const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase().trim(), isActive: true });
    if (!coupon) {
      return NextResponse.json({ message: "Invalid coupon" }, { status: 400 });
    }
    if (coupon.expiry && new Date(coupon.expiry) < new Date()) {
      return NextResponse.json({ message: "Coupon expired" }, { status: 400 });
    }
    const alreadyUsed = (coupon.usedBy || []).some(
      (u: { userId: { toString(): string } }) => u.userId.toString() === String(user._id)
    );
    if (alreadyUsed) {
      return NextResponse.json({ message: "You already used this coupon" }, { status: 400 });
    }

    const discount =
      coupon.discountType === "percent"
        ? (registrationFee * coupon.discountValue) / 100
        : Math.min(coupon.discountValue, registrationFee);

    const finalAmount = Math.max(registrationFee - discount, 0);

    return NextResponse.json({ discount, finalAmount, couponCode: coupon.code });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
