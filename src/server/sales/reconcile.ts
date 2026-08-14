import { razorpay } from "@/server/integrations/razorpay";
import { markInstallmentPaid } from "@/server/sales/markInstallmentPaid";

interface InstallmentLike {
  seq: number;
  status: string;
  paymentLinkId?: string | null;
}

interface OrderLike {
  installmentPlanId?: {
    _id: unknown;
    status?: string;
    installments?: InstallmentLike[];
  } | null;
}

/**
 * Confirms every pending, sales-linked installment directly against Razorpay
 * before the Sales dashboard renders. Only the *first* installment is ever
 * paid via a sales-generated Payment Link on a Razorpay-hosted page outside
 * this app — later installments sync instantly via the student dashboard's
 * own verifyPayment call. That first payment's status only otherwise updates
 * via the Razorpay webhook (`/api/webhooks/razorpay`), which requires someone
 * to have registered it in the Razorpay dashboard — easy to forget, and this
 * app has no way to confirm from code whether that was ever done. Running
 * this opportunistically on every myStudents/teamStudents load means a paid
 * order shows up here even if that webhook was never wired up.
 *
 * Returns how many installments were newly marked paid, so callers can skip
 * a redundant re-query when there's nothing to refresh.
 */
export async function reconcilePendingSalesPayments(orders: OrderLike[]): Promise<number> {
  const pending = orders
    .map((o) => o.installmentPlanId)
    .filter((plan): plan is NonNullable<typeof plan> => !!plan && plan.status === "active")
    .flatMap((plan) =>
      (plan.installments || [])
        .filter((i) => i.status !== "paid" && i.paymentLinkId)
        .map((i) => ({ planId: String(plan._id), seq: i.seq, paymentLinkId: i.paymentLinkId as string }))
    );

  if (pending.length === 0) return 0;

  const results = await Promise.all(
    pending.map(async ({ planId, seq, paymentLinkId }) => {
      try {
        const link = await razorpay.paymentLink.fetch(paymentLinkId);
        if (link.status !== "paid") return false;
        const paymentId = (link.payments as unknown as { payment_id?: string } | null)?.payment_id || link.id;
        await markInstallmentPaid({ installmentPlanId: planId, seq, paymentId });
        return true;
      } catch (err) {
        console.error("[sales/reconcile] failed for plan", planId, "seq", seq, err);
        return false;
      }
    })
  );

  return results.filter(Boolean).length;
}
