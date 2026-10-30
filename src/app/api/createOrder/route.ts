import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Order, Coupon, Slot, Course } from "@/server/models";
import { razorpay } from "@/server/integrations/razorpay";
import { isBookingClosed } from "@/lib/batchTiming";

// Offline-safe baseline defaults, mirrors legacy orderRoutes.js
const DEFAULT_PRICES: Record<string, number> = {
  ssb_ppdt: 1999,
  psych: 3499,
  interview: 2499,
  group_testing: 7999,
  full_course: 12499,
};

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slotId, referralCode, couponCode, selectedModules } = await req.json();
    const userId = String(user._id);

    await connectDB();

    // check slot exists
    const slot = await Slot.findById(slotId);
    if (!slot) {
      return NextResponse.json({ message: "Slot not found" }, { status: 404 });
    }

    const isSoftSkills = slot.programType === "soft_skills" || (slot.title && slot.title.toLowerCase().includes("soft skills"));

    if (slot.bookedStudents && slot.bookedStudents.length >= (slot.maxStudents || (isSoftSkills ? 25 : 50))) {
      return NextResponse.json({ message: "This batch is full." }, { status: 400 });
    }

    // Booking closes at cutoff (Strictly no late admissions for Soft Skills Bootcamp)
    if (isBookingClosed(slot)) {
      return NextResponse.json(
        {
          message: isSoftSkills
            ? "Admissions for this cohort are closed. No late admissions are permitted for the 4 Weeks Soft Skills Bootcamp."
            : "Booking for this batch is closed.",
        },
        { status: 400 }
      );
    }

    let calculatedBaseAmount = 0;
    const modules: string[] = selectedModules || [];

    if (isSoftSkills) {
      calculatedBaseAmount = slot.price || 5999;
    } else {
      // Dynamic Global Pricing Verification for SSB
      const courses = await Course.find({
        courseId: { $in: ["ssb_ppdt", "psych", "interview", "group_testing", "full_course"] },
      });

      const courseMap: Record<string, number> = {};
      courses.forEach((c: { courseId: string; price: number }) => {
        courseMap[c.courseId] = c.price;
      });

      const getPrice = (id: string) => (courseMap[id] !== undefined ? courseMap[id] : DEFAULT_PRICES[id]);

      if (slot.isFullCourse) {
        calculatedBaseAmount = getPrice("full_course");
      } else {
        if (modules.length === 0) {
          calculatedBaseAmount = slot.price || getPrice("full_course");
        } else if (modules.includes("full_course")) {
          calculatedBaseAmount = getPrice("full_course");
        } else {
          const individualSelectedCount = modules.filter((id) => id !== "full_course").length;
          if (individualSelectedCount === 4) {
            calculatedBaseAmount = getPrice("full_course");
          } else {
            let sum = 0;
            modules.forEach((id) => {
              if (id !== "full_course") sum += getPrice(id);
            });
            calculatedBaseAmount = sum;
          }
        }
      }
    }

    // GST and Discount Logic
    const baseAmount = calculatedBaseAmount;
    let discount = 0;

    // COUPON APPLY
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
      });

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

    const netAmount = Math.max(baseAmount - discount, 0);
    const gstAmount = netAmount * 0.18;
    const finalAmount = Math.ceil(netAmount + gstAmount); // ceil to nearest whole rupee
    const originalAmountWithGST = Math.ceil(baseAmount + baseAmount * 0.18); // ceil to nearest whole rupee

    const amountInPaise = finalAmount * 100; // already a whole number after ceil

    // CREATE ORDER FIRST (IMPORTANT FOR REFERENCE)
    const order = new Order({
      userId,
      buyerName: user.name,
      buyerEmail: user.email,
      slotId,
      price: finalAmount,
      originalAmount: originalAmountWithGST,
      discount,
      couponCode: couponCode || null,
      referralCode: referralCode || null,
      selectedModules: isSoftSkills ? ["soft_skills_bootcamp"] : (selectedModules || []),
      status: "pending",
      bookingMethod: referralCode ? "franchise" : "standard",
      programType: isSoftSkills ? "soft_skills" : "ssb",
      paymentMethod: "razorpay",
    });

    await order.save();

    // RAZORPAY ORDER (WITH REFERENCE)
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: "slot_" + order._id,
      notes: {
        orderId: order._id.toString(),
        userId: userId.toString(),
        slotId: String(slotId),
      },
    };

    const razorOrder = await razorpay.orders.create(options);

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
