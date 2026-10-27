import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { connectDB } from "@/server/db";
import { SoftSkillsSubmission } from "@/server/models";

/**
 * POST /api/admin/softskills/feedback
 * Body: { submissionId?: string, slotId?: string, userId?: string, feedback: string }
 * Submits mentor feedback for the student's video portfolio and sets status to COMPLETED.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(currentUser, "softskills_evaluation")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { submissionId, slotId, userId, feedback } = body;

    if (!feedback || typeof feedback !== "string" || !feedback.trim()) {
      return NextResponse.json({ error: "Feedback remarks are required" }, { status: 400 });
    }

    await connectDB();

    let submission: any = null;

    if (submissionId) {
      submission = await SoftSkillsSubmission.findById(submissionId);
    } else if (slotId && userId) {
      submission = await SoftSkillsSubmission.findOne({ slotId, userId });
    }

    if (!submission) {
      return NextResponse.json({ error: "Submission record not found" }, { status: 404 });
    }

    submission.feedback = feedback.trim();
    submission.status = "COMPLETED";
    submission.reviewedAt = new Date();
    submission.reviewedBy = currentUser._id;

    await submission.save();

    return NextResponse.json({
      success: true,
      message: "Feedback submitted and published successfully!",
      submission,
    });
  } catch (err) {
    console.error("[POST /api/admin/softskills/feedback] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save feedback" },
      { status: 500 }
    );
  }
}
