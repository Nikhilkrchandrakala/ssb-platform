import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { MagazinePdf } from "@/server/models";

export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const data = await MagazinePdf.find({});
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
