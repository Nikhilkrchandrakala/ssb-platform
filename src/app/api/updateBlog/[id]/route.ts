import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Blog } from "@/server/models";
import { uploadToR2, deleteFromR2, keyFromR2Url } from "@/server/storage/r2";

interface BlogImage {
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

    const blog = await Blog.findById(id);
    if (!blog) return NextResponse.json({ message: "Blog not found" }, { status: 404 });

    const formData = await req.formData();
    const title = formData.get("title") as string | null;
    const shortDescription = formData.get("shortDescription") as string | null;
    const content = formData.get("content") as string | null;
    const authorName = formData.get("authorName") as string | null;
    const authorQuote = formData.get("authorQuote") as string | null;
    const timeDuration = formData.get("timeDuration") as string | null;
    const imageTexts = formData.getAll("imageTexts").map((v) => String(v));
    const existingImageTextsRaw = formData.get("existingImageTexts") as string | null;
    const imagesToDeleteRaw = formData.get("imagesToDelete") as string | null;

    const imagesToDelete: string[] = imagesToDeleteRaw ? JSON.parse(imagesToDeleteRaw) : [];
    const existingImageTexts: { imageUrl: string; imageText: string }[] = existingImageTextsRaw
      ? JSON.parse(existingImageTextsRaw)
      : [];

    /* ===== 1. DELETE OLD IMAGES =====
       legacy matched by filename on local disk; images are now full R2 URLs
       stored verbatim, so an exact URL match is used instead. */
    if (imagesToDelete.length > 0) {
      blog.images = (blog.images as BlogImage[]).filter(
        (img) => !imagesToDelete.includes(img.imageUrl)
      );

      for (const imgUrl of imagesToDelete) {
        const key = keyFromR2Url(imgUrl);
        if (key) {
          await deleteFromR2(key).catch(() => {});
        }
      }
    }

    /* ===== 2. UPDATE EXISTING IMAGE TEXTS ===== */
    if (existingImageTexts.length > 0) {
      blog.images = (blog.images as BlogImage[]).map((img) => {
        const found = existingImageTexts.find((e) => e.imageUrl === img.imageUrl);
        return found ? { ...img, imageText: found.imageText } : img;
      });
    }

    /* ===== 3. UPDATE NORMAL FIELDS ===== */
    if (title !== null) blog.title = title;
    if (shortDescription !== null) blog.shortDescription = shortDescription;
    if (content !== null) blog.content = content;
    if (authorName !== null) blog.authorName = authorName;
    if (authorQuote !== null) blog.authorQuote = authorQuote;
    if (timeDuration !== null) blog.timeDuration = timeDuration;

    /* ===== 4. ADD NEW IMAGES ===== */
    const imageFiles = formData.getAll("images");
    const newImages: BlogImage[] = [];
    let index = 0;
    for (const file of imageFiles) {
      if (file instanceof File && file.size > 0) {
        const { url } = await uploadToR2("blogs", file);
        newImages.push({ imageUrl: url, imageText: imageTexts[index] || "" });
      }
      index++;
    }
    if (newImages.length > 0) {
      blog.images.push(...newImages);
    }

    await blog.save();

    return NextResponse.json({ message: "Blog updated successfully", data: blog });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
