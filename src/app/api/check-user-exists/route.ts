import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { User } from "@/server/models/User";
import { last10 } from "@/server/integrations/msg91";

export async function POST(req: NextRequest) {
  try {
    const { email, phone } = await req.json();

    if (!email && !phone) {
      return NextResponse.json({ error: "Email or phone is required" }, { status: 400 });
    }

    await connectDB();

    const conditions: Record<string, unknown>[] = [];
    if (email) {
      const emailLower = email.toLowerCase().trim();
      const escaped = emailLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      conditions.push({ email: { $regex: new RegExp(`^${escaped}$`, "i") } });
    }
    if (phone) {
      conditions.push({ phone: { $regex: new RegExp(`${last10(phone)}$`) } });
    }

    const existingUser = await User.findOne({ $or: conditions });

    if (existingUser) {
      let matchedField = "account";
      if (email && existingUser.email.toLowerCase() === email.toLowerCase().trim()) {
        matchedField = "email";
      } else if (phone) {
        matchedField = "phone number";
      }
      return NextResponse.json({
        exists: true,
        field: matchedField,
        message: `An account with this ${matchedField} already exists. Please sign in instead.`,
      });
    }

    return NextResponse.json({ exists: false });
  } catch {
    return NextResponse.json({ error: "Server error checking user" }, { status: 500 });
  }
}
