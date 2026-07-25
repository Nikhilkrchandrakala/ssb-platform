import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Course } from "@/server/models";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();

  const course = await Course.findById(id);

  if (!course) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json(course);
}
