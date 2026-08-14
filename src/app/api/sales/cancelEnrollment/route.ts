import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { InstallmentPlan, SalesAuditLog } from "@/server/models";
import { razorpay } from "@/server/integrations/razorpay";
import { assertCanAccessPlan, toSalesActor } from "@/server/sales/scope";

interface InstallmentSubdoc {
  seq: number;
  status: string;
  paymentLinkId?: string | null;
}

/**
 * POST /api/sales/cancelEnrollment.
 *
 * Self-service undo for a sales person's own mistake (wrong course/batch
 * selected, wrong amount, etc.) — cancels the Razorpay Payment Link for the
 * plan's still-pending first installment so it can no longer be paid, and
 * closes the plan out (reuses the same "cancelled" plan status the
 * supersede-on-re-enroll cleanup in enrollStudent already sets).
 *
 * Only ever works before any money has moved. Once the first installment is
 * paid, unwinding it is a refund conversation, not a cancel button — this
 * route refuses rather than silently doing something a real payment
 * shouldn't be undone by.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { installmentPlanId, reason } = body;
    if (!installmentPlanId) return NextResponse.json({ message: "installmentPlanId is required" }, { status: 400 });

    await connectDB();

    const plan = await InstallmentPlan.findById(installmentPlanId).populate("salesPersonId", "reportsTo");
    if (!plan) return NextResponse.json({ message: "Installment plan not found" }, { status: 404 });

    if (!assertCanAccessPlan(toSalesActor(user!), plan.salesPersonId as { _id: unknown; reportsTo?: unknown })) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (plan.status !== "active") {
      return NextResponse.json({ message: `This plan is already ${plan.status} — there's nothing to cancel` }, { status: 400 });
    }

    const installments = plan.installments as unknown as InstallmentSubdoc[];
    if (installments.some((i) => i.status === "paid")) {
      return NextResponse.json(
        { message: "This student has already paid at least one installment — cancelling isn't available here, that needs a refund instead." },
        { status: 400 }
      );
    }

    const firstWithLink = installments.find((i) => i.paymentLinkId);
    if (firstWithLink?.paymentLinkId) {
      try {
        await razorpay.paymentLink.cancel(firstWithLink.paymentLinkId);
      } catch (err) {
        console.error("[sales/cancelEnrollment] failed to cancel payment link", firstWithLink.paymentLinkId, err);
      }
    }

    plan.status = "cancelled";
    await plan.save();

    await SalesAuditLog.create({
      actorId: user!._id,
      action: "PLAN_EDITED",
      orderId: plan.orderId,
      installmentPlanId: plan._id,
      meta: { cancelledBySalesPerson: true, reason: reason || null },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
