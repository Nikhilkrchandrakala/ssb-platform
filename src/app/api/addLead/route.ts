import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/server/rateLimit";
import { connectDB } from "@/server/db";
import { Lead } from "@/server/models";

/**
 * POST /api/addLead
 * Public — used by the public-facing lead capture / contact forms on the main site.
 * Ported from legacy Leads.js.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "addLead", { limit: 20, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  try {
    await connectDB();

    const { name, email, phoneNumber, enrollmentMode } = await req.json();
    const newLead = new Lead({
      name,
      email,
      phoneNumber,
      ...(enrollmentMode === "offline" ? { enrollmentMode: "offline" } : {}),
    });
    await newLead.save();
    const allLeads = await Lead.find({});
    return NextResponse.json({ message: "Successfully created a new lead", data: allLeads }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to add lead" }, { status: 500 });
  }
}
