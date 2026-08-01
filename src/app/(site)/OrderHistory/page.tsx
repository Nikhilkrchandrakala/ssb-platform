import { requireSiteUser } from "@/server/auth";
import { connectDB } from "@/server/db";
import { Order } from "@/server/models";
import OrderHistoryClient, { type OrderHistoryOrder } from "./OrderHistoryClient";

export const metadata = {
  title: "Order History | SSB with ISV",
};

// Server-side auth guard — replaces legacy AuthRoute's client-side localStorage
// JWT check. No session -> redirect before any HTML is sent; a staff session
// (owner/admin/assessor/franchise) is redirected to the admin panel instead
// of rendering this candidate-only order history for them.
export default async function OrderHistoryPage() {
  const user = await requireSiteUser();

  await connectDB();

  // Unlike /api/myOrders (paid-only, used for "my active batches"), Order
  // History intentionally shows every order attempt for this user regardless
  // of status — Order never had a `courseId` field, only `slotId`, so it's
  // populated here exactly as the bug-fixed API routes do.
  const orders = await Order.find({ userId: String(user._id) })
    .populate("slotId", "title price startTime endTime batchNo isFullCourse")
    .sort({ createdAt: -1 })
    .lean();

  return <OrderHistoryClient orders={JSON.parse(JSON.stringify(orders)) as OrderHistoryOrder[]} />;
}
