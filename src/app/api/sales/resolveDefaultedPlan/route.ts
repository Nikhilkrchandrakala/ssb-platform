import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { InstallmentPlan, Order, SalesAuditLog } from "@/server/models";
import { markInstallmentPaid } from "@/server/sales/markInstallmentPaid";

interface InstallmentSubdoc {
  seq: number;
  amount: number;
  dueDate: Date;
  status: string;
}

interface AdjustInstallmentInput {
  seq: number;
  amount?: number;
  dueDate?: string;
}

/**
 * POST /api/sales/resolveDefaultedPlan (salesimplementation.md Phase 5).
 *
 * Per Open Decision #6: only the sales person who *owns* the plan
 * (`salesPersonId === actor._id`) can act here — deliberately not their
 * sales head, not even the owner. This is the one path that bypasses the
 * normal "Razorpay confirms everything" rule from Phase 3, so every branch
 * writes a `SalesAuditLog` entry recording what changed and why.
 *
 * Body: `{ installmentPlanId, action, reason?, ...action-specific fields }`
 *  - `adjustInstallments`: `{ installments: [{ seq, amount?, dueDate? }] }` —
 *    only touches not-yet-paid installments.
 *  - `markPaidManual`: `{ seq }` — e.g. a bank transfer that bypassed
 *    Razorpay. Reuses `markInstallmentPaid` (a synthetic `manual:` paymentId)
 *    so the first-installment unlock/provisioning logic isn't duplicated.
 *  - `restoreAccess`: clears `Order.accessRevoked` and un-defaults the plan.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { installmentPlanId, action, reason } = body;
    if (!installmentPlanId || !action) {
      return NextResponse.json({ message: "installmentPlanId and action are required" }, { status: 400 });
    }

    await connectDB();

    const plan = await InstallmentPlan.findById(installmentPlanId);
    if (!plan) return NextResponse.json({ message: "Installment plan not found" }, { status: 404 });

    // Deliberately not canAccessSalesRecord — this route is stricter: only
    // the plan's own owning sales person, never their head, never the owner.
    if (String(plan.salesPersonId) !== String(user!._id)) {
      return NextResponse.json({ message: "Forbidden — only the sales person who owns this plan can resolve it" }, { status: 403 });
    }

    if (action === "adjustInstallments") {
      const edits: AdjustInstallmentInput[] = Array.isArray(body.installments) ? body.installments : [];
      if (edits.length === 0) {
        return NextResponse.json({ message: "installments must be a non-empty array" }, { status: 400 });
      }
      const installments = plan.installments as unknown as InstallmentSubdoc[];
      for (const edit of edits) {
        const inst = installments.find((i) => i.seq === edit.seq);
        if (!inst) return NextResponse.json({ message: `Installment seq ${edit.seq} not found` }, { status: 404 });
        if (inst.status === "paid") {
          return NextResponse.json({ message: `Installment seq ${edit.seq} is already paid and can't be adjusted` }, { status: 400 });
        }
        if (edit.amount !== undefined) {
          if (typeof edit.amount !== "number" || edit.amount <= 0) {
            return NextResponse.json({ message: `Installment seq ${edit.seq}: amount must be a positive number` }, { status: 400 });
          }
          inst.amount = edit.amount;
        }
        if (edit.dueDate !== undefined) {
          const d = new Date(edit.dueDate);
          if (Number.isNaN(d.getTime())) {
            return NextResponse.json({ message: `Installment seq ${edit.seq}: invalid dueDate` }, { status: 400 });
          }
          inst.dueDate = d;
        }
      }
      await plan.save();

      await SalesAuditLog.create({
        actorId: user!._id,
        action: "PLAN_EDITED",
        orderId: plan.orderId,
        installmentPlanId: plan._id,
        meta: { reason: reason || null, edits },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "markPaidManual") {
      const seq = body.seq;
      if (typeof seq !== "number") return NextResponse.json({ message: "seq is required" }, { status: 400 });

      const paymentId = `manual:${user!._id}:${Date.now()}`;
      await markInstallmentPaid({ installmentPlanId, seq, paymentId });

      await SalesAuditLog.create({
        actorId: user!._id,
        action: "INSTALLMENT_MARKED_PAID_MANUAL",
        orderId: plan.orderId,
        installmentPlanId: plan._id,
        meta: { seq, reason: reason || null, paymentId },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "restoreAccess") {
      await Order.findByIdAndUpdate(plan.orderId, { accessRevoked: false });

      const installments = plan.installments as unknown as InstallmentSubdoc[];
      const allPaid = installments.every((i) => i.status === "paid");
      plan.status = allPaid ? "completed" : "active";
      await plan.save();

      await SalesAuditLog.create({
        actorId: user!._id,
        action: "PLAN_EDITED",
        orderId: plan.orderId,
        installmentPlanId: plan._id,
        meta: { reason: reason || null, accessRestored: true },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
