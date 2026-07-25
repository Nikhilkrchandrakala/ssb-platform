import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { MagazinePdf } from "@/server/models";
import { deleteFromR2, keyFromR2Url } from "@/server/storage/r2";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const pdfKey = keyFromR2Url(existingPdf.pdfFilePath);
    if (pdfKey) {
      await deleteFromR2(pdfKey).catch((err) => console.error("Error deleting PDF file:", err));
    }

    const imageKey = keyFromR2Url(existingPdf.magazineFrontImage);
    if (imageKey) {
      await deleteFromR2(imageKey).catch((err) => console.error("Error deleting image file:", err));
    }

    await MagazinePdf.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Successfully deleted the Magazine PDF and image" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error deleting Magazine PDF:", err);
    return NextResponse.json(
      {
        message: "An error occurred while deleting the PDF and image",
        error: err instanceof Error ? err.message : "Error",
      },
      { status: 500 }
    );
  }
}
