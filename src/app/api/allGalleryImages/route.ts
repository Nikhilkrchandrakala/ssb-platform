import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Gallery } from "@/server/models";

interface GalleryImage {
  imageUrl: string;
  imageText: string;
}

export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const galleries = await Gallery.find();
    const allImages = galleries.flatMap((gallery) => gallery.images as GalleryImage[]);
    return NextResponse.json(allImages);
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
