import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { AuthDisplaySettings } from "@/server/models";
import { getAuthDisplaySettings } from "@/server/authDisplaySettings";

/**
 * GET /api/authDisplaySettings
 * Public — returns (and lazily creates) the auth-page display settings.
 * Ported from legacy AuthDisplaySettingsRoute.js.
 */
export async function GET() {
  try {
    const settings = await getAuthDisplaySettings();
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Failed to fetch settings" }, { status: 500 });
  }
}

/**
 * PUT /api/authDisplaySettings
 * Updates basic settings (mode, adLink, transitionValue, transitionUnit).
 * Legacy only required checkAuth (any logged-in user); locked to admin/owner
 * here since this controls site-wide auth-page branding.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!hasRole(user, ["admin", "owner"])) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { mode, adLink, transitionValue, transitionUnit } = await req.json();
    let settings = await AuthDisplaySettings.findOne();
    if (!settings) {
      settings = new AuthDisplaySettings();
    }
    if (mode !== undefined) {
      if (["slideshow", "ad"].includes(mode)) {
        settings.mode = mode;
      } else {
        return NextResponse.json({ message: "Invalid mode selection" }, { status: 400 });
      }
    }
    if (adLink !== undefined) {
      settings.adLink = adLink;
    }
    if (transitionValue !== undefined) {
      settings.transitionValue = Number(transitionValue);
    }
    if (transitionUnit !== undefined) {
      if (["seconds", "minutes", "hours", "days"].includes(transitionUnit)) {
        settings.transitionUnit = transitionUnit;
      } else {
        return NextResponse.json({ message: "Invalid transition unit selection" }, { status: 400 });
      }
    }
    await settings.save();
    return NextResponse.json({ message: "Settings updated successfully", data: settings });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Failed to update settings" }, { status: 500 });
  }
}
