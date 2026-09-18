import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/server/rateLimit";
import { isDevOtpBypass, verifyOtp } from "@/server/integrations/msg91";
import crypto from "node:crypto";
import { recoveryEmailReqIds, verificationTokens } from "@/server/otpStore";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "verify-otp", { limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  try {
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ success: false, message: "Email and OTP required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    let verified = false;

    if (isDevOtpBypass(otp)) {
      verified = true;
    } else {
      const reqId = await recoveryEmailReqIds.get(emailLower);
      if (!reqId) return NextResponse.json({ message: "OTP session not found" }, { status: 400 });
      verified = await verifyOtp({ otp, reqId, widget: "email" });
      if (verified) await recoveryEmailReqIds.delete(emailLower);
    }

    if (!verified) {
      return NextResponse.json({ success: false, message: "Invalid OTP" }, { status: 400 });
    }
    // Proof of verification for /api/forgot-password — without this token that
    // route would let anyone reset a staff password.
    const resetToken = crypto.randomBytes(32).toString("hex");
    await verificationTokens.set(`staff-reset:email:${emailLower}`, { token: resetToken, expiresAt: Date.now() + 15 * 60 * 1000 });
    return NextResponse.json({ success: true, message: "OTP verified", resetToken });
  } catch {
    return NextResponse.json({ success: false, message: "Verify failed" }, { status: 500 });
  }
}
