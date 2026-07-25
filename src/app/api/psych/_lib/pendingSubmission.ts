import { User } from "@/server/models/User";
import { Assessment } from "@/server/models/Assessment";
import { Submission } from "@/server/models/Submission";

/**
 * Legacy psych_battery synthesized "pending-<candidateId>" pseudo-submission
 * ids in the GET /api/submissions list response, for allotted candidates who
 * hadn't uploaded/started anything yet. GET/PUT submission-by-id and the
 * broadcast route all accept that pseudo-id and materialize a real
 * Submission document for it on first touch. Ported verbatim.
 */
export async function resolvePendingSubmissionId(
  id: string
): Promise<{ id: string } | { error: { message: string; status: number } }> {
  if (!id.startsWith("pending-")) return { id };

  const candidateId = id.substring(8);
  const candidateUser = await User.findById(candidateId);
  if (!candidateUser) {
    return { error: { message: "Candidate not found", status: 404 } };
  }

  const activeAssessment = await Assessment.findOne({ active: true });
  const assessmentId = activeAssessment ? activeAssessment._id : null;

  let submission = await Submission.findOne({ userId: candidateId });
  if (!submission) {
    const gtoStatus = candidateUser.assignedGTO ? "PENDING" : "NOT_REQUIRED";
    const ioStatus = candidateUser.assignedIO ? "PENDING" : "NOT_REQUIRED";
    const toStatus = candidateUser.assignedTO ? "PENDING" : "NOT_REQUIRED";
    const psychStatus = candidateUser.assignedPsych ? "PENDING" : "NOT_REQUIRED";

    submission = new Submission({
      userId: candidateId,
      assessmentId,
      status: "PENDING",
      startedAt: null,
      psychStatus,
      gtoStatus,
      ioStatus,
      toStatus,
    });
    await submission.save();
  }

  return { id: String(submission._id) };
}
