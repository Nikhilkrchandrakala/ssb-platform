import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Slot } from "@/server/models";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();

  const slot = await Slot.findById(id);

  if (!slot) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json(slot);
}
