import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { InstallmentPlan } from "@/server/models";
import { razorpay } from "@/server/integrations/razorpay";

interface InstallmentSubdoc {
  seq: number;
  amount: number;
  status: string;
}

/**
 * POST /api/installments/payOrder (salesimplementation.md Phase 3).
 *
 * Student-facing counterpart to the sales flow's `createPaymentLink`: creates
 * a real Razorpay Order (not a Payment Link) for a single pending installment,
 * scoped to the checkout.js "Pay Now" button on the student dashboard — the
 * student already has a session here, unlike the not-yet-a-student lead the
 * sales flow enrolls, so a plain checkout Order (same pattern as the existing
 * self-serve `/api/createOrder`) is the right primitive.
 *
 * `installmentPlanId`/`seq` are stamped into the order's `notes` so
 * `/api/webhooks/razorpay`'s `order.paid` handler can find the right
 * installment without trusting anything the client sends at confirmation time.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { installmentPlanId, seq } = await req.json();
    if (!installmentPlanId || typeof seq !== "number") {
      return NextResponse.json({ message: "installmentPlanId and seq are required" }, { status: 400 });
    }

    await connectDB();

    const plan = await InstallmentPlan.findById(installmentPlanId);
    if (!plan) return NextResponse.json({ message: "Installment plan not found" }, { status: 404 });

    if (String(plan.studentId) !== String(user._id)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const installment = (plan.installments as unknown as InstallmentSubdoc[]).find((i) => i.seq === seq);
    if (!installment) return NextResponse.json({ message: "Installment not found" }, { status: 404 });
    if (installment.status === "paid") {
      return NextResponse.json({ message: "This installment is already paid" }, { status: 400 });
    }

    const razorOrder = await razorpay.orders.create({
      amount: Math.round(installment.amount * 100),
      currency: "INR",
      receipt: `installment_${plan._id}_${seq}`,
      notes: { installmentPlanId: String(plan._id), seq: String(seq) },
    });

    return NextResponse.json({ orderId: razorOrder.id, amount: razorOrder.amount });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
