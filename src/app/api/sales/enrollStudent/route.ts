import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { Slot, Order, InstallmentPlan, SalesAuditLog, User, Lead } from "@/server/models";
import { getSlotBasePrice, applySalesCoupon, resolveOrderSelectedModules, describeSelectedModules, MIN_INITIAL_AMOUNT } from "@/server/sales/pricing";
import { createPaymentLink } from "@/server/integrations/razorpay";
import { formatRealStartTime } from "@/lib/batchTiming";

interface SubmittedInstallment {
  amount: number;
  dueDate: string;
}

// Creates a not-yet-a-student User + Order + InstallmentPlan, then a real
// Razorpay Payment Link for just the initial amount (salesimplementation.md
// Phase 2). No webhook/auto-unlock yet — that's Phase 3; checkInstallmentStatus
// is this phase's manual stopgap for confirming payment.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const studentName = String(body.studentName || "").trim();
    const studentEmail = String(body.studentEmail || "").trim().toLowerCase();
    const slotId = body.slotId;
    const initialAmount = body.initialAmount;
    const submittedInstallments: SubmittedInstallment[] = Array.isArray(body.installments) ? body.installments : [];
    const selectedModules: string[] = Array.isArray(body.selectedModules) ? body.selectedModules : [];
    const couponCode = body.couponCode ? String(body.couponCode).trim() : null;

    if (!studentName || !studentEmail || !slotId) {
      return NextResponse.json({ message: "studentName, studentEmail, and slotId are required" }, { status: 400 });
    }

    await connectDB();

    const slot = await Slot.findById(slotId);
    if (!slot) return NextResponse.json({ message: "Slot not found" }, { status: 404 });

    // Re-look-up the true price and re-validate — never trust a client-submitted total.
    const baseAmount = await getSlotBasePrice(slot, selectedModules);
    const priced = await applySalesCoupon({ slot, baseAmount, couponCode, studentEmail });
    if (!priced.ok) return NextResponse.json({ message: priced.error }, { status: 400 });
    const { finalPriceInclGST, discount, couponCode: appliedCouponCode } = priced;

    if (typeof initialAmount !== "number" || initialAmount < MIN_INITIAL_AMOUNT || initialAmount > finalPriceInclGST) {
      return NextResponse.json(
        { message: `initialAmount must be between ₹${MIN_INITIAL_AMOUNT} and ₹${finalPriceInclGST}` },
        { status: 400 }
      );
    }

    const remaining = Math.round((finalPriceInclGST - initialAmount) * 100) / 100;

    // Re-validate the (possibly sales-person-edited) schedule regardless of edits.
    let sum = 0;
    let lastDate: Date | null = null;
    for (const inst of submittedInstallments) {
      if (typeof inst.amount !== "number" || inst.amount <= 0) {
        return NextResponse.json({ message: "Every installment amount must be a positive number" }, { status: 400 });
      }
      const d = new Date(inst.dueDate);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ message: "Every installment needs a valid dueDate" }, { status: 400 });
      }
      if (lastDate && d < lastDate) {
        return NextResponse.json({ message: "Installment dates must be non-decreasing" }, { status: 400 });
      }
      lastDate = d;
      sum = Math.round((sum + inst.amount) * 100) / 100;
    }

    if (Math.abs(sum - remaining) > 0.01) {
      return NextResponse.json(
        { message: `Installments must sum to exactly ₹${remaining} (the balance after the initial payment)` },
        { status: 400 }
      );
    }

    // Find-or-create the User by email — do not overwrite an existing student.
    let student = await User.findOne({ email: studentEmail });
    if (!student) {
      student = await User.create({
        name: studentName,
        email: studentEmail,
        role: "lead",
        isManuallyCreated: true,
      });
    }

    const order = await Order.create({
      userId: student._id,
      slotId: slot._id,
      price: finalPriceInclGST,
      originalAmount: Math.round(baseAmount * 1.18 * 100) / 100,
      discount,
      couponCode: appliedCouponCode,
      selectedModules: resolveOrderSelectedModules(slot, selectedModules),
      status: "pending",
      bookingMethod: "sales",
      salesPersonId: user!._id,
    });

    const now = new Date();
    const planInstallments = [
      { seq: 1, amount: initialAmount, dueDate: now, status: "pending" as const },
      ...submittedInstallments.map((inst, idx) => ({
        seq: idx + 2,
        amount: inst.amount,
        dueDate: new Date(inst.dueDate),
        status: "pending" as const,
      })),
    ];

    const plan = await InstallmentPlan.create({
      orderId: order._id,
      studentId: student._id,
      salesPersonId: user!._id,
      totalAmount: finalPriceInclGST,
      initialAmount,
      installments: planInstallments,
    });

    order.installmentPlanId = plan._id;
    await order.save();

    // Phase 6 (stretch): tie this enrollment back to a matching raw lead
    // capture, if one exists, so it shows as converted on the Leads admin
    // page instead of sitting there looking permanently unconverted.
    await Lead.updateMany(
      { email: { $regex: `^${studentEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }, convertedAt: null },
      { convertedAt: now, convertedOrderId: order._id }
    );

    // Batch number + real start date/time + course/module, so the payment
    // page ("Payment for: ...") tells the student which specific batch and
    // session this is for, not just a bare batch-type name.
    const batchLabel = `${slot.title}${slot.batchNo ? ` (#${slot.batchNo})` : ""}`;
    const moduleLabel = describeSelectedModules(order.selectedModules || []);
    const description = `Initial payment — ${batchLabel} — ${formatRealStartTime(slot)} — ${moduleLabel}`;

    const paymentLink = await createPaymentLink({
      amountRupees: initialAmount,
      customerName: studentName,
      customerEmail: studentEmail,
      description,
      notes: { orderId: String(order._id), installmentPlanId: String(plan._id), seq: "1" },
    });

    plan.installments[0].paymentLinkId = paymentLink.id;
    plan.installments[0].paymentLinkUrl = paymentLink.short_url;
    plan.installments[0].paymentLinkExpiresAt = paymentLink.expire_by ? new Date(paymentLink.expire_by * 1000) : null;
    await plan.save();

    await SalesAuditLog.create({
      actorId: user!._id,
      action: "LINK_GENERATED",
      orderId: order._id,
      installmentPlanId: plan._id,
      meta: { seq: 1, amount: initialAmount, paymentLinkId: paymentLink.id },
    });

    return NextResponse.json({
      orderId: order._id,
      installmentPlanId: plan._id,
      studentId: student._id,
      paymentLink: paymentLink.short_url,
      finalPriceInclGST,
      discount,
      couponCode: appliedCouponCode,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
