import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Gallery } from "@/server/models";
import { uploadToR2, deleteFromR2, keyFromR2Url } from "@/server/storage/r2";

interface GalleryImage {
  imageUrl: string;
  imageText: string;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ galleryId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { galleryId } = await params;

    const formData = await req.formData();
    const imageUrl = formData.get("imageUrl") as string | null;
    const imageText = formData.get("imageText") as string | null;
    const file = formData.get("image");

    if (!imageUrl) {
      return NextResponse.json({ message: "imageUrl is required" }, { status: 400 });
    }

    await connectDB();

    const gallery = await Gallery.findById(galleryId);
    if (!gallery) {
      return NextResponse.json({ message: "Gallery not found" }, { status: 404 });
    }

    const image = (gallery.images as GalleryImage[]).find((img) => img.imageUrl === imageUrl);
    if (!image) {
      return NextResponse.json({ message: "Image not found" }, { status: 404 });
    }

    if (file instanceof File && file.size > 0) {
      const oldKey = keyFromR2Url(image.imageUrl);
      if (oldKey) {
        await deleteFromR2(oldKey).catch(() => {});
      }
      const { url } = await uploadToR2("gallery", file);
      image.imageUrl = url;
    }

    image.imageText = imageText || "";

    await gallery.save();

    return NextResponse.json({ message: "Image description updated", data: gallery });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
