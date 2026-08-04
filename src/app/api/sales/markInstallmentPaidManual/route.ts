import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { InstallmentPlan, SalesAuditLog } from "@/server/models";
import { markInstallmentPaid } from "@/server/sales/markInstallmentPaid";
import { assertCanAccessPlan, toSalesActor } from "@/server/sales/scope";

interface InstallmentSubdoc {
  seq: number;
  status: string;
}

/**
 * POST /api/sales/markInstallmentPaidManual — a sales person records an
 * installment the student paid offline (cash, UPI, bank transfer, cheque —
 * anything that bypassed Razorpay). Requires a payment reference so the
 * installment always shows *something* the student and sales team can later
 * relate back to the real transaction, distinguishing it from a genuine
 * Razorpay-confirmed payment (see paymentMethod/paymentReference on
 * InstallmentPlan.installments).
 *
 * Normal per-record sales scoping (owner: any; head: own + reports;
 * executive: own only) — deliberately NOT the stricter
 * plan-owner-only rule resolveDefaultedPlan's markPaidManual action uses,
 * since this is routine day-to-day operation, not defaulted-plan recovery.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { installmentPlanId, seq, reference } = await req.json();
    if (!installmentPlanId || typeof seq !== "number") {
      return NextResponse.json({ message: "installmentPlanId and seq are required" }, { status: 400 });
    }
    const referenceTrimmed = typeof reference === "string" ? reference.trim() : "";
    if (!referenceTrimmed) {
      return NextResponse.json(
        { message: "A payment reference (transaction ID, UTR, cheque no., etc.) is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const plan = await InstallmentPlan.findById(installmentPlanId).populate("salesPersonId", "reportsTo");
    if (!plan) return NextResponse.json({ message: "Installment plan not found" }, { status: 404 });

    if (!assertCanAccessPlan(toSalesActor(user!), plan.salesPersonId as { _id: unknown; reportsTo?: unknown })) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const installment = (plan.installments as unknown as InstallmentSubdoc[]).find((i) => i.seq === seq);
    if (!installment) return NextResponse.json({ message: "Installment not found" }, { status: 404 });
    if (installment.status === "paid") {
      return NextResponse.json({ message: "This installment is already marked paid" }, { status: 400 });
    }

    const paymentId = `manual:${user!._id}:${Date.now()}`;
    const result = await markInstallmentPaid({
      installmentPlanId,
      seq,
      paymentId,
      method: "manual",
      reference: referenceTrimmed,
      markedPaidBy: String(user!._id),
    });

    await SalesAuditLog.create({
      actorId: user!._id,
      action: "INSTALLMENT_MARKED_PAID_MANUAL",
      orderId: plan.orderId,
      installmentPlanId: plan._id,
      meta: { seq, reference: referenceTrimmed, paymentId },
    });

    const updatedPlan = await InstallmentPlan.findById(installmentPlanId);
    return NextResponse.json({
      success: true,
      studentCredentials: result.studentCredentials || null,
      installments: updatedPlan?.installments || null,
    });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
