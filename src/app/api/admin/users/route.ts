import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User, AdminUser, Franchise } from "@/server/models";

/**
 * GET /api/admin/users
 * Returns a normalized list of all users from all collections (users, adminusers, franchises).
 * Ported from legacy rolesRoutes.js.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(user, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const userDetails = await User.find().select("-password").lean();
    const adminUsers = await AdminUser.find().select("-password").lean();
    const franchises = await Franchise.find().select("-password").lean();

    const adminEmails = new Set(adminUsers.map((au) => (au.email || "").toLowerCase()));
    const franchiseEmails = new Set(franchises.map((f) => (f.email || "").toLowerCase()));

    const resultList: Record<string, unknown>[] = [];

    adminUsers.forEach((au) => {
      const matchedUser = userDetails.find((ud) => (ud.email || "").toLowerCase() === (au.email || "").toLowerCase());
      resultList.push({
        id: au._id,
        name: au.name || (matchedUser ? matchedUser.name : "System Admin"),
        email: au.email,
        phone: au.phone || (matchedUser ? matchedUser.phone : "N/A"),
        role: au.role === "owner" ? "owner" : "admin",
        sourceCollection: "adminusers",
        permissions: au.permissions || [],
        assessorType: null,
        salesRole: au.salesRole || null,
        reportsTo: au.reportsTo ? String(au.reportsTo) : null,
        createdAt: au.createdAt,
      });
    });

    franchises.forEach((f) => {
      resultList.push({
        id: f._id,
        name: f.name || "Franchise Partner",
        email: f.email,
        phone: f.phone || "N/A",
        role: "franchise",
        commissionPercent: f.commissionPercent,
        referralCode: f.referralCode,
        sourceCollection: "franchises",
        assessorType: null,
        createdAt: f.createdAt,
      });
    });

    userDetails.forEach((u) => {
      const emailLower = (u.email || "").toLowerCase();
      if (!adminEmails.has(emailLower) && !franchiseEmails.has(emailLower)) {
        if (u.role === "assessor" || u.role === "admin" || u.role === "franchise" || u.role === "owner") {
          resultList.push({
            id: u._id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role,
            assessorType: u.assessorType || null,
            sourceCollection: "users",
            createdAt: u.createdAt,
          });
        }
      }
    });

    resultList.sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime());

    return NextResponse.json({ status: "ok", users: resultList });
  } catch (error) {
    console.error("GET /api/admin/users Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch users" }, { status: 500 });
  }
}
