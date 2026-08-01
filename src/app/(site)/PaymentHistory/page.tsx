import { requireSiteUser } from "@/server/auth";
import { connectDB } from "@/server/db";
import { Order } from "@/server/models";
import PaymentHistoryClient, { type PaymentHistoryOrder } from "./PaymentHistoryClient";

export const metadata = {
  title: "Payment History | SSB with ISV",
};

// Server-side auth guard — replaces legacy AuthRoute's client-side localStorage
// JWT check. No session -> redirect before any HTML is sent; a staff session
// (owner/admin/assessor/franchise) is redirected to the admin panel instead
// of rendering this candidate-only payment history for them.
export default async function PaymentHistoryPage() {
  const user = await requireSiteUser();

  await connectDB();

  // There is no separate Payment model — Razorpay orderId/paymentId live
  // directly on Order (never on a nonexistent `courseId` field). Payment
  // History surfaces every Order document for this user, any status,
  // as the transaction ledger; slotId is populated the same way the
  // bug-fixed /api/myOrders and /api/checkPurchase/[courseId] routes do.
  const orders = await Order.find({ userId: String(user._id) })
    .populate("slotId", "title price startTime endTime batchNo isFullCourse")
    .sort({ createdAt: -1 })
    .lean();

  return <PaymentHistoryClient orders={JSON.parse(JSON.stringify(orders)) as PaymentHistoryOrder[]} />;
}
