import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Gallery } from "@/server/models";
import { uploadToR2 } from "@/server/storage/r2";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const title = formData.get("title") as string | null;
    const imageTextsRaw = formData.get("imageTexts") as string | null;

    if (!title) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 });
    }

    let parsedTexts: string[] = [];
    try {
      parsedTexts = imageTextsRaw ? JSON.parse(imageTextsRaw) : [];
    } catch {
      parsedTexts = [];
    }

    await connectDB();

    const imageFiles = formData.getAll("images");
    const images: { imageUrl: string; imageText: string }[] = [];
    let index = 0;
    for (const file of imageFiles) {
      if (file instanceof File && file.size > 0) {
        const { url } = await uploadToR2("gallery", file);
        images.push({ imageUrl: url, imageText: parsedTexts[index] || "" });
      }
      index++;
    }

    const gallery = new Gallery({
      title,
      images,
      createdBy: String(user._id),
    });

    await gallery.save();

    return NextResponse.json({ message: "Gallery created", data: gallery }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
