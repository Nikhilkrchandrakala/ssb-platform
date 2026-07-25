import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { InstallmentPlan, Order, SalesAuditLog } from "@/server/models";
import { isValidCronRequest } from "@/server/sales/cronAuth";

export const runtime = "nodejs";

interface InstallmentSubdoc {
  seq: number;
  dueDate: Date;
  status: string;
}

/**
 * POST /api/cron/revokeOverdueAccess (salesimplementation.md Phase 5).
 *
 * Run daily via the VPS OS crontab, alongside sendInstallmentReminders. Per
 * Open Decision #4: missing the *final* installment's due date revokes
 * access — not each individual installment's date, so a student who's
 * merely behind on installment 2 of 4 (but the plan's last installment
 * isn't due yet) keeps access.
 *
 * `SalesAuditLog.actorId` is required and there's no human actor for an
 * automated cron action — attributed to the plan's own `salesPersonId`
 * (it's their plan that defaulted), with `meta.automatic: true` marking it
 * as system-triggered, not a manual `resolveDefaultedPlan` action.
 */
export async function POST(req: NextRequest) {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const plans = await InstallmentPlan.find({ status: "active" });

  let revoked = 0;
  for (const plan of plans) {
    const installments = plan.installments as unknown as InstallmentSubdoc[];
    if (installments.length === 0) continue;

    const last = installments.reduce((a, b) => (a.seq > b.seq ? a : b));
    if (last.status === "paid" || new Date(last.dueDate) >= now) continue;

    plan.status = "defaulted";
    await plan.save();
    await Order.findByIdAndUpdate(plan.orderId, { accessRevoked: true });

    await SalesAuditLog.create({
      actorId: plan.salesPersonId,
      action: "PLAN_EDITED",
      orderId: plan.orderId,
      installmentPlanId: plan._id,
      meta: { reason: "overdue_final_installment", finalDueDate: last.dueDate, automatic: true },
    });
    revoked++;
  }

  return NextResponse.json({ revoked });
}
