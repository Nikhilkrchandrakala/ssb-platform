import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { InstallmentPlan, SalesAuditLog } from "@/server/models";
import { assertCanAccessPlan, toSalesActor } from "@/server/sales/scope";
import { redistributeRemaining } from "@/lib/redistributeInstallments";

interface InstallmentSubdoc {
  seq: number;
  amount: number;
  status: string;
}

/**
 * POST /api/sales/adjustInstallmentAmount — manually change one not-yet-paid
 * installment's amount. Per owner request, the rest of the plan's
 * not-yet-paid installments are automatically re-split so the total still
 * adds up to InstallmentPlan.totalAmount — no separately hand-editing every
 * other installment to compensate.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { installmentPlanId, seq, amount, reason } = await req.json();
    if (!installmentPlanId || typeof seq !== "number" || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ message: "installmentPlanId, seq, and a positive amount are required" }, { status: 400 });
    }

    await connectDB();

    const plan = await InstallmentPlan.findById(installmentPlanId).populate("salesPersonId", "reportsTo");
    if (!plan) return NextResponse.json({ message: "Installment plan not found" }, { status: 404 });

    if (!assertCanAccessPlan(toSalesActor(user!), plan.salesPersonId as { _id: unknown; reportsTo?: unknown })) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const installments = plan.installments as unknown as InstallmentSubdoc[];
    const target = installments.find((i) => i.seq === seq);
    if (!target) return NextResponse.json({ message: "Installment not found" }, { status: 404 });
    if (target.status === "paid") {
      return NextResponse.json({ message: "A paid installment's amount can't be changed" }, { status: 400 });
    }

    const previousAmount = target.amount;
    target.amount = Math.round(amount * 100) / 100;

    const result = redistributeRemaining(installments, plan.totalAmount, new Set([seq]));
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

    await plan.save();

    await SalesAuditLog.create({
      actorId: user!._id,
      action: "PLAN_EDITED",
      orderId: plan.orderId,
      installmentPlanId: plan._id,
      meta: { reason: reason || null, seq, previousAmount, newAmount: target.amount, autoRedistributed: true },
    });

    return NextResponse.json({ success: true, installments: plan.installments });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
