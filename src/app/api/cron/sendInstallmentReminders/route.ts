import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { InstallmentPlan, SalesAuditLog } from "@/server/models";
import { sendInstallmentPaymentEmail } from "@/server/integrations/msg91";
import { isValidCronRequest } from "@/server/sales/cronAuth";

// Force the Node.js runtime — this route is invoked by curl from the VPS
// crontab, not a browser; no reason to run it on the Edge runtime.
export const runtime = "nodejs";

interface InstallmentSubdoc {
  seq: number;
  amount: number;
  dueDate: Date;
  status: string;
  reminderSentAt: Date | null;
  paymentLinkUrl: string | null;
}

interface PopulatedStudent {
  name?: string;
  email?: string;
}

interface PopulatedOrder {
  slotId?: { title?: string; batchNo?: string };
}

/**
 * POST /api/cron/sendInstallmentReminders (salesimplementation.md Phase 5).
 *
 * Run daily via the VPS OS crontab (see CRON_SECRET's comment in .env.local
 * for the exact crontab line). Emails (and, once MSG91's transactional API +
 * a DLT template are provisioned — Open Decision #5 — SMS's) every pending
 * installment landing exactly 3 days out, then stamps `reminderSentAt` so a
 * second run the same day (or any day after) is a no-op for that
 * installment — each installment only ever gets one reminder, not one per
 * cron run.
 *
 * Was on the legacy Gmail/nodemailer sender (silently broken — see
 * src/server/integrations/email.ts) until 2026-09-04, and unconditionally
 * stamped `reminderSentAt` regardless of whether the send actually
 * succeeded, so a failed send was never retried. Now uses the same MSG91
 * template as the sales team's "share payment link" flow
 * (sendInstallmentPaymentEmail, api/sales/shareLink/route.ts) and only marks
 * an installment reminded once MSG91 confirms delivery.
 */
export async function POST(req: NextRequest) {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const target = new Date(now);
  target.setDate(target.getDate() + 3);
  const windowStart = new Date(target);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(target);
  windowEnd.setHours(23, 59, 59, 999);

  const plans = await InstallmentPlan.find({ status: "active" })
    .populate("studentId", "name email")
    .populate({ path: "orderId", populate: { path: "slotId", select: "title batchNo" } });

  const formatDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const dashboardLink = `${(process.env.CLIENT_URL || "https://ssbwithisv.in").replace(/\/$/, "")}/ProfileDashboard`;

  let remindersSent = 0;
  let remindersFailed = 0;
  for (const plan of plans) {
    let changed = false;
    const order = plan.orderId as unknown as PopulatedOrder | null;
    const slot = order?.slotId;
    const installments = plan.installments as unknown as InstallmentSubdoc[];

    for (const inst of installments) {
      if (inst.status !== "pending" || inst.reminderSentAt) continue;
      const due = new Date(inst.dueDate);
      if (due < windowStart || due > windowEnd) continue;

      const student = plan.studentId as unknown as PopulatedStudent;
      if (!student?.email) continue;

      const { delivered } = await sendInstallmentPaymentEmail({
        to: student.email,
        name: student.name || "there",
        courseName: slot?.title || "—",
        batchNo: slot?.batchNo || "—",
        installmentNumber: inst.seq,
        totalInstallments: installments.length,
        dueDate: formatDate(due),
        amount: inst.amount,
        link: inst.paymentLinkUrl || dashboardLink,
      });

      if (!delivered) {
        remindersFailed++;
        continue; // leave reminderSentAt unset so the next daily run retries it
      }

      inst.reminderSentAt = now;
      changed = true;
      remindersSent++;

      await SalesAuditLog.create({
        actorId: plan.salesPersonId,
        action: "REMINDER_SENT",
        orderId: plan.orderId,
        installmentPlanId: plan._id,
        meta: { seq: inst.seq, dueDate: inst.dueDate, amount: inst.amount },
      });
    }
    if (changed) await plan.save();
  }

  return NextResponse.json({ remindersSent, remindersFailed });
}
