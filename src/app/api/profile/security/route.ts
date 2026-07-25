import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { User, AdminUser, Franchise } from "@/server/models";

/**
 * PUT /api/profile/security
 * Self-scoped — changes password for the currently logged-in user after
 * verifying the current password.
 * Ported from legacy profileRoutes.js.
 */
export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const userId = currentUser._id || currentUser.id;
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
    }

    let user = await AdminUser.findById(userId);
    let userType = "admin";

    if (!user) {
      user = await Franchise.findById(userId);
      userType = "franchise";
    }

    if (!user) {
      user = await User.findById(userId);
      userType = "standard";
    }

    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Current security password verification failed" }, { status: 400 });
    }

    if (userType === "franchise") {
      const newHash = await bcrypt.hash(newPassword, 10);
      user.password = newHash;
    } else {
      user.password = newPassword;
    }
    await user.save();

    if (userType === "admin" || userType === "franchise") {
      const syncedUser = await User.findOne({ email: user.email.toLowerCase() });
      if (syncedUser) {
        syncedUser.password = newPassword;
        await syncedUser.save();
      }
    }

    return NextResponse.json({ status: "ok", message: "Password updated successfully!" });
  } catch (error) {
    console.error("PUT /api/profile/security Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update password" }, { status: 500 });
  }
}
