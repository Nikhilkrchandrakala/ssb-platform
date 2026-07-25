import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { User } from "@/server/models";

/**
 * PUT /api/user/register-psych-consent
 * Self-scoped — registers psych test consent and attempt timestamp for the
 * logged-in user.
 * Ported from legacy UserProfile.js.
 */
export async function PUT() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const userId = currentUser._id || currentUser.id;
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    user.hasPsychTheoryConsent = true;
    user.psychTestAttemptedAt = new Date();
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    return NextResponse.json({
      status: "ok",
      message: "Psychology test consent and attempt timestamp registered successfully",
      user: userObj,
    });
  } catch (error) {
    return NextResponse.json({ status: "error", message: error instanceof Error ? error.message : "Failed to register consent" }, { status: 500 });
  }
}
