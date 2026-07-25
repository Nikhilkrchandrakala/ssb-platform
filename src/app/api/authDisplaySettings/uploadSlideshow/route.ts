import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { AuthDisplaySettings } from "@/server/models";
import { uploadToR2 } from "@/server/storage/r2";

/**
 * POST /api/authDisplaySettings/uploadSlideshow
 * Uploads up to 10 slideshow images total (replaces legacy `galleryUpload`
 * multer disk storage with Cloudflare R2, folder "gallery" — same bucket
 * area legacy used for these images).
 * Ported from legacy AuthDisplaySettingsRoute.js.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!hasRole(user, ["admin", "owner"])) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    let settings = await AuthDisplaySettings.findOne();
    if (!settings) {
      settings = new AuthDisplaySettings();
    }

    const formData = await req.formData();
    const files = formData.getAll("images").filter((f): f is File => f instanceof File);

    if (!files || files.length === 0) {
      return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
    }

    if (settings.slideshowImages.length + files.length > 10) {
      return NextResponse.json({ message: "Maximum 10 slideshow images allowed" }, { status: 400 });
    }

    const uploaded = await Promise.all(files.map((file) => uploadToR2("gallery", file)));
    const newImages = uploaded.map((u) => u.url);

    settings.slideshowImages = [...settings.slideshowImages, ...newImages];
    await settings.save();

    return NextResponse.json({ message: "Slideshow images uploaded successfully", data: settings });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Failed to upload slideshow images" }, { status: 500 });
  }
}
