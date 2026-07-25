import { NextRequest, NextResponse } from "next/server";
import { isDevOtpBypass, verifyOtp } from "@/server/integrations/msg91";
import { recoveryEmailReqIds } from "@/server/otpStore";

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
      const reqId = recoveryEmailReqIds.get(emailLower);
      if (!reqId) return NextResponse.json({ message: "OTP session not found" }, { status: 400 });
      verified = await verifyOtp({ otp, reqId, widget: "email" });
      if (verified) recoveryEmailReqIds.delete(emailLower);
    }

    if (!verified) {
      return NextResponse.json({ success: false, message: "Invalid OTP" }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: "OTP verified" });
  } catch {
    return NextResponse.json({ success: false, message: "Verify failed" }, { status: 500 });
  }
}
