import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Gallery } from "@/server/models";
import { uploadToR2, deleteFromR2, keyFromR2Url } from "@/server/storage/r2";

interface GalleryImage {
  imageUrl: string;
  imageText: string;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    await connectDB();

    const gallery = await Gallery.findById(id);
    if (!gallery) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const formData = await req.formData();
    const imagesToDeleteRaw = formData.get("imagesToDelete") as string | null;
    const imageTextsRaw = formData.get("imageTexts") as string | null;

    const imagesToDelete: string[] = imagesToDeleteRaw ? JSON.parse(imagesToDeleteRaw) : [];

    // NOTE: legacy `updateGallery` referenced an undefined `parsedTexts`
    // variable here (only defined in the addGallery handler), which meant
    // uploading new images on update threw a ReferenceError in production.
    // Parsing imageTexts the same way addGallery does, since that was
    // clearly the intent.
    let parsedTexts: string[] = [];
    try {
      parsedTexts = imageTextsRaw ? JSON.parse(imageTextsRaw) : [];
    } catch {
      parsedTexts = [];
    }

    /* DELETE IMAGES */
    if (imagesToDelete.length > 0) {
      gallery.images = (gallery.images as GalleryImage[]).filter(
        (img) => !imagesToDelete.includes(img.imageUrl)
      );

      for (const imgUrl of imagesToDelete) {
        const key = keyFromR2Url(imgUrl);
        if (key) {
          await deleteFromR2(key).catch(() => {});
        }
      }
    }

    /* ADD NEW IMAGES */
    const imageFiles = formData.getAll("images");
    const newImages: GalleryImage[] = [];
    let index = 0;
    for (const file of imageFiles) {
      if (file instanceof File && file.size > 0) {
        const { url } = await uploadToR2("gallery", file);
        newImages.push({ imageUrl: url, imageText: parsedTexts[index] || "" });
      }
      index++;
    }
    if (newImages.length > 0) {
      gallery.images.push(...newImages);
    }

    await gallery.save();

    return NextResponse.json({ message: "Gallery updated", data: gallery });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
