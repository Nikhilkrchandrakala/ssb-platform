import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Order, Coupon, Slot } from "@/server/models";
import { razorpay } from "@/server/integrations/razorpay";

// Fallback only — every offline Slot has its own `price` (admin-set on the
// "Create Offline Batch" form, editable for testing), which is what's
// actually charged below. No GST: the student pays this exact amount, and
// the balance of the real course fee in person at the training center.
const OFFLINE_REGISTRATION_FEE = 5000;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slotId, couponCode } = await req.json();
    const userId = String(user._id);

    await connectDB();

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return NextResponse.json({ message: "Slot not found" }, { status: 404 });
    }
    if (slot.mode !== "offline") {
      return NextResponse.json({ message: "This batch is not an offline batch" }, { status: 400 });
    }

    const baseAmount = slot.price || OFFLINE_REGISTRATION_FEE;
    let discount = 0;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (!coupon) {
        return NextResponse.json({ message: "Invalid coupon" }, { status: 400 });
      }
      if (coupon.expiry && new Date(coupon.expiry) < new Date()) {
        return NextResponse.json({ message: "Coupon expired" }, { status: 400 });
      }
      const alreadyUsed = (coupon.usedBy || []).some(
        (u: { userId: { toString(): string } }) => u.userId.toString() === userId
      );
      if (alreadyUsed) {
        return NextResponse.json({ message: "Coupon already used" }, { status: 400 });
      }
      if (coupon.discountType === "percent") {
        discount = (baseAmount * coupon.discountValue) / 100;
      } else {
        discount = Math.min(coupon.discountValue, baseAmount);
      }
    }

    const finalAmount = Math.max(baseAmount - discount, 0);
    const amountInPaise = Math.round(finalAmount * 100);

    const order = new Order({
      userId,
      buyerName: user.name,
      buyerEmail: user.email,
      slotId,
      price: finalAmount,
      originalAmount: baseAmount,
      discount,
      couponCode: couponCode || null,
      selectedModules: [],
      status: "pending",
      bookingMethod: "standard",
    });

    await order.save();

    const razorOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: "offline_slot_" + order._id,
      notes: {
        orderId: order._id.toString(),
        userId: userId.toString(),
        slotId: String(slotId),
      },
    });

    order.orderId = razorOrder.id;
    await order.save();

    return NextResponse.json({
      orderId: razorOrder.id,
      amount: razorOrder.amount,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
