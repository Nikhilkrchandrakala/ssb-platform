import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { isDevOtpBypass, verifyOtp, last10 } from "@/server/integrations/msg91";
import { verificationTokens } from "@/server/otpStore";

export async function POST(req: NextRequest) {
  try {
    const { phone, otp, reqId } = await req.json();
    if (!otp || !reqId) {
      return NextResponse.json({ success: false, message: "OTP and request ID required" }, { status: 400 });
    }

    const phoneLast10 = last10(phone || "");
    let verified = false;

    if (isDevOtpBypass(otp)) {
      verified = true;
    } else {
      verified = await verifyOtp({ otp, reqId, widget: "phone" });
    }

    if (!verified) {
      return NextResponse.json({ success: false, message: "Invalid OTP. Please try again." }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    await verificationTokens.set(`phone:${phoneLast10}`, { token, expiresAt: Date.now() + 15 * 60 * 1000 });

    return NextResponse.json({ success: true, message: "Phone verified successfully", phoneVerifyToken: token });
  } catch {
    return NextResponse.json({ success: false, message: "Phone OTP verification failed" }, { status: 500 });
  }
}
