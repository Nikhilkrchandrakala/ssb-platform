import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { isDevOtpBypass, verifyOtp } from "@/server/integrations/msg91";
import { signupEmailReqIds, verificationTokens } from "@/server/otpStore";

export async function POST(req: NextRequest) {
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
      const reqId = signupEmailReqIds.get(emailLower);
      if (!reqId) {
        return NextResponse.json({ success: false, message: "OTP session not found. Please request a new one." }, { status: 400 });
      }
      verified = await verifyOtp({ otp, reqId, widget: "email" });
      if (verified) signupEmailReqIds.delete(emailLower);
    }

    if (!verified) {
      return NextResponse.json({ success: false, message: "Invalid OTP. Please try again." }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    verificationTokens.set(`email:${emailLower}`, { token, expiresAt: Date.now() + 15 * 60 * 1000 });

    return NextResponse.json({ success: true, message: "Email verified successfully", emailVerifyToken: token });
  } catch {
    return NextResponse.json({ success: false, message: "Verification failed" }, { status: 500 });
  }
}
