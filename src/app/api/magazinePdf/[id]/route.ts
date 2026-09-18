import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { MagazinePdf } from "@/server/models";
import { getCurrentUser } from "@/server/auth";
import { isSignedUpSiteUser } from "@/lib/siteAccess";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();

    const data = await MagazinePdf.findById(id);
    if (!data) {
      return NextResponse.json({ message: "Magazine PDF not found" }, { status: 404 });
    }

    // Same gate as /api/allMagazinePdfs — the file path only goes to a genuine
    // signed-up account, otherwise this by-id route would bypass it.
    const user = await getCurrentUser();
    if (isSignedUpSiteUser(user)) return NextResponse.json(data, { status: 200 });
    const obj = data.toObject();
    delete obj.pdfFilePath;
    return NextResponse.json(obj, { status: 200 });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
