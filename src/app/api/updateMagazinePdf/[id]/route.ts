import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { MagazinePdf } from "@/server/models";
import { uploadToR2, deleteFromR2, keyFromR2Url } from "@/server/storage/r2";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    await connectDB();

    const existingPdf = await MagazinePdf.findById(id);
    if (!existingPdf) {
      return NextResponse.json({ message: "Magazine PDF not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const pdfTitle = formData.get("pdfTitle") as string | null;
    const tags = formData.get("tags") as string | null;
    const pdfFile = formData.get("magazinePdf");
    const imageFile = formData.get("magazineFrontImage");

    if (pdfFile instanceof File && pdfFile.size > 0) {
      const oldKey = keyFromR2Url(existingPdf.pdfFilePath);
      if (oldKey) {
        await deleteFromR2(oldKey).catch((err) => console.error("Error deleting old PDF:", err));
      }
      const { url } = await uploadToR2("magazine", pdfFile);
      existingPdf.pdfFilePath = url;
    }

    if (imageFile instanceof File && imageFile.size > 0) {
      const oldKey = keyFromR2Url(existingPdf.magazineFrontImage);
      if (oldKey) {
        await deleteFromR2(oldKey).catch((err) => console.error("Error deleting old image:", err));
      }
      const { url } = await uploadToR2("magazine", imageFile);
      existingPdf.magazineFrontImage = url;
    }

    if (pdfTitle) existingPdf.pdfTitle = pdfTitle;
    if (tags) existingPdf.tags = tags;

    await existingPdf.save();

    return NextResponse.json(
      { message: "Successfully updated the Magazine PDF and image", data: existingPdf },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error updating Magazine PDF:", err);
    return NextResponse.json(
      {
        message: "An error occurred while updating the PDF and image",
        error: err instanceof Error ? err.message : "Error",
      },
      { status: 500 }
    );
  }
}
