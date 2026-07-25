import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User, AdminUser, Franchise } from "@/server/models";

function generateReferralCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "REF";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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
 * PUT /api/admin/users/:id/role
 * Changes the role of a user and handles the cross-collection mapping safely.
 * Ported from legacy rolesRoutes.js.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { role, commissionPercent, phone, password, name: bodyName, permissions, assessorType, salesRole, reportsTo } = body;

    const allowedRoles = ["student", "assessor", "admin", "franchise"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    // Sales Executive/Head is not a separate top-level `role` (per Phase 1's
    // Open Decision #1) — it's an `admin` account carrying `permissions: ["sales"]`
    // plus `salesRole`/`reportsTo`. Validate the hierarchy here since this is the
    // only place staff accounts get created/edited from the UI.
    const allowedSalesRoles = ["executive", "head", null, undefined];
    if (role === "admin" && !allowedSalesRoles.includes(salesRole)) {
      return NextResponse.json({ error: "Invalid salesRole specified" }, { status: 400 });
    }
    if (role === "admin" && salesRole === "executive") {
      if (!reportsTo) {
        return NextResponse.json({ error: "A Sales Executive must report to an existing Sales Head" }, { status: 400 });
      }
      const headDoc = await AdminUser.findById(reportsTo);
      if (!headDoc || headDoc.salesRole !== "head") {
        return NextResponse.json({ error: "reportsTo must be the id of an existing Sales Head" }, { status: 400 });
      }
    }

    const isValidId = /^[0-9a-fA-F]{24}$/.test(id);

    let userDoc = null;
    let adminDoc = null;
    let franchiseDoc = null;

    if (isValidId) {
      userDoc = await User.findById(id);
      adminDoc = await AdminUser.findById(id);
      franchiseDoc = await Franchise.findById(id);
    }

    let email = "";
    let name = "";
    let phoneVal = "";
    let passwordHash = "";

    if (userDoc) {
      email = userDoc.email;
      name = bodyName || userDoc.name || "";
      phoneVal = phone !== undefined ? phone : userDoc.phone || "";
      passwordHash = userDoc.password;
    } else if (adminDoc) {
      email = adminDoc.email;
      name = bodyName || adminDoc.name || "System Admin";
      phoneVal = phone !== undefined ? phone : adminDoc.phone || "";
      passwordHash = adminDoc.password;
    } else if (franchiseDoc) {
      email = franchiseDoc.email;
      name = bodyName || franchiseDoc.name || "Franchise Partner";
      phoneVal = phone !== undefined ? phone : franchiseDoc.phone || "";
      passwordHash = franchiseDoc.password;
    }

    if (!email) {
      const queryEmail = body.email;
      if (queryEmail) {
        userDoc = await User.findOne({ email: queryEmail.toLowerCase() });
        adminDoc = await AdminUser.findOne({ email: queryEmail.toLowerCase() });
        franchiseDoc = await Franchise.findOne({ email: queryEmail.toLowerCase() });

        if (userDoc) {
          email = userDoc.email;
          name = bodyName || userDoc.name || "";
          phoneVal = phone !== undefined ? phone : userDoc.phone || "";
          passwordHash = userDoc.password;
        } else if (adminDoc) {
          email = adminDoc.email;
          name = bodyName || adminDoc.name || "System Admin";
          phoneVal = phone !== undefined ? phone : adminDoc.phone || "";
          passwordHash = adminDoc.password;
        } else if (franchiseDoc) {
          email = franchiseDoc.email;
          name = bodyName || franchiseDoc.name || "Franchise Partner";
          phoneVal = phone !== undefined ? phone : franchiseDoc.phone || "";
          passwordHash = franchiseDoc.password;
        } else {
          email = queryEmail.toLowerCase();
          name = bodyName || "User";
          phoneVal = phone || "0000000000";
          passwordHash = "";
        }
      }
    }

    if (!email) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    const emailLower = email.toLowerCase();
    const targetLevelInitial = getEffectiveRole(userDoc, adminDoc, franchiseDoc, email);

    if (targetLevelInitial === "owner" || emailLower === "nkc@ssbwithisv.in") {
      return NextResponse.json({ error: "Owner / Protected account cannot be edited." }, { status: 403 });
    }

    // Prevent editing own account, and enforce role hierarchy
    const currentUserId = String(currentUser._id || currentUser.id || "");
    if (currentUserId) {
      const isSelf = id === currentUserId;

      const loggedInAdmin = await AdminUser.findById(currentUserId);
      const loggedInFranchise = await Franchise.findById(currentUserId);
      const loggedInUser = await User.findById(currentUserId);

      let loggedInUserEmail = "";
      if (loggedInAdmin) loggedInUserEmail = loggedInAdmin.email;
      else if (loggedInFranchise) loggedInUserEmail = loggedInFranchise.email;
      else if (loggedInUser) loggedInUserEmail = loggedInUser.email;

      const isSelfEmail = loggedInUserEmail && email && loggedInUserEmail.toLowerCase() === email.toLowerCase();

      if (isSelf || isSelfEmail) {
        return NextResponse.json({ error: "You cannot edit your own account." }, { status: 403 });
      }

      const loggedInLevel = getEffectiveRole(loggedInUser, loggedInAdmin, loggedInFranchise, loggedInUserEmail);
      const targetLevel = getEffectiveRole(userDoc, adminDoc, franchiseDoc, email);
      const loggedInLevelNum = ROLE_LEVELS[loggedInLevel] || 1;
      const targetLevelNum = ROLE_LEVELS[targetLevel] || 1;

      const reqIsSuper = role === "admin" && permissions && permissions.includes("super_admin");
      const reqLevel = reqIsSuper ? "super_admin" : role;
      const reqLevelNum = ROLE_LEVELS[reqLevel] || 1;

      if (loggedInLevel !== "super_admin") {
        const isNewUser = !userDoc && !adminDoc && !franchiseDoc;
        if (!isNewUser && loggedInLevelNum <= targetLevelNum) {
          return NextResponse.json({ error: `You do not have permission to edit a user at level: ${targetLevel}.` }, { status: 403 });
        }

        if (loggedInLevelNum <= reqLevelNum) {
          return NextResponse.json({ error: `You do not have permission to configure a role at level: ${reqLevel}.` }, { status: 403 });
        }
      }
    }

    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Guard against orphaning executives if an existing Head is demoted, reassigned
    // to a different role entirely, or deleted-and-recreated-elsewhere by this call.
    if (adminDoc && adminDoc.salesRole === "head" && !(role === "admin" && salesRole === "head")) {
      const reportCount = await AdminUser.countDocuments({ reportsTo: adminDoc._id });
      if (reportCount > 0) {
        return NextResponse.json(
          { error: `Cannot change this account's role — ${reportCount} Sales Executive(s) still report to them. Reassign those executives first.` },
          { status: 400 }
        );
      }
    }

    if (role === "admin") {
      await Franchise.deleteOne({ email: emailLower });

      let existingAdmin = await AdminUser.findOne({ email: emailLower });

      const nextSalesRole = salesRole || null;
      const nextReportsTo = nextSalesRole === "executive" ? reportsTo : null;

      if (!existingAdmin) {
        existingAdmin = new AdminUser({
          email: emailLower,
          name,
          phone: phoneVal,
          password: password || "1234",
          role: "admin",
          permissions: permissions || [],
          salesRole: nextSalesRole,
          reportsTo: nextReportsTo,
        });
        await existingAdmin.save();
      } else {
        existingAdmin.phone = phoneVal;
        existingAdmin.name = name;
        existingAdmin.permissions = permissions || [];
        existingAdmin.salesRole = nextSalesRole;
        existingAdmin.reportsTo = nextReportsTo;
        if (password) {
          existingAdmin.password = password;
        }
        await existingAdmin.save();
      }

      if (userDoc) {
        userDoc.role = "admin";
        userDoc.phone = phoneVal;
        userDoc.name = name;
        userDoc.assessorType = null;
        if (password) {
          userDoc.password = password;
        }
        await userDoc.save();
      }
    } else if (role === "franchise") {
      await AdminUser.deleteOne({ email: emailLower });

      let existingFranchise = await Franchise.findOne({ email: emailLower });
      if (!existingFranchise) {
        existingFranchise = new Franchise({
          name: name || "Franchise Partner",
          email: emailLower,
          phone: phoneVal,
          referralCode: generateReferralCode(),
          commissionPercent: commissionPercent || 20,
          password: passwordHash || "$2a$10$euy0iI6ZKpGQupm4p2rh9.yRMhQGfgBmwzNmdRH/cLMXROGuOHUZO",
          isActive: true,
        });
        await existingFranchise.save();
      } else {
        existingFranchise.phone = phoneVal;
        existingFranchise.name = name;
        if (commissionPercent) {
          existingFranchise.commissionPercent = commissionPercent;
        }
        if (password) {
          existingFranchise.password = passwordHash;
        }
        await existingFranchise.save();
      }

      if (userDoc) {
        userDoc.role = "franchise";
        userDoc.phone = phoneVal;
        userDoc.name = name;
        userDoc.assessorType = null;
        if (password) {
          userDoc.password = password;
        }
        await userDoc.save();
      }
    } else {
      await AdminUser.deleteOne({ email: emailLower });
      await Franchise.deleteOne({ email: emailLower });

      if (userDoc) {
        userDoc.role = role;
        userDoc.phone = phoneVal;
        userDoc.name = name;
        userDoc.assessorType = role === "assessor" ? assessorType || null : null;
        if (password) {
          userDoc.password = password;
        }
        await userDoc.save();
      } else {
        const newUser = new User({
          name: name || "User",
          email: emailLower,
          phone: phoneVal || "0000000000",
          password: password || "1234",
          role,
          assessorType: role === "assessor" ? assessorType || null : null,
        });
        await newUser.save();
      }
    }

    return NextResponse.json({ status: "ok", message: `User role configured successfully to ${role}` });
  } catch (error) {
    console.error("PUT /api/admin/users/:id/role Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update role" }, { status: 500 });
  }
}
