import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Course } from "@/server/models";
import { uploadToR2, deleteFromR2, keyFromR2Url } from "@/server/storage/r2";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    await connectDB();

    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const price = formData.get("price") as string | null;
    const duration = formData.get("duration") as string | null;
    const category = formData.get("category") as string | null;
    const imagesToDeleteRaw = formData.get("imagesToDelete") as string | null;
    const imagesToDelete: string[] = imagesToDeleteRaw ? JSON.parse(imagesToDeleteRaw) : [];

    /* =========================
       1. DELETE OLD IMAGES
       (legacy matched by filename on local disk; images are now full R2
       URLs stored verbatim, so an exact URL match is used instead)
    ========================= */
    if (imagesToDelete.length > 0) {
      course.images = course.images.filter(
        (img: { imageUrl: string }) => !imagesToDelete.includes(img.imageUrl)
      );

      for (const imgUrl of imagesToDelete) {
        const key = keyFromR2Url(imgUrl);
        if (key) {
          await deleteFromR2(key).catch(() => {});
        }
      }
    }

    /* =========================
       2. UPDATE BASIC FIELDS
    ========================= */
    if (title) course.title = title;
    if (description) course.description = description;
    if (price) course.price = price;
    if (duration) course.duration = duration;
    if (category) course.category = category;

    /* =========================
       3. UPDATE THUMBNAIL
    ========================= */
    const thumbnailFile = formData.get("thumbnail");
    if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
      if (course.thumbnail) {
        const oldKey = keyFromR2Url(course.thumbnail);
        if (oldKey) {
          await deleteFromR2(oldKey).catch(() => {});
        }
      }
      const { url } = await uploadToR2("courses", thumbnailFile);
      course.thumbnail = url;
    }

    /* =========================
       4. ADD NEW IMAGES
    ========================= */
    const imageFiles = formData.getAll("images");
    const newImages: { imageUrl: string }[] = [];
    for (const file of imageFiles) {
      if (file instanceof File && file.size > 0) {
        const { url } = await uploadToR2("courses", file);
        newImages.push({ imageUrl: url });
      }
    }
    if (newImages.length > 0) {
      course.images.push(...newImages);
    }

    await course.save();

    return NextResponse.json({
      message: "Course updated successfully",
      data: course,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
