import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/server/rateLimit";
import { connectDB } from "@/server/db";
import { Lead } from "@/server/models";

const ALLOWED_SOURCES = ["google-ads-online", "google-ads-offline"];

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

    const body = await req.json();
    const name = String(body?.name ?? "").trim().slice(0, 200);
    const email = String(body?.email ?? "").trim().slice(0, 200);
    const phoneNumber = String(body?.phoneNumber ?? "").trim().slice(0, 40);
    if (!name || !email || !phoneNumber) {
      return NextResponse.json({ message: "name, email and phoneNumber are required" }, { status: 400 });
    }

    const source = ALLOWED_SOURCES.includes(body?.source) ? body.source : "";
    const newLead = new Lead({
      name,
      email,
      phoneNumber,
      ...(body?.enrollmentMode === "offline" ? { enrollmentMode: "offline" } : {}),
      ...(source ? { source } : {}),
    });
    await newLead.save();
    // Deliberately not returning the lead list — this endpoint is public.
    return NextResponse.json({ message: "Successfully created a new lead" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to add lead" }, { status: 500 });
  }
}
