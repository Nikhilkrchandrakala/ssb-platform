import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { AuthDisplaySettings } from "@/server/models";
import { deleteFromR2, keyFromR2Url } from "@/server/storage/r2";

/**
 * PUT /api/authDisplaySettings/deleteSlideshowImage
 * Removes a slideshow image URL from settings and best-effort deletes the
 * underlying R2 object (replaces legacy local-disk unlink).
 * Ported from legacy AuthDisplaySettingsRoute.js.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!hasRole(user, ["admin", "owner"])) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ message: "Image URL is required" }, { status: 400 });
    }

    const settings = await AuthDisplaySettings.findOne();
    if (!settings) {
      return NextResponse.json({ message: "Settings not found" }, { status: 404 });
    }

    settings.slideshowImages = settings.slideshowImages.filter((img: string) => img !== imageUrl);
    await settings.save();

    try {
      const key = keyFromR2Url(imageUrl);
      if (key) {
        await deleteFromR2(key);
      }
    } catch (e) {
      console.error("Error deleting file from R2:", e);
    }

    return NextResponse.json({ message: "Slideshow image deleted successfully", data: settings });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Failed to delete slideshow image" }, { status: 500 });
  }
}
