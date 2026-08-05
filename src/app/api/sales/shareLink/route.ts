import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { InstallmentPlan, SalesAuditLog } from "@/server/models";
import { sendRegistrationPaymentEmail, sendInstallmentPaymentEmail } from "@/server/integrations/msg91";
import { assertCanAccessPlan, toSalesActor } from "@/server/sales/scope";

interface InstallmentSubdoc {
  seq: number;
  amount: number;
  dueDate: string | Date;
  paymentLinkUrl: string | null;
}

// Sends a given installment's Razorpay Payment Link via email and/or SMS
// (salesimplementation.md Phase 2). SMS is stubbed/no-op — MSG91's
// transactional API + a DLT-approved template aren't provisioned yet
// (Open Decision #5). Email uses one of two MSG91 templates depending on
// whether this is the first payment (registration) or a later installment —
// different enough in tone/content that one shared template read as generic.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { installmentPlanId, seq, channels } = await req.json();
    const requestedChannels: string[] = Array.isArray(channels) && channels.length > 0 ? channels : ["email"];

    await connectDB();

    const plan = await InstallmentPlan.findById(installmentPlanId)
      .populate("studentId", "name email")
      .populate("salesPersonId", "reportsTo")
      .populate({ path: "orderId", populate: { path: "slotId", select: "title batchNo startTime" } });
    if (!plan) return NextResponse.json({ message: "Installment plan not found" }, { status: 404 });

    if (!assertCanAccessPlan(toSalesActor(user!), plan.salesPersonId as { _id: unknown; reportsTo?: unknown })) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const installment = (plan.installments as unknown as InstallmentSubdoc[]).find((i) => i.seq === seq);
    if (!installment) return NextResponse.json({ message: "Installment not found" }, { status: 404 });
    if (!installment.paymentLinkUrl) {
      return NextResponse.json({ message: "No payment link has been generated for this installment yet" }, { status: 400 });
    }

    const student = plan.studentId as unknown as { name: string; email: string };
    const order = plan.orderId as unknown as { slotId?: { title?: string; batchNo?: string; startTime?: string } } | null;
    const slot = order?.slotId;
    const results: Record<string, boolean> = {};

    if (requestedChannels.includes("email")) {
      const formatDate = (d: string | Date) =>
        new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      const mail =
        seq === 1
          ? await sendRegistrationPaymentEmail({
              to: student.email,
              name: student.name,
              courseName: slot?.title || "—",
              batchNo: slot?.batchNo || "—",
              startDate: slot?.startTime ? formatDate(slot.startTime) : "—",
              amount: installment.amount,
              link: installment.paymentLinkUrl,
            })
          : await sendInstallmentPaymentEmail({
              to: student.email,
              name: student.name,
              courseName: slot?.title || "—",
              batchNo: slot?.batchNo || "—",
              installmentNumber: seq,
              totalInstallments: (plan.installments as unknown as InstallmentSubdoc[]).length,
              dueDate: formatDate(installment.dueDate),
              amount: installment.amount,
              link: installment.paymentLinkUrl,
            });
      results.email = mail.delivered;
    }

    if (requestedChannels.includes("sms")) {
      // Stubbed no-op until MSG91 transactional SMS + a DLT-approved template
      // are provisioned (Open Decision #5) — msg91.ts only wraps the OTP-widget API today.
      results.sms = false;
    }

    await SalesAuditLog.create({
      actorId: user!._id,
      action: "LINK_GENERATED",
      orderId: plan.orderId,
      installmentPlanId: plan._id,
      meta: { seq, channels: requestedChannels, results },
    });

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
