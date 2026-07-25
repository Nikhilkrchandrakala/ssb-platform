import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Order, Slot, Coupon, User } from "@/server/models";
import { verifyRazorpaySignature } from "@/server/integrations/razorpay";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    const valid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!valid) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
    }

    await connectDB();

    const order = await Order.findOne({ orderId: razorpay_order_id });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // mark paid
    order.status = "paid";
    order.paymentId = razorpay_payment_id;
    await order.save();

    // ADD USER TO SLOT
    const slot = await Slot.findById(order.slotId);

    if (slot && !slot.bookedStudents.includes(order.userId)) {
      slot.bookedStudents.push(order.userId);
      await slot.save();
    }

    // Synchronize student's profile batch, role, and clinicalStage
    const updateFields: Record<string, unknown> = {
      role: "student",
    };
    if (slot && slot.batchNo) {
      updateFields.batch = slot.batchNo.trim();
    }
    const bookedModules: string[] = order.selectedModules || [];
    if (bookedModules.length === 1 && bookedModules[0] !== "full_course") {
      updateFields.clinicalStage = bookedModules[0];
    } else if (bookedModules.includes("full_course") || bookedModules.length > 1 || bookedModules.length === 0) {
      updateFields.clinicalStage = "full_course";
    }
    await User.findByIdAndUpdate(order.userId, updateFields);

    // mark coupon used
    if (order.couponCode) {
      await Coupon.updateOne(
        { code: order.couponCode },
        {
          $push: {
            usedBy: {
              userId: order.userId,
              usedAt: new Date(),
            },
          },
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
