import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/server/integrations/msg91";

export async function POST(req: NextRequest) {
  const { accessToken } = await req.json();

  if (!accessToken) {
    return NextResponse.json({ error: "Access token is required" }, { status: 400 });
  }

  try {
    const { success, data } = await verifyAccessToken(accessToken);
    if (success) {
      return NextResponse.json({ message: "OTP verified successfully", data });
    }
    return NextResponse.json({ message: "OTP verification failed", data }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "An error occurred during OTP verification", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
