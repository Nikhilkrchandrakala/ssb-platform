import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/server/rateLimit";
import { connectDB } from "@/server/db";
import { Lead } from "@/server/models";

/**
 * GET /api/checkPhoneNumber/:phoneNumber
 * Public — used by the public lead capture form to check for duplicates before submit.
 * Ported from legacy Leads.js.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ phoneNumber: string }> }) {
  const limited = rateLimit(req, "checkPhoneNumber", { limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  try {
    await connectDB();

    const { phoneNumber } = await params;

    const lead = await Lead.findOne({ phoneNumber });
    if (lead) {
      return NextResponse.json({ exists: true, message: "Phone number already exists" });
    }
    return NextResponse.json({ exists: false, message: "Phone number is available" });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
