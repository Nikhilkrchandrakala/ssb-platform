import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Course } from "@/server/models";
import { uploadToR2 } from "@/server/storage/r2";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const price = formData.get("price") as string | null;
    const duration = formData.get("duration") as string | null;
    const category = formData.get("category") as string | null;

    if (!title) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 });
    }

    await connectDB();

    // thumbnail (single file, R2 replaces the legacy local disk destination)
    let thumbnail = "";
    const thumbnailFile = formData.get("thumbnail");
    if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
      const { url } = await uploadToR2("courses", thumbnailFile);
      thumbnail = url;
    }

    // multiple images
    const images: { imageUrl: string }[] = [];
    const imageFiles = formData.getAll("images");
    for (const file of imageFiles) {
      if (file instanceof File && file.size > 0) {
        const { url } = await uploadToR2("courses", file);
        images.push({ imageUrl: url });
      }
    }

    const course = new Course({
      title,
      description,
      price,
      duration,
      category,
      thumbnail,
      images,
      createdBy: String(user._id),
    });

    await course.save();

    return NextResponse.json(
      {
        message: "Course created successfully",
        data: course,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
