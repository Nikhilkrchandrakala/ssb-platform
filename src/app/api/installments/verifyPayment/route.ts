import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { connectDB } from "@/server/db";
import { InstallmentPlan } from "@/server/models";
import { razorpay, verifyRazorpaySignature } from "@/server/integrations/razorpay";
import { markInstallmentPaid } from "@/server/sales/markInstallmentPaid";

/**
 * POST /api/installments/verifyPayment (salesimplementation.md Phase 3).
 *
 * Fires from the student dashboard's checkout.js `handler` callback right
 * after a "Pay Now" payment — purely for instant UI feedback. Per Open
 * Decision #3 / the Phase 3 spec, a client redirect is never trusted alone:
 * this route re-verifies the checkout signature *and* independently fetches
 * the payment from Razorpay's API to confirm `status === "captured"` before
 * calling the same `markInstallmentPaid` the webhook uses (mirrors Phase 2's
 * `checkInstallmentStatus` stopgap, which applies the same "confirm via
 * Razorpay directly" rule). `/api/webhooks/razorpay` remains the reliable,
 * browser-independent path — this route racing it is harmless, since
 * `markInstallmentPaid` is idempotent on `paymentId`.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, installmentPlanId, seq } = await req.json();
    if (!installmentPlanId || typeof seq !== "number") {
      return NextResponse.json({ message: "installmentPlanId and seq are required" }, { status: 400 });
    }

    const validSignature = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!validSignature) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
    }

    await connectDB();

    const plan = await InstallmentPlan.findById(installmentPlanId);
    if (!plan) return NextResponse.json({ message: "Installment plan not found" }, { status: 404 });
    if (String(plan.studentId) !== String(user._id)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Independently confirm with Razorpay rather than trusting the redirect alone.
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.status !== "captured") {
      return NextResponse.json({ message: `Payment not captured yet (status: ${payment.status})` }, { status: 400 });
    }

    await markInstallmentPaid({ installmentPlanId, seq, paymentId: razorpay_payment_id });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
