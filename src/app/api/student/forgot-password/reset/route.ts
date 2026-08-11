import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { User } from "@/server/models/User";
import { last10 } from "@/server/integrations/msg91";
import { verificationTokens } from "@/server/otpStore";

export async function POST(req: NextRequest) {
  try {
    const { email, phone, resetToken, newPassword } = await req.json();
    if ((!email && !phone) || !resetToken || !newPassword) {
      return NextResponse.json({ success: false, message: "Email or phone, reset token, and new password are required" }, { status: 400 });
    }

    const key = email ? `student-reset:email:${email.toLowerCase().trim()}` : `student-reset:phone:${last10(phone)}`;
    const entry = await verificationTokens.get(key);
    if (!entry || entry.token !== resetToken || entry.expiresAt < Date.now()) {
      return NextResponse.json({ success: false, message: "Reset session expired or invalid. Please verify OTP again." }, { status: 400 });
    }

    await connectDB();

    const query = email
      ? { email: { $regex: new RegExp(`^${email.toLowerCase().trim()}$`, "i") } }
      : { phone: { $regex: new RegExp(`${last10(phone)}$`) } };
    const user = await User.findOne(query);
    if (!user || !["student", "lead"].includes(user.role)) {
      return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });
    }

    user.password = newPassword;
    await user.save();
    await verificationTokens.delete(key);

    return NextResponse.json({ success: true, message: "Password reset successfully" });
  } catch {
    return NextResponse.json({ success: false, message: "Reset failed" }, { status: 500 });
  }
}
