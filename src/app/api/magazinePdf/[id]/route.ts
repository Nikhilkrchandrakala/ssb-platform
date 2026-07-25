import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { MagazinePdf } from "@/server/models";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();

    const data = await MagazinePdf.findById(id);
    if (!data) {
      return NextResponse.json({ message: "Magazine PDF not found" }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
