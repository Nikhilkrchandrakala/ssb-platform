import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { Order } from "@/server/models";
import { reconcilePendingSalesPayments } from "@/server/sales/reconcile";

/**
 * GET /api/sales/myStudents (salesimplementation.md Phase 4).
 *
 * The caller's own enrolled students/orders — open to all three sales tiers
 * (link generation isn't tier-restricted per the Phase 1 matrix), always
 * scoped to `salesPersonId === caller`. "Everyone I supervise" is
 * `/api/sales/teamStudents`, not this route.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();

  const query = { bookingMethod: "sales", salesPersonId: user!._id };
  const orders = await Order.find(query)
    .populate("userId", "name email")
    .populate("slotId", "title batchNo startTime isFullCourse")
    .populate("installmentPlanId")
    .sort({ createdAt: -1 })
    .lean();

  const reconciled = await reconcilePendingSalesPayments(orders);
  if (reconciled === 0) return NextResponse.json({ orders });

  const freshOrders = await Order.find(query)
    .populate("userId", "name email")
    .populate("slotId", "title batchNo startTime isFullCourse")
    .populate("installmentPlanId")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ orders: freshOrders });
}
