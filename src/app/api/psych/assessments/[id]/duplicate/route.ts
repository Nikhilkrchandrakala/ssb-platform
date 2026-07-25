import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Assessment } from "@/server/models/Assessment";
import { Slide } from "@/server/models/Slide";
import { requireUser, requireAdmin, userId } from "../../../_lib/auth";

type Params = { params: Promise<{ id: string }> };

// POST /api/psych/assessments/:id/duplicate — admin/owner only. Clones the
// assessment (inactive by default) and all of its slides.
export async function POST(_req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const forbidden = requireAdmin(auth.user);
  if (forbidden) return forbidden;
  const { id } = await params;

  try {
    const originalAssessment = await Assessment.findById(id);
    if (!originalAssessment) {
      return NextResponse.json({ message: "Original assessment not found" }, { status: 404 });
    }

    const assessmentData = originalAssessment.toObject() as Record<string, unknown>;
    delete assessmentData._id;
    delete assessmentData.id;
    assessmentData.title = `${assessmentData.title} (Copy)`;
    assessmentData.active = false;
    assessmentData.createdBy = userId(auth.user);

    const newAssessment = new Assessment(assessmentData);
    await newAssessment.save();

    const originalSlides = await Slide.find({ assessmentId: id });
    if (originalSlides.length > 0) {
      const clonedSlides = originalSlides.map((slide) => {
        const slideData = slide.toObject() as Record<string, unknown>;
        delete slideData._id;
        delete slideData.id;
        slideData.assessmentId = newAssessment._id;
        return slideData;
      });
      await Slide.insertMany(clonedSlides);
    }

    return NextResponse.json(newAssessment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
