import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { InstallmentPlan } from "@/server/models";
import { razorpay } from "@/server/integrations/razorpay";
import { markInstallmentPaid } from "@/server/sales/markInstallmentPaid";
import { assertCanAccessPlan, toSalesActor } from "@/server/sales/scope";

interface InstallmentSubdoc {
  seq: number;
  status: string;
  paymentLinkId: string | null;
}

// The Phase 2 stopgap for "did the student pay yet" before Phase 3's webhook
// exists (salesimplementation.md). Queries Razorpay directly and, if it
// reports the link paid, runs the exact same markInstallmentPaid logic the
// webhook will call — so Phase 3 doesn't duplicate this.
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const installmentPlanId = req.nextUrl.searchParams.get("installmentPlanId");
    const seqParam = req.nextUrl.searchParams.get("seq");
    if (!installmentPlanId || !seqParam) {
      return NextResponse.json({ message: "installmentPlanId and seq are required" }, { status: 400 });
    }
    const seq = Number(seqParam);

    await connectDB();

    const plan = await InstallmentPlan.findById(installmentPlanId).populate("salesPersonId", "reportsTo");
    if (!plan) return NextResponse.json({ message: "Installment plan not found" }, { status: 404 });

    if (!assertCanAccessPlan(toSalesActor(user!), plan.salesPersonId as { _id: unknown; reportsTo?: unknown })) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const installment = (plan.installments as unknown as InstallmentSubdoc[]).find((i) => i.seq === seq);
    if (!installment) return NextResponse.json({ message: "Installment not found" }, { status: 404 });

    if (installment.status === "paid") {
      return NextResponse.json({ status: "paid" });
    }
    if (!installment.paymentLinkId) {
      // No sales-generated Payment Link exists for this installment (only the
      // first installment ever gets one at enrollment — later ones are meant
      // to be paid by the student directly from their own dashboard via a
      // Razorpay Order, which marks itself paid in real time). There's
      // nothing to poll Razorpay for here; this isn't "still pending" in the
      // sense of a link going unpaid, it just was never sales-linked at all.
      return NextResponse.json({ status: installment.status, hasPaymentLink: false });
    }

    const link = await razorpay.paymentLink.fetch(installment.paymentLinkId);

    if (link.status === "paid") {
      const paymentId = (link.payments as unknown as { payment_id?: string } | null)?.payment_id || link.id;
      const result = await markInstallmentPaid({ installmentPlanId, seq, paymentId });
      return NextResponse.json({ status: "paid", studentCredentials: result.studentCredentials || null });
    }

    return NextResponse.json({ status: installment.status, razorpayStatus: link.status, hasPaymentLink: true });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
