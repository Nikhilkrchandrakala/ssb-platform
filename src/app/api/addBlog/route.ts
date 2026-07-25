import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Blog } from "@/server/models";
import { uploadToR2 } from "@/server/storage/r2";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const title = formData.get("title") as string | null;
    const shortDescription = formData.get("shortDescription") as string | null;
    const content = formData.get("content") as string | null;
    const authorName = formData.get("authorName") as string | null;
    const authorQuote = formData.get("authorQuote") as string | null;
    const timeDuration = formData.get("timeDuration") as string | null;
    const imageTexts = formData.getAll("imageTexts").map((v) => String(v));

    if (!title || !shortDescription || !content || !authorName) {
      return NextResponse.json({ message: "All required fields missing" }, { status: 400 });
    }

    await connectDB();

    const imageFiles = formData.getAll("images");
    const images: { imageUrl: string; imageText: string }[] = [];
    let index = 0;
    for (const file of imageFiles) {
      if (file instanceof File && file.size > 0) {
        const { url } = await uploadToR2("blogs", file);
        images.push({ imageUrl: url, imageText: imageTexts[index] || "" });
      }
      index++;
    }

    const blog = new Blog({
      title,
      shortDescription,
      content,
      images,
      authorName,
      authorQuote: authorQuote || "",
      timeDuration: timeDuration || "",
      createdBy: String(user._id),
    });

    await blog.save();

    return NextResponse.json(
      { message: "Blog created successfully", data: blog },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
