import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Slot, Order, Course, User } from "@/server/models";

// Offline-safe baseline defaults, mirrors legacy slotRoutes.js
const DEFAULT_PRICES: Record<string, number> = {
  ssb_ppdt: 1999,
  psych: 3499,
  interview: 2499,
  group_testing: 7999,
  full_course: 12499,
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const { email, selectedModules, discountType, discountValue } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // Free-form admin-entered discount (comps, partner deals, negotiated
    // prices) — deliberately not a coupon-code lookup like the sales/self-
    // serve flows, since the admin already has full authority here and
    // manual booking never touches Razorpay/a real coupon's usage tracking.
    let discount = 0;
    if (discountValue !== undefined && discountValue !== null && discountValue !== 0) {
      if (typeof discountValue !== "number" || discountValue < 0) {
        return NextResponse.json({ message: "discountValue must be a non-negative number" }, { status: 400 });
      }
      if (discountType === "percent") {
        if (discountValue > 100) return NextResponse.json({ message: "Percent discount cannot exceed 100" }, { status: 400 });
      } else if (discountType && discountType !== "flat") {
        return NextResponse.json({ message: "discountType must be 'flat' or 'percent'" }, { status: 400 });
      }
    }

    const cleanEmail = email.trim().toLowerCase();

    await connectDB();

    const slot = await Slot.findById(id);
    if (!slot) {
      return NextResponse.json({ message: "Slot not found" }, { status: 404 });
    }

    // find user (same collection as auth)
    const targetUser = await User.findOne({ email: cleanEmail });

    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const userId = targetUser._id;

    // already booked check
    if (slot.bookedStudents.some((bid: { toString(): string }) => bid.toString() === userId.toString())) {
      return NextResponse.json({ message: "Already booked" }, { status: 400 });
    }

    // seat full check
    if (slot.bookedStudents.length >= slot.maxStudents) {
      return NextResponse.json({ message: "Slot is full" }, { status: 400 });
    }

    // Dynamic Global Pricing Verification
    const courses = await Course.find({
      courseId: { $in: ["ssb_ppdt", "psych", "interview", "group_testing", "full_course"] },
    });

    const courseMap: Record<string, number> = {};
    courses.forEach((c: { courseId: string; price: number }) => {
      courseMap[c.courseId] = c.price;
    });

    const getPrice = (cid: string) => (courseMap[cid] !== undefined ? courseMap[cid] : DEFAULT_PRICES[cid]);

    let calculatedBaseAmount = 0;
    const modules: string[] = selectedModules || [];

    if (slot.isFullCourse) {
      if (modules.length === 0) {
        calculatedBaseAmount = getPrice("full_course");
      } else if (modules.includes("full_course")) {
        calculatedBaseAmount = getPrice("full_course");
      } else {
        const individualSelectedCount = modules.filter((mid) => mid !== "full_course").length;
        if (individualSelectedCount === 4) {
          calculatedBaseAmount = getPrice("full_course");
        } else {
          let sum = 0;
          modules.forEach((mid) => {
            if (mid !== "full_course") sum += getPrice(mid);
          });
          calculatedBaseAmount = sum;
        }
      }
    } else {
      calculatedBaseAmount = slot.price || getPrice("full_course");
    }

    const baseAmount = calculatedBaseAmount;
    const originalAmount = baseAmount * 1.18;

    if (discountValue) {
      discount = discountType === "percent" ? (baseAmount * discountValue) / 100 : discountValue;
      if (discount > baseAmount) {
        return NextResponse.json({ message: "Discount cannot exceed the base price" }, { status: 400 });
      }
      discount = Math.round(discount * 100) / 100;
    }

    const netBaseAmount = baseAmount - discount;
    const totalWithGst = Math.round(netBaseAmount * 1.18 * 100) / 100;

    // add user (same as payment logic)
    slot.bookedStudents.push(userId);
    await slot.save();

    // ALSO CREATE ORDER
    const selectedModulesFinal = slot.isFullCourse ? (modules.length > 0 ? modules : ["full_course"]) : [];

    const order = new Order({
      userId,
      buyerName: targetUser.name,
      buyerEmail: targetUser.email,
      slotId: slot._id,
      price: totalWithGst,
      originalAmount,
      discount,
      referralCode: null,
      status: "paid",
      selectedModules: selectedModulesFinal,
      bookingMethod: "manual",
    });

    await order.save();

    // Synchronize User Profile Immediately & Bump updatedAt
    if (targetUser.role !== "student") {
      targetUser.role = "student";
    }

    if (slot.batchNo) {
      targetUser.batch = slot.batchNo.trim();
    }

    const bookedModules: string[] = order.selectedModules;
    if (bookedModules.length === 1 && bookedModules[0] !== "full_course") {
      targetUser.clinicalStage = bookedModules[0];
    } else if (bookedModules.includes("full_course") || bookedModules.length > 1) {
      targetUser.clinicalStage = "full_course";
    }

    // Forcefully save to trigger Mongoose `updatedAt` update even if nothing
    // strictly changed, so the student jumps to the top of the Student Roster
    // (matches legacy: markModified + save runs unconditionally).
    targetUser.markModified("updatedAt");
    await targetUser.save();

    return NextResponse.json({
      message: "Slot booked manually successfully",
      data: slot,
    });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
