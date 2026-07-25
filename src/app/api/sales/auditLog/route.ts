import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { SalesAuditLog, AdminUser } from "@/server/models";

/**
 * GET /api/sales/auditLog (salesimplementation.md Phase 6, stretch).
 *
 * A read-only viewer over `SalesAuditLog`, scoped the same way as
 * `teamStudents`: an executive sees only entries they personally acted on;
 * a head sees their own + their direct reports'; the owner sees everyone's.
 * Entries are attributed by `actorId` (who did it), not `salesPersonId` on
 * the underlying plan — the two usually coincide, except the two automated
 * cron routes, which attribute to the plan's owning sales person since
 * there's no human actor for those.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  await connectDB();

  const isOwner = user!.role === "owner";
  const isHead = user!.salesRole === "head";

  let actorFilter: Record<string, unknown> = { actorId: user!._id };
  if (isOwner) {
    actorFilter = {};
  } else if (isHead) {
    const reports = await AdminUser.find({ reportsTo: user!._id }).select("_id").lean<{ _id: unknown }[]>();
    actorFilter = { actorId: { $in: [user!._id, ...reports.map((r) => r._id)] } };
  }

  const entries = await SalesAuditLog.find(actorFilter)
    .populate("actorId", "name email")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json({ entries });
}
