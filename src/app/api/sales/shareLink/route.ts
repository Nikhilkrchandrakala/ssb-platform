import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { InstallmentPlan, SalesAuditLog } from "@/server/models";
import { sendMail } from "@/server/integrations/email";
import { assertCanAccessPlan, toSalesActor } from "@/server/sales/scope";

interface InstallmentSubdoc {
  seq: number;
  paymentLinkUrl: string | null;
}

// Sends a given installment's Razorpay Payment Link via email and/or SMS
// (salesimplementation.md Phase 2). SMS is stubbed/no-op — MSG91's
// transactional API + a DLT-approved template aren't provisioned yet
// (Open Decision #5); email works today via the existing email.ts wrapper.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { installmentPlanId, seq, channels } = await req.json();
    const requestedChannels: string[] = Array.isArray(channels) && channels.length > 0 ? channels : ["email"];

    await connectDB();

    const plan = await InstallmentPlan.findById(installmentPlanId)
      .populate("studentId", "name email")
      .populate("salesPersonId", "reportsTo");
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
    const results: Record<string, boolean> = {};

    if (requestedChannels.includes("email")) {
      const mail = await sendMail({
        to: student.email,
        subject: "Your SSB with ISV payment link",
        html: `<p>Hi ${student.name},</p><p>Please complete your payment here: <a href="${installment.paymentLinkUrl}">${installment.paymentLinkUrl}</a></p>`,
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
