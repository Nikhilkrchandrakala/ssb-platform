import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User, AdminUser, Franchise } from "@/server/models";

const ROLE_LEVELS: Record<string, number> = {
  owner: 5,
  super_admin: 4,
  admin: 3,
  franchise: 2,
  assessor: 2,
  student: 1,
};

interface RoleDoc {
  role?: string;
  permissions?: string[];
}

function getEffectiveRole(uDoc: RoleDoc | null, aDoc: RoleDoc | null, fDoc: RoleDoc | null, uEmail?: string | null) {
  const emailLower = uEmail ? uEmail.toLowerCase() : "";
  if (aDoc) {
    if (aDoc.role === "owner") return "owner";
    const isSuper =
      emailLower === "info@ssbwithisv.in" ||
      emailLower === "nkc@ssbwithisv.in" ||
      (aDoc.permissions && aDoc.permissions.includes("super_admin"));
    return isSuper ? "super_admin" : "admin";
  }
  if (fDoc) return "franchise";
  if (uDoc) {
    if (uDoc.role === "owner") return "owner";
    if (uDoc.role === "admin") {
      const isSuper =
        emailLower === "info@ssbwithisv.in" ||
        emailLower === "nkc@ssbwithisv.in" ||
        (uDoc.permissions && uDoc.permissions.includes("super_admin"));
      return isSuper ? "super_admin" : "admin";
    }
    return uDoc.role || "student";
  }
  return "student";
}

/**
 * DELETE /api/admin/users/:id
 * Permanently deletes the user from AdminUser, Franchise, and User collections.
 * Ported from legacy rolesRoutes.js.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const isValidId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidId) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
    }

    const userDoc = await User.findById(id);
    const adminDoc = await AdminUser.findById(id);
    const franchiseDoc = await Franchise.findById(id);

    let email = "";
    if (userDoc) email = userDoc.email;
    else if (adminDoc) email = adminDoc.email;
    else if (franchiseDoc) email = franchiseDoc.email;

    const targetLevel = getEffectiveRole(userDoc, adminDoc, franchiseDoc, email);

    if (targetLevel === "owner" || (email && email.toLowerCase() === "nkc@ssbwithisv.in")) {
      return NextResponse.json({ error: "This user is protected and cannot be deleted." }, { status: 403 });
    }

    const currentUserId = String(currentUser._id || currentUser.id || "");
    if (currentUserId) {
      const loggedInAdmin = await AdminUser.findById(currentUserId);
      const loggedInFranchise = await Franchise.findById(currentUserId);
      const loggedInUser = await User.findById(currentUserId);

      let loggedInUserEmail = "";
      if (loggedInAdmin) loggedInUserEmail = loggedInAdmin.email;
      else if (loggedInFranchise) loggedInUserEmail = loggedInFranchise.email;
      else if (loggedInUser) loggedInUserEmail = loggedInUser.email;

      if (currentUserId === id || (loggedInUserEmail && email && loggedInUserEmail.toLowerCase() === email.toLowerCase())) {
        return NextResponse.json({ error: "You cannot delete your own account." }, { status: 403 });
      }

      const loggedInLevel = getEffectiveRole(loggedInUser, loggedInAdmin, loggedInFranchise, loggedInUserEmail);
      const loggedInLevelNum = ROLE_LEVELS[loggedInLevel] || 1;
      const targetLevelNum = ROLE_LEVELS[targetLevel] || 1;

      const loggedInEmailLower = loggedInUserEmail ? loggedInUserEmail.toLowerCase() : "";

      if (loggedInEmailLower !== "nkc@ssbwithisv.in") {
        if (loggedInLevelNum <= targetLevelNum) {
          return NextResponse.json({ error: `You do not have permission to delete a user at level: ${targetLevel}.` }, { status: 403 });
        }
      }
    }

    await AdminUser.findByIdAndDelete(id);
    await Franchise.findByIdAndDelete(id);
    await User.findByIdAndDelete(id);

    if (email) {
      const emailLower = email.toLowerCase();
      await AdminUser.deleteMany({ email: emailLower });
      await Franchise.deleteMany({ email: emailLower });
      await User.deleteMany({ email: emailLower });
    }

    return NextResponse.json({ status: "ok", message: "User account permanently removed from the system" });
  } catch (error) {
    console.error("DELETE /api/admin/users/:id Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete user" }, { status: 500 });
  }
}
