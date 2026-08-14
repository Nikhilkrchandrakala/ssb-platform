import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { Order, AdminUser } from "@/server/models";
import { reconcilePendingSalesPayments } from "@/server/sales/reconcile";

interface AdminUserLean {
  _id: unknown;
  name?: string;
  email: string;
  phone?: string;
  salesRole?: "executive" | "head" | null;
  reportsTo?: unknown;
}

/**
 * GET /api/sales/teamStudents (salesimplementation.md Phase 4).
 *
 * For a Sales Head: a rollup of their own + their direct reports' enrolled
 * students. For the owner: everyone. A plain executive gets 403 — they have
 * no "team", only `/api/sales/myStudents`. Also returns the `reports` roster
 * itself (not just orders) so the dashboard's "My Team" panel doesn't need a
 * second round-trip.
 *
 * Optional `?executiveId=` filters to one report; a head can only filter to
 * one of their *own* direct reports (or themselves) — never an arbitrary id.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const isOwner = user!.role === "owner";
  const isHead = user!.salesRole === "head";
  if (!isOwner && !isHead) {
    return NextResponse.json({ message: "Forbidden — only a Sales Head or the owner has a team view" }, { status: 403 });
  }

  await connectDB();

  // The owner's own account can independently carry `permissions: ["sales"]`
  // (e.g. from being marked super_admin, or from directly using the Enroll
  // flow themselves) — exclude it here so the owner never shows up as their
  // own "team member" in this roster. Their own sales activity, if any, is
  // still visible via myStudents, same as any other sales-permission account.
  const reports = isOwner
    ? await AdminUser.find({ permissions: "sales", _id: { $ne: user!._id } })
        .select("name email phone salesRole reportsTo")
        .lean<AdminUserLean[]>()
    : await AdminUser.find({ reportsTo: user!._id }).select("name email phone salesRole reportsTo").lean<AdminUserLean[]>();

  const inScopeIds = isOwner ? null : [String(user!._id), ...reports.map((r) => String(r._id))];

  const executiveFilter = req.nextUrl.searchParams.get("executiveId");
  let salesPersonFilter: Record<string, unknown>;
  if (executiveFilter) {
    if (!isOwner && !inScopeIds!.includes(executiveFilter)) {
      return NextResponse.json({ message: "Forbidden — that account isn't one of your direct reports" }, { status: 403 });
    }
    salesPersonFilter = { salesPersonId: executiveFilter };
  } else {
    salesPersonFilter = isOwner ? {} : { salesPersonId: { $in: inScopeIds } };
  }

  const orderQuery = { bookingMethod: "sales", ...salesPersonFilter };
  const orders = await Order.find(orderQuery)
    .populate("userId", "name email")
    .populate("slotId", "title batchNo startTime isFullCourse")
    .populate("installmentPlanId")
    .populate("salesPersonId", "name email")
    .sort({ createdAt: -1 })
    .lean();

  const reconciled = await reconcilePendingSalesPayments(orders);
  if (reconciled === 0) {
    return NextResponse.json({ scope: isOwner ? "owner" : "head", reports, orders });
  }

  const freshOrders = await Order.find(orderQuery)
    .populate("userId", "name email")
    .populate("slotId", "title batchNo startTime isFullCourse")
    .populate("installmentPlanId")
    .populate("salesPersonId", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ scope: isOwner ? "owner" : "head", reports, orders: freshOrders });
}
