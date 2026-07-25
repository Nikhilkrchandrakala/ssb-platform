import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { AdminUser } from "@/server/models";

/**
 * POST /api/sales/team/createExecutive (salesimplementation.md Phase 4).
 *
 * A Sales Head's narrower equivalent of the owner-only `RolesManagement`
 * page — creates a new Sales Executive `AdminUser` reporting to the caller.
 * `reportsTo` is forced server-side to the caller's own id, never
 * client-supplied. The owner may also call this (they can do anything a head
 * can, plus more via `RolesManagement`); a plain executive cannot.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!hasAdminPermission(user, "sales")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  if (user!.role !== "owner" && user!.salesRole !== "head") {
    return NextResponse.json({ message: "Forbidden — only a Sales Head or the owner can add an executive" }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = body.phone ? String(body.phone).trim() : undefined;
  const password = String(body.password || "");

  if (!name || !email) {
    return NextResponse.json({ message: "name and email are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ message: "password must be at least 6 characters" }, { status: 400 });
  }

  await connectDB();

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    return NextResponse.json({ message: "An account with this email already exists" }, { status: 409 });
  }

  const created = await AdminUser.create({
    name,
    email,
    phone,
    password,
    role: "admin",
    permissions: ["sales"],
    salesRole: "executive",
    reportsTo: user!._id,
  });

  return NextResponse.json({ id: created._id, name: created.name, email: created.email }, { status: 201 });
}
