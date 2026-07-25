import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Blog } from "@/server/models";

export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const blogs = await Blog.find().sort({ createdAt: -1 });
    return NextResponse.json(blogs);
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
