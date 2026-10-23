import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Slot, User } from "@/server/models";
import { createPaymentLink } from "@/server/integrations/razorpay";
import { isBookingClosed, getRealStartTime } from "@/lib/batchTiming";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { slotId, customerName, customerEmail, customerPhone, customAmountRupees } = body;

    if (!slotId || !customerName || !customerEmail) {
      return NextResponse.json(
        { error: "slotId, customerName, and customerEmail are required" },
        { status: 400 }
      );
    }

    const cleanEmail = customerEmail.trim().toLowerCase();
    const cleanName = customerName.trim();
    const cleanPhone = customerPhone ? customerPhone.trim() : undefined;

    await connectDB();

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return NextResponse.json({ error: "Batch slot not found" }, { status: 404 });
    }

    if (slot.programType !== "soft_skills") {
      return NextResponse.json({ error: "This batch is not a Soft Skills Bootcamp batch" }, { status: 400 });
    }

    // Capacity check (max 25)
    const maxStudents = slot.maxStudents || 25;
    if (slot.bookedStudents && slot.bookedStudents.length >= maxStudents) {
      return NextResponse.json(
        { error: `This cohort has reached maximum capacity (${maxStudents} seats).` },
        { status: 400 }
      );
    }

    // Strict No-Late-Admissions check
    if (slot.noLateAdmissions && isBookingClosed(slot)) {
      return NextResponse.json(
        {
          error:
            "Admissions are strictly closed for this Soft Skills Bootcamp batch as the start date/time has passed (no late admissions permitted).",
        },
        { status: 400 }
      );
    }

    // Amount calculation: Base ₹5,999 + 18% GST = ₹7,078.82, or admin custom amount
    let amountRupees = 5999 * 1.18;
    if (customAmountRupees && typeof customAmountRupees === "number" && customAmountRupees > 0) {
      amountRupees = customAmountRupees;
    }
    // Round to 2 decimal places
    amountRupees = Math.round(amountRupees * 100) / 100;

    // Set expiry at batch start time (no late admissions)
    const startTimeIST = getRealStartTime(slot);
    const expireByUnix = startTimeIST ? Math.floor(startTimeIST.getTime() / 1000) : null;
    // Razorpay requires expire_by to be at least 15-30 mins in future
    const nowUnix = Math.floor(Date.now() / 1000);
    const expireBy = expireByUnix && expireByUnix > nowUnix + 900 ? expireByUnix : undefined;

    const paymentLink = await createPaymentLink({
      amountRupees,
      customerName: cleanName,
      customerEmail: cleanEmail,
      customerPhone: cleanPhone,
      description: `4 Weeks Soft Skills Bootcamp Enrollment - Batch ${slot.batchNo || slot.title}`,
      notes: {
        programType: "soft_skills",
        slotId: slot._id.toString(),
        batchNo: slot.batchNo || "",
        customerEmail: cleanEmail,
        customerName: cleanName,
        customerPhone: cleanPhone || "",
      },
      expireBy,
    });

    return NextResponse.json({
      success: true,
      paymentLinkId: paymentLink.id,
      short_url: paymentLink.short_url,
      amountRupees,
      customerEmail: cleanEmail,
      customerName: cleanName,
      batchNo: slot.batchNo,
    });
  } catch (err) {
    console.error("[softskills/payment-link] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate payment link" },
      { status: 500 }
    );
  }
}
