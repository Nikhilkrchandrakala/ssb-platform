import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { InstallmentPlan, SalesAuditLog } from "@/server/models";
import { sendMail } from "@/server/integrations/email";
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
}

interface PopulatedStudent {
  name?: string;
  email?: string;
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

  const plans = await InstallmentPlan.find({ status: "active" }).populate("studentId", "name email");

  let remindersSent = 0;
  for (const plan of plans) {
    let changed = false;
    for (const inst of plan.installments as unknown as InstallmentSubdoc[]) {
      if (inst.status !== "pending" || inst.reminderSentAt) continue;
      const due = new Date(inst.dueDate);
      if (due < windowStart || due > windowEnd) continue;

      const student = plan.studentId as unknown as PopulatedStudent;
      if (student?.email) {
        await sendMail({
          to: student.email,
          subject: "Your SSB with ISV installment is due in 3 days",
          html: `<p>Hi ${student.name || "there"},</p><p>A reminder that your installment of ₹${inst.amount.toFixed(2)} is due on ${due.toDateString()}.</p><p>Please complete the payment from your dashboard to avoid your course access being paused.</p>`,
        });
      }
      // SMS: stubbed no-op until MSG91's transactional API + a DLT-approved
      // template are provisioned (Open Decision #5), same as Phase 2's shareLink.

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

  return NextResponse.json({ remindersSent });
}
