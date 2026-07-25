import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { ContactSettings } from "@/server/models";

/**
 * GET /api/contactSettings
 * Public — returns (and lazily creates) contact settings.
 * Ported from legacy ContactSettings.js.
 */
export async function GET() {
  try {
    await connectDB();

    let settings = await ContactSettings.findOne();
    if (!settings) {
      settings = new ContactSettings();
      await settings.save();
    }
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Failed to fetch settings" }, { status: 500 });
  }
}

/**
 * PUT /api/contactSettings
 * Legacy only required checkAuth (any logged-in user); locked to admin/owner
 * here since this controls site-wide contact numbers.
 * Ported from legacy ContactSettings.js.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!hasRole(user, ["admin", "owner"])) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { whatsappNumber, callNumber } = await req.json();
    let settings = await ContactSettings.findOne();
    if (!settings) {
      settings = new ContactSettings();
    }
    if (whatsappNumber !== undefined) settings.whatsappNumber = whatsappNumber.trim().replace(/\s+/g, "");
    if (callNumber !== undefined) settings.callNumber = callNumber.trim().replace(/\s+/g, "");

    await settings.save();
    return NextResponse.json({ message: "Successfully updated contact settings", data: settings });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Failed to update settings" }, { status: 500 });
  }
}
