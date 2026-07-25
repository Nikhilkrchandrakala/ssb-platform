import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User } from "@/server/models";

/**
 * GET /api/admin/all-users
 * Fetches every user account in the system for the comprehensive dashboard.
 * Ported from legacy allUsersRoutes.js.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(user, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const search = req.nextUrl.searchParams.get("search");
    const roleFilter = req.nextUrl.searchParams.get("roleFilter");

    const query: Record<string, unknown> = {};

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$and = [{ $or: [{ name: regex }, { email: regex }, { phone: regex }] }];
    }

    if (roleFilter && roleFilter !== "all") {
      query.role = roleFilter;
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ status: "ok", users });
  } catch (error) {
    console.error("GET /api/admin/all-users error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch users" }, { status: 500 });
  }
}
