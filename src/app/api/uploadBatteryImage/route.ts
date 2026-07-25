import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { uploadToR2 } from "@/server/storage/r2";

/**
 * POST /api/uploadBatteryImage
 * Self-scoped — any logged-in user. Uploads to Cloudflare R2 (folder "battery"),
 * replacing legacy's local-disk multer storage. Preserves the legacy 2MB size
 * cap for students uploading dossier files.
 * Ported from legacy uploadBatteryImage.js.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    // Limit checking based on role: 2MB limit for student dossier uploads.
    if (user.role === "student") {
      const limit = 2 * 1024 * 1024;
      if (file.size > limit) {
        return NextResponse.json({ message: "File size exceeds the 2MB limit for Dossier uploads" }, { status: 400 });
      }
    }

    const { url } = await uploadToR2("battery", file);

    return NextResponse.json({
      message: "File uploaded successfully",
      url,
    });
  } catch (error) {
    console.error("Error in uploadBatteryImage:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
