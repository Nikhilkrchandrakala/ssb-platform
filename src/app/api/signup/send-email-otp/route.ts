import { NextRequest, NextResponse } from "next/server";
import { sendEmailOtp } from "@/server/integrations/msg91";
import { signupEmailReqIds } from "@/server/otpStore";
import { verifyTurnstileToken } from "@/server/turnstile";

export async function POST(req: NextRequest) {
  try {
    const { email, turnstileToken } = await req.json();
    if (!email) return NextResponse.json({ success: false, message: "Email required" }, { status: 400 });

    const turnstileOk = await verifyTurnstileToken(turnstileToken, req.headers.get("cf-connecting-ip") || undefined);
    if (!turnstileOk) {
      return NextResponse.json({ success: false, message: "Verification failed. Please try again." }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const { success, reqId } = await sendEmailOtp(emailLower);

    if (success && reqId) {
      await signupEmailReqIds.set(emailLower, reqId);
      return NextResponse.json({ success: true, message: "Verification OTP sent to your email", reqId });
    }
    return NextResponse.json({ success: false, message: "Failed to send email OTP via MSG91" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to send email OTP" }, { status: 500 });
  }
}
