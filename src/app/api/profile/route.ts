import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { User, AdminUser, Franchise } from "@/server/models";

/**
 * GET /api/profile
 * Self-scoped — retrieves details for the currently logged-in session,
 * resolving across AdminUser/Franchise/User collections.
 * Ported from legacy profileRoutes.js.
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const userId = currentUser._id || currentUser.id;

    let user = await AdminUser.findById(userId).select("-password");
    let role = "admin";
    if (user) {
      role = user.role === "owner" ? "owner" : "admin";
    }

    if (!user) {
      user = await Franchise.findById(userId).select("-password");
      role = "franchise";
    }

    if (!user) {
      user = await User.findById(userId).select("-password");
      role = user ? user.role || "student" : "";
    }

    if (!user) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: "ok",
      user: {
        name: user.name || "System User",
        email: user.email,
        phone: user.phone || "",
        role,
        assessorType: role === "assessor" ? user.assessorType || null : null,
        permissions: role === "admin" || role === "owner" ? user.permissions || [] : [],
      },
    });
  } catch (error) {
    console.error("GET /api/profile Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch profile" }, { status: 500 });
  }
}

/**
 * PUT /api/profile
 * Self-scoped — updates basic details (name, phone) for the currently
 * logged-in user, syncing across AdminUser/Franchise -> User where applicable.
 * Ported from legacy profileRoutes.js.
 */
export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const userId = currentUser._id || currentUser.id;
    const { name, phone } = await req.json();

    let user = await AdminUser.findById(userId);
    if (user) {
      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      await user.save();

      const syncedUser = await User.findOne({ email: user.email.toLowerCase() });
      if (syncedUser) {
        if (name) syncedUser.name = name;
        if (phone !== undefined) syncedUser.phone = phone;
        await syncedUser.save();
      }
      return NextResponse.json({ status: "ok", message: "Admin profile updated successfully" });
    }

    user = await Franchise.findById(userId);
    if (user) {
      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      await user.save();

      const syncedUser = await User.findOne({ email: user.email.toLowerCase() });
      if (syncedUser) {
        if (name) syncedUser.name = name;
        if (phone !== undefined) syncedUser.phone = phone;
        await syncedUser.save();
      }
      return NextResponse.json({ status: "ok", message: "Franchise profile updated successfully" });
    }

    user = await User.findById(userId);
    if (user) {
      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      await user.save();
      return NextResponse.json({ status: "ok", message: "Profile updated successfully" });
    }

    return NextResponse.json({ error: "Profile account not found" }, { status: 404 });
  } catch (error) {
    console.error("PUT /api/profile Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update profile" }, { status: 500 });
  }
}
