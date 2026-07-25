import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { MagazinePdf } from "@/server/models";
import { uploadToR2 } from "@/server/storage/r2";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const pdfTitle = formData.get("pdfTitle") as string | null;
    const tags = formData.get("tags") as string | null;
    const pdfFile = formData.get("magazinePdf");
    const imageFile = formData.get("magazineFrontImage");

    if (!pdfTitle || !tags) {
      return NextResponse.json({ message: "Title and tags are required" }, { status: 400 });
    }
    if (!(pdfFile instanceof File) || pdfFile.size === 0) {
      return NextResponse.json({ message: "magazinePdf file is required" }, { status: 400 });
    }
    if (!(imageFile instanceof File) || imageFile.size === 0) {
      return NextResponse.json({ message: "magazineFrontImage file is required" }, { status: 400 });
    }

    await connectDB();

    const { url: pdfFilePath } = await uploadToR2("magazine", pdfFile);
    const { url: magazineFrontImage } = await uploadToR2("magazine", imageFile);

    const newMagazinePdf = new MagazinePdf({
      pdfTitle,
      pdfFilePath,
      magazineFrontImage,
      tags,
    });

    const data = await newMagazinePdf.save();

    return NextResponse.json(
      { message: "Successfully uploaded Magazine PDF and image", data },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error during upload:", err);
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
