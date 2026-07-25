import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { AuthDisplaySettings } from "@/server/models";
import { uploadToR2 } from "@/server/storage/r2";

/**
 * POST /api/authDisplaySettings/uploadAd
 * Uploads a single ad image (replaces legacy `galleryUpload` multer disk
 * storage with Cloudflare R2, folder "gallery").
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
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const { url } = await uploadToR2("gallery", file);
    settings.adImage = url;
    await settings.save();

    return NextResponse.json({ message: "Ad image uploaded successfully", data: settings });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Failed to upload ad image" }, { status: 500 });
  }
}
