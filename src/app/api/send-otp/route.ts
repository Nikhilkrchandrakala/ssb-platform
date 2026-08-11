import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { User } from "@/server/models/User";
import { AdminUser } from "@/server/models/AdminUser";
import { Franchise } from "@/server/models/Franchise";
import { sendEmailOtp } from "@/server/integrations/msg91";
import { recoveryEmailReqIds } from "@/server/otpStore";

// Password-recovery OTP send, restricted to admin/franchise/assessor accounts
// (student/lead password reset goes through /api/forgot-password without OTP).
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ message: "Email required" }, { status: 400 });

    await connectDB();

    const emailLower = email.toLowerCase().trim();
    const [adminExists, franchiseExists, userDoc] = await Promise.all([
      AdminUser.findOne({ email: { $regex: new RegExp(`^${emailLower}$`, "i") } }),
      Franchise.findOne({ email: { $regex: new RegExp(`^${emailLower}$`, "i") } }),
      User.findOne({ email: { $regex: new RegExp(`^${emailLower}$`, "i") } }),
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
