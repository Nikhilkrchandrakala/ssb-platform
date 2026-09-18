import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/server/rateLimit";
import { connectDB } from "@/server/db";
import { User } from "@/server/models/User";
import { AdminUser } from "@/server/models/AdminUser";
import { Franchise } from "@/server/models/Franchise";
import { sendEmailOtp } from "@/server/integrations/msg91";
import { recoveryEmailReqIds } from "@/server/otpStore";
import { escapeRegExp } from "@/server/escapeRegExp";

// Password-recovery OTP send, restricted to admin/franchise/assessor accounts
// (student/lead password reset goes through /api/forgot-password without OTP).
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "send-otp", { limit: 5, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ message: "Email required" }, { status: 400 });

    await connectDB();

    const emailLower = String(email).toLowerCase().trim();
    const emailPattern = new RegExp(`^${escapeRegExp(emailLower)}$`, "i");
    const [adminExists, franchiseExists, userDoc] = await Promise.all([
      AdminUser.findOne({ email: { $regex: emailPattern } }),
      Franchise.findOne({ email: { $regex: emailPattern } }),
      User.findOne({ email: { $regex: emailPattern } }),
    ]);
    const assessorExists = userDoc && userDoc.role === "assessor";

    if (!adminExists && !franchiseExists && !assessorExists) {
      return NextResponse.json(
        { success: false, message: "Password recovery is restricted to administrative and assessor accounts." },
        { status: 403 }
      );
    }

    const { success, reqId } = await sendEmailOtp(emailLower);
    if (success && reqId) {
      await recoveryEmailReqIds.set(emailLower, reqId);
      return NextResponse.json({ success: true, message: "OTP sent" });
    }
    return NextResponse.json({ success: false, message: "Failed to send OTP via MSG91" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, message: "OTP failed" }, { status: 500 });
  }
}
