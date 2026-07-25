import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Coupon, Slot } from "@/server/models";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code, amount, slotId } = await req.json();

    await connectDB();

    if (slotId) {
      const slot = await Slot.findById(slotId);
      if (slot && !slot.isFullCourse) {
        return NextResponse.json({ message: "Coupons are only valid for the Full Course." }, { status: 400 });
      }
    } else {
      // Backward compatibility or fallback: if no slotId, we might reject or allow,
      // but since it's dynamic, let's reject to be safe.
      return NextResponse.json({ message: "Slot ID is required to apply a coupon." }, { status: 400 });
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      return NextResponse.json({ message: "Invalid coupon" }, { status: 400 });
    }

    // Expiry check
    if (coupon.expiry && coupon.expiry < new Date()) {
      return NextResponse.json({ message: "Coupon expired" }, { status: 400 });
    }

    // Already used
    const alreadyUsed = coupon.usedBy.some(
      (u: { userId: { toString(): string } }) => u.userId.toString() === String(user._id)
    );

    if (alreadyUsed) {
      return NextResponse.json({ message: "You already used this coupon" }, { status: 400 });
    }

    // Discount calculation
    let discount = 0;
    const baseAmount = Number(amount);

    if (coupon.discountType === "percent") {
      discount = (baseAmount * coupon.discountValue) / 100;
    } else {
      discount = Math.min(coupon.discountValue, baseAmount);
    }

    const netAmount = Math.max(baseAmount - discount, 0);
    const gst = netAmount * 0.18;
    const finalAmount = netAmount + gst;

    return NextResponse.json({
      discount,
      gst,
      finalAmount,
      couponCode: coupon.code,
    });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
