import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/server/db";
import { User } from "@/server/models/User";
import { AdminUser } from "@/server/models/AdminUser";
import { Franchise } from "@/server/models/Franchise";
import { verificationTokens } from "@/server/otpStore";
import { escapeRegExp } from "@/server/escapeRegExp";
import { rateLimit } from "@/server/rateLimit";

// Staff (admin/owner/franchise/assessor) password reset. Requires the
// resetToken minted by /api/verify-otp after a real email-OTP check — without
// it this route would let anyone set any staff password.
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, "forgot-password", { limit: 5, windowMs: 15 * 60 * 1000 });
    if (limited) return limited;

    const { email, newPassword, resetToken } = await req.json();

    if (!email || !newPassword || !resetToken) {
      return NextResponse.json({ error: "Email, new password and verification token are required" }, { status: 400 });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const emailLower = String(email).toLowerCase().trim();
    const key = `staff-reset:email:${emailLower}`;
    const entry = await verificationTokens.get(key);
    if (!entry || entry.token !== resetToken || entry.expiresAt < Date.now()) {
      return NextResponse.json({ error: "Reset session expired or invalid. Please verify OTP again." }, { status: 400 });
    }

    await connectDB();

    const emailPattern = { $regex: new RegExp(`^${escapeRegExp(emailLower)}$`, "i") };
    let userFound = false;

    const userDoc = await User.findOne({ email: emailPattern });
    if (userDoc && userDoc.role === "assessor") {
      userDoc.password = newPassword;
      await userDoc.save();
      userFound = true;
    }

    const adminDoc = await AdminUser.findOne({ email: emailPattern });
    if (adminDoc) {
      adminDoc.password = newPassword;
      await adminDoc.save();
      userFound = true;
    }

    const franchiseDoc = await Franchise.findOne({ email: emailPattern });
    if (franchiseDoc) {
      franchiseDoc.password = await bcrypt.hash(newPassword, 10);
      await franchiseDoc.save();
      userFound = true;
    }

    if (!userFound) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    await verificationTokens.delete(key);
    return NextResponse.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reset failed" }, { status: 500 });
  }
}
