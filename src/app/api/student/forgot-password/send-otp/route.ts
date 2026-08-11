import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { User } from "@/server/models/User";
import { sendEmailOtp, sendPhoneOtp, last10 } from "@/server/integrations/msg91";
import { studentRecoveryEmailReqIds } from "@/server/otpStore";

// Self-service password recovery for student/lead accounts — the gap Phase 3
// surfaced: /api/send-otp + /api/forgot-password only cover admin/franchise/assessor.
export async function POST(req: NextRequest) {
  try {
    const { email, phone } = await req.json();
    if (!email && !phone) {
      return NextResponse.json({ success: false, message: "Email or phone required" }, { status: 400 });
    }

    await connectDB();

    if (email) {
      const emailLower = email.toLowerCase().trim();
      const user = await User.findOne({ email: { $regex: new RegExp(`^${emailLower}$`, "i") } });
      if (!user || !["student", "lead"].includes(user.role)) {
        return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });
      }

      const { success, reqId } = await sendEmailOtp(emailLower);
      if (success && reqId) {
        await studentRecoveryEmailReqIds.set(emailLower, reqId);
        return NextResponse.json({ success: true, message: "OTP sent to your email" });
      }
      return NextResponse.json({ success: false, message: "Failed to send OTP via MSG91" }, { status: 400 });
    }

    const phoneLast10 = last10(phone);
    const user = await User.findOne({ phone: { $regex: new RegExp(`${phoneLast10}$`) } });
    if (!user || !["student", "lead"].includes(user.role)) {
      return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });
    }

    const { success, reqId } = await sendPhoneOtp(phoneLast10);
    if (success) {
      return NextResponse.json({ success: true, message: "OTP sent to your phone", reqId });
    }
    return NextResponse.json({ success: false, message: "Failed to send phone OTP" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to send OTP" }, { status: 500 });
  }
}
