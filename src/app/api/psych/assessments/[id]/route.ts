import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Assessment } from "@/server/models/Assessment";
import { Slide } from "@/server/models/Slide";
import { requireUser, requireAdmin } from "../../_lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/psych/assessments/:id
export async function GET(_req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  try {
    const assessment = await Assessment.findById(id);
    if (!assessment) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(assessment);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

// PUT /api/psych/assessments/:id — admin/owner only.
export async function PUT(req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const forbidden = requireAdmin(auth.user);
  if (forbidden) return forbidden;
  const { id } = await params;

  try {
    const assessment = await Assessment.findById(id);
    if (!assessment) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const body = await req.json();
    // Manually apply updates and save (not findByIdAndUpdate) to trigger full
    // schema validation and Map processing for `modules`, matching legacy.
    Object.assign(assessment, body);
    await assessment.save();

    return NextResponse.json(assessment);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}

// DELETE /api/psych/assessments/:id — admin/owner only. Cascades slide deletion.
export async function DELETE(_req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const forbidden = requireAdmin(auth.user);
  if (forbidden) return forbidden;
  const { id } = await params;

  try {
    await Assessment.findByIdAndDelete(id);
    await Slide.deleteMany({ assessmentId: id });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
