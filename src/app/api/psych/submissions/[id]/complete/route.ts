import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Submission } from "@/server/models/Submission";
import { User } from "@/server/models/User";
import { requireUser } from "../../../_lib/auth";
import { getEvaluationRecipientIds, notifyRecipients } from "../../../_lib/notify";

type Params = { params: Promise<{ id: string }> };

// POST /api/psych/submissions/:id/complete
export async function POST(_req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  try {
    const submission = await Submission.findById(id).select("-piqFileData");
    if (!submission) return NextResponse.json({ message: "Submission not found" }, { status: 404 });

    (submission as unknown as Record<string, unknown>).status = "PENDING_UPLOAD";
    (submission as unknown as Record<string, unknown>).workflowStage = "EVALUATION_COMPLETED";
    await submission.save();

    const student = await User.findById(submission.userId);
    const recipientIds = await getEvaluationRecipientIds(student);
    const candidateName = student ? student.name : "Candidate";

    await notifyRecipients(recipientIds, {
      studentId: submission.userId,
      submissionId: submission._id,
      title: "Candidate Evaluation Completed",
      message: `Candidate ${candidateName} has completed their Evaluation.`,
    });

    return NextResponse.json({ message: "Evaluation marked as complete", submission });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
