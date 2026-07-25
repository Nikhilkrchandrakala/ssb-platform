import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Blog } from "@/server/models";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();

    const blog = await Blog.findById(id);
    if (!blog) {
      return NextResponse.json({ status: "error", message: "Blog not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "ok", data: blog }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
