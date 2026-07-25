import { NextRequest, NextResponse } from "next/server";
import { sendPhoneOtp, last10 } from "@/server/integrations/msg91";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ success: false, message: "Phone number required" }, { status: 400 });

    const { success, reqId } = await sendPhoneOtp(last10(phone));
    if (success) {
      return NextResponse.json({ success: true, message: "OTP sent to your phone", reqId });
    }
    return NextResponse.json({ success: false, message: "Failed to send phone OTP" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to send phone OTP" }, { status: 500 });
  }
}
