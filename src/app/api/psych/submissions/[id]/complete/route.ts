import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Submission } from "@/server/models/Submission";
import { User } from "@/server/models/User";
import { requireUser, userId, isStaff, forbidden } from "../../../_lib/auth";
import { getEvaluationRecipientIds, notifyRecipients } from "../../../_lib/notify";
import { resolveAllotmentForOrder } from "@/server/psychAllotment";

type Params = { params: Promise<{ id: string }> };

// Statuses further along than "test just finished" — a candidate re-calling
// this route must never move a submission backwards out of these.
const ADVANCED_STATUSES = ["PENDING_UPLOAD", "COMPLETED", "UPLOADED", "REVIEW_PENDING", "REPORT_RELEASED", "MEETING_SCHEDULED"];

// POST /api/psych/submissions/:id/complete — called by the candidate's own
// test screen when they finish the timed test (staff may also call it). The
// 2026-09-19 security hardening made this staff-only, which silently blocked
// every real candidate (the client just logs the 403), so a candidate may now
// complete *their own* submission only, and only after having started the
// evaluation (consent recorded by the dashboard's "Start" button).
export async function POST(_req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const callerIsStaff = isStaff(auth.user);

  try {
    const submission = await Submission.findById(id).select("-piqFileData");
    if (!submission) return NextResponse.json({ message: "Submission not found" }, { status: 404 });

    const record = submission as unknown as Record<string, unknown>;

    if (!callerIsStaff) {
      if (String(submission.userId) !== userId(auth.user)) return forbidden();
      const self = await User.findById(submission.userId).select("hasPsychTheoryConsent");
      if (!self?.hasPsychTheoryConsent) {
        return NextResponse.json({ message: "Start the evaluation from your dashboard first." }, { status: 403 });
      }
      // Already marked complete — idempotent, no duplicate notifications.
      if (record.workflowStage === "EVALUATION_COMPLETED") {
        return NextResponse.json({ message: "Evaluation marked as complete", submission });
      }
      if (!ADVANCED_STATUSES.includes(String(record.status))) record.status = "PENDING_UPLOAD";
      if (!record.completedAt) record.completedAt = new Date();
    } else {
      record.status = "PENDING_UPLOAD";
    }
    record.workflowStage = "EVALUATION_COMPLETED";
    await submission.save();

    const student = await User.findById(submission.userId);
    const allotment = await resolveAllotmentForOrder(submission.orderId ? String(submission.orderId) : null, String(submission.userId));
    const recipientIds = await getEvaluationRecipientIds({
      _id: submission.userId,
      assignedIO: allotment.assignedIO,
      assignedTO: allotment.assignedTO,
      assignedPsych: allotment.assignedPsych,
    });
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
