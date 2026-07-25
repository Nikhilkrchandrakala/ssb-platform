import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { isDevOtpBypass, verifyOtp, last10 } from "@/server/integrations/msg91";
import { verificationTokens, studentRecoveryEmailReqIds } from "@/server/otpStore";

export async function POST(req: NextRequest) {
  try {
    const { email, phone, otp, reqId } = await req.json();
    if (!otp || (!email && !phone)) {
      return NextResponse.json({ success: false, message: "Email or phone, and OTP required" }, { status: 400 });
    }

    let verified = false;

    if (email) {
      const emailLower = email.toLowerCase().trim();
      if (isDevOtpBypass(otp)) {
        verified = true;
      } else {
        const storedReqId = studentRecoveryEmailReqIds.get(emailLower);
        if (!storedReqId) {
          return NextResponse.json({ success: false, message: "OTP session not found. Please request a new one." }, { status: 400 });
        }
        verified = await verifyOtp({ otp, reqId: storedReqId, widget: "email" });
        if (verified) studentRecoveryEmailReqIds.delete(emailLower);
      }

      if (!verified) {
        return NextResponse.json({ success: false, message: "Invalid OTP. Please try again." }, { status: 400 });
      }

      const token = crypto.randomBytes(32).toString("hex");
      verificationTokens.set(`student-reset:email:${emailLower}`, { token, expiresAt: Date.now() + 15 * 60 * 1000 });
      return NextResponse.json({ success: true, message: "OTP verified", resetToken: token });
    }

    if (!reqId) {
      return NextResponse.json({ success: false, message: "Request ID required" }, { status: 400 });
    }
    const phoneLast10 = last10(phone);
    verified = isDevOtpBypass(otp) || (await verifyOtp({ otp, reqId, widget: "phone" }));
    if (!verified) {
      return NextResponse.json({ success: false, message: "Invalid OTP. Please try again." }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    verificationTokens.set(`student-reset:phone:${phoneLast10}`, { token, expiresAt: Date.now() + 15 * 60 * 1000 });
    return NextResponse.json({ success: true, message: "OTP verified", resetToken: token });
  } catch {
    return NextResponse.json({ success: false, message: "OTP verification failed" }, { status: 500 });
  }
}
