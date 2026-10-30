import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Slot, Order, Course, User } from "@/server/models";
import { syncEnrollmentModeForUser } from "@/server/enrollmentModeSync";
import { resolveClinicalStageFromModules, syncClinicalStageForUser } from "@/server/clinicalStageSync";

// Offline-safe baseline defaults, mirrors legacy slotRoutes.js
const DEFAULT_PRICES: Record<string, number> = {
  ssb_ppdt: 1999,
  psych: 3499,
  interview: 2499,
  group_testing: 7999,
  full_course: 12499,
};

const OFFLINE_REGISTRATION_FEE = 5000;
const OFFLINE_TOTAL_FEE = 21000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const {
      email,
      selectedModules,
      discountType,
      discountValue,
      offlinePaymentPlan,
      paymentMethod,
      transactionRef,
    } = await req.json();

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

    // Strict No Late Admissions check for Soft Skills Bootcamp
    if ((slot.programType === "soft_skills" || slot.noLateAdmissions) && slot.startTime) {
      const { isBookingClosed } = await import("@/lib/batchTiming");
      if (isBookingClosed(slot)) {
        return NextResponse.json(
          {
            message:
              "Admissions are closed for this Soft Skills Bootcamp batch as the batch start date/time has passed (no late admissions permitted).",
          },
          { status: 400 }
        );
      }
    }

    // find user (same collection as auth)
    const targetUser = await User.findOne({ email: cleanEmail });

    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const userId = targetUser._id;

    // already booked check
    if (slot.bookedStudents.some((bid: { toString(): string }) => bid.toString() === userId.toString())) {
      return NextResponse.json({ message: "Already booked in this batch" }, { status: 400 });
    }

    // seat full check (max 25 for soft skills)
    const maxCapacity = slot.maxStudents || (slot.programType === "soft_skills" ? 25 : 10);
    if (slot.bookedStudents.length >= maxCapacity) {
      return NextResponse.json({ message: `Slot is full (maximum ${maxCapacity} seats)` }, { status: 400 });
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

    const isOfflineSlot = slot.mode === "offline";
    const isSoftSkillsSlot = slot.programType === "soft_skills";
    let calculatedBaseAmount = 0;
    const modules: string[] = selectedModules || [];

    if (isSoftSkillsSlot) {
      calculatedBaseAmount = slot.price || 5999;
    } else if (isOfflineSlot) {
      if (offlinePaymentPlan === "full") {
        calculatedBaseAmount = OFFLINE_TOTAL_FEE;
      } else {
        calculatedBaseAmount = slot.price || OFFLINE_REGISTRATION_FEE;
      }
    } else if (slot.isFullCourse) {
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

    if (discountValue) {
      discount = discountType === "percent" ? (baseAmount * discountValue) / 100 : discountValue;
      if (discount > baseAmount) {
        return NextResponse.json({ message: "Discount cannot exceed the base price" }, { status: 400 });
      }
      discount = Math.round(discount * 100) / 100;
    }

    const netBaseAmount = baseAmount - discount;

    let originalAmount: number;
    let finalPrice: number;

    if (isOfflineSlot) {
      // Offline registrations and full course fees have no GST
      originalAmount = baseAmount;
      finalPrice = Math.max(netBaseAmount, 0);
    } else {
      // Online courses have 18% GST — ceil to nearest whole rupee
      originalAmount = Math.ceil(baseAmount * 1.18);
      finalPrice = Math.ceil(Math.max(netBaseAmount, 0) * 1.18);
    }

    // add user (same as payment logic)
    slot.bookedStudents.push(userId);
    await slot.save();

    // ALSO CREATE ORDER
    const selectedModulesFinal = (isOfflineSlot || isSoftSkillsSlot)
      ? []
      : (slot.isFullCourse ? (modules.length > 0 ? modules : ["full_course"]) : []);

    const order = new Order({
      userId,
      buyerName: targetUser.name,
      buyerEmail: targetUser.email,
      slotId: slot._id,
      price: finalPrice,
      originalAmount,
      discount,
      referralCode: null,
      status: "paid",
      selectedModules: selectedModulesFinal,
      bookingMethod: "manual",
      programType: slot.programType || "ssb",
      paymentMethod: paymentMethod === "bank_transfer" ? "bank_transfer" : "manual",
      transactionRef: transactionRef ? String(transactionRef).trim() : null,
    });

    await order.save();

    // Synchronize User Profile Immediately & Bump updatedAt
    if (targetUser.role !== "student") {
      targetUser.role = "student";
    }

    if (slot.batchNo) {
      targetUser.batch = slot.batchNo.trim();
    }

    if (isSoftSkillsSlot) {
      if (!targetUser.enrolledPrograms) targetUser.enrolledPrograms = [];
      if (!targetUser.enrolledPrograms.includes("soft_skills_bootcamp")) {
        targetUser.enrolledPrograms.push("soft_skills_bootcamp");
      }
    } else if (!isOfflineSlot) {
      const bookedModules: string[] = order.selectedModules || [];
      targetUser.clinicalStage = resolveClinicalStageFromModules(bookedModules);
    }

    // Forcefully save to trigger Mongoose `updatedAt` update even if nothing
    // strictly changed, so the student jumps to the top of the Student Roster
    // (matches legacy: markModified + save runs unconditionally).
    targetUser.markModified("updatedAt");
    await targetUser.save();
    
    if (!isSoftSkillsSlot) {
      await syncEnrollmentModeForUser(String(targetUser._id));
      await syncClinicalStageForUser(String(targetUser._id));
    }

    return NextResponse.json({
      message: "Slot booked successfully",
      data: slot,
    });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
