import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Slide } from "@/server/models/Slide";
import { requireUser } from "../../../_lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/psych/assessments/:id/slides?module=TAT
export async function GET(req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  try {
    const query: Record<string, unknown> = { assessmentId: id };
    const moduleParam = req.nextUrl.searchParams.get("module");
    if (moduleParam) query.module = moduleParam;

    const slides = await Slide.find(query).sort("module order");
    return NextResponse.json(slides);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
