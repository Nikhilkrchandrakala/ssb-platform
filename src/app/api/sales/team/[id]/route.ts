import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission, canManageSalesAccount } from "@/server/adminAccess";
import { AdminUser } from "@/server/models";
import { toSalesActor } from "@/server/sales/scope";

/**
 * PATCH /api/sales/team/:id (salesimplementation.md Phase 4).
 *
 * Edits one of the caller's own direct-report executives — name/phone/a
 * password reset only, never `email`/`salesRole`/`reportsTo`, and never a
 * role/permission change (that stays in `RolesManagement`, owner-only).
 * No delete here at all, matching the Phase 1 matrix — deletion stays
 * exclusively in the existing owner-only `RolesManagement` route.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();

  const target = await AdminUser.findById(id);
  if (!target) return NextResponse.json({ message: "Account not found" }, { status: 404 });

  const canManage = canManageSalesAccount(toSalesActor(user!), {
    reportsTo: target.reportsTo ? String(target.reportsTo) : null,
  });
  if (!canManage) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (typeof body.name === "string") target.name = body.name.trim();
  if (typeof body.phone === "string") target.phone = body.phone.trim();
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 6) {
      return NextResponse.json({ message: "password must be at least 6 characters" }, { status: 400 });
    }
    target.password = body.password;
  }
  await target.save();

  return NextResponse.json({ id: target._id, name: target.name, email: target.email, phone: target.phone });
}
