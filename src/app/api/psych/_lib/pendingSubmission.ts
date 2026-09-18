import { User } from "@/server/models/User";
import { Assessment } from "@/server/models/Assessment";
import { Submission } from "@/server/models/Submission";
import { Order } from "@/server/models/Order";
import { resolveAllotmentForOrder } from "@/server/psychAllotment";

/**
 * GET /api/psych/submissions synthesizes pseudo-submission ids for allotted
 * (candidate, batch) pairs who haven't uploaded/started anything yet —
 * `pending-order-<orderId>` for a real paid batch, or `pending-user-<userId>`
 * for the rare manually-created candidate whose allotment only exists on
 * User because they have no real paid Order at all. GET/PUT
 * submission-by-id and the broadcast route all accept either pseudo-id and
 * materialize a real Submission document for it on first touch.
 */
export async function resolvePendingSubmissionId(
  id: string
): Promise<{ id: string } | { error: { message: string; status: number } }> {
  if (!id.startsWith("pending-")) return { id };

  const isOrderScoped = id.startsWith("pending-order-");
  const rawId = isOrderScoped ? id.substring("pending-order-".length) : id.substring("pending-user-".length);

  const orderId = isOrderScoped ? rawId : null;
  const allotment = await resolveAllotmentForOrder(orderId, isOrderScoped ? undefined : rawId);

  // For an order-scoped pseudo-id, the candidate is the order's own buyer;
  // for a user-scoped one, rawId already is the candidate id.
  let candidateId = isOrderScoped ? null : rawId;
  if (isOrderScoped) {
    const order = await Order.findById(orderId).select("userId");
    if (!order) return { error: { message: "Enrollment not found", status: 404 } };
    candidateId = String(order.userId);
  }

  const candidateUser = await User.findById(candidateId);
  if (!candidateUser) {
    return { error: { message: "Candidate not found", status: 404 } };
  }

  const activeAssessment = await Assessment.findOne({ active: true });
  const assessmentId = activeAssessment ? activeAssessment._id : null;

  let submission = orderId
    ? await Submission.findOne({ userId: candidateId, orderId })
    : await Submission.findOne({ userId: candidateId, orderId: null });
  if (!submission) {
    const gtoStatus = allotment.assignedGTO ? "PENDING" : "NOT_REQUIRED";
    const ioStatus = allotment.assignedIO ? "PENDING" : "NOT_REQUIRED";
    const toStatus = allotment.assignedTO ? "PENDING" : "NOT_REQUIRED";
    const psychStatus = allotment.assignedPsych ? "PENDING" : "NOT_REQUIRED";

    submission = new Submission({
      userId: candidateId,
      orderId,
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
