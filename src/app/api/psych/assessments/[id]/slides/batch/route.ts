import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Slide } from "@/server/models/Slide";
import { requireUser, requireAdmin } from "../../../../_lib/auth";

type Params = { params: Promise<{ id: string }> };

interface SlideInput {
  id?: string;
  [key: string]: unknown;
}

// POST /api/psych/assessments/:id/slides/batch — admin/owner only. Upserts
// the full slide set for an assessment; anything not present in `slides` and
// not a "new-*" placeholder id is deleted.
export async function POST(req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const forbidden = requireAdmin(auth.user);
  if (forbidden) return forbidden;
  const { id: assessmentId } = await params;

  try {
    const body = await req.json();
    const slides: SlideInput[] = body.slides || [];
    const incomingIds = slides.map((s) => s.id).filter((sid): sid is string => !!sid && !sid.startsWith("new-"));
    await Slide.deleteMany({ assessmentId, _id: { $nin: incomingIds } });

    const results = [];
    for (const slideData of slides) {
      if (slideData.id && !slideData.id.startsWith("new-")) {
        const updated = await Slide.findByIdAndUpdate(slideData.id, slideData, { new: true });
        results.push(updated);
      } else {
        const newSlide = new Slide({ ...slideData, assessmentId, _id: undefined });
        await newSlide.save();
        results.push(newSlide);
      }
    }
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
