import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Gallery } from "@/server/models";

export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const data = await Gallery.find().sort({ createdAt: -1 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
