import { User, Order, Slot } from "@/server/models";

export interface AssessorAllotmentCount {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  assessorType?: string;
  count: number;
}

/**
 * For a given batch, counts how many distinct candidates each assessor has
 * been allotted (across GTO/TO/Psych/IO — a candidate assigned to the same
 * assessor under two roles still counts once, via the Set). Shared by the
 * summary GET route (preview) and the notify POST route (recompute fresh
 * right before sending, never trust a client-submitted count).
 *
 * Reads allotment off paid Orders now, not User — assignedGTO/TO/Psych/IO
 * moved there so a student's second batch no longer overwrites the first
 * (see AllotmentView.tsx). "Batch" here is the Slot's batchNo the order was
 * paid for.
 */
export async function computeBatchAllotmentSummary(batch: string): Promise<AssessorAllotmentCount[]> {
  const slotIds = await Slot.distinct("_id", { batchNo: batch });
  const orders = await Order.find({ status: "paid", slotId: { $in: slotIds } }).select(
    "userId assignedGTO assignedTO assignedPsych assignedIO"
  );

  const candidatesByAssessor = new Map<string, Set<string>>();
  for (const o of orders) {
    const assessorIds = [o.assignedGTO, o.assignedTO, o.assignedPsych, o.assignedIO].filter(Boolean).map(String);
    for (const assessorId of assessorIds) {
      if (!candidatesByAssessor.has(assessorId)) candidatesByAssessor.set(assessorId, new Set());
      candidatesByAssessor.get(assessorId)!.add(String(o.userId));
    }
  }

  const assessorIds = Array.from(candidatesByAssessor.keys());
  if (assessorIds.length === 0) return [];

  const assessors = await User.find({ _id: { $in: assessorIds } }).select("name email phone assessorType");

  return assessors
    .map((a) => ({
      id: String(a._id),
      name: a.name as string,
      email: a.email as string | undefined,
      phone: a.phone as string | undefined,
      assessorType: a.assessorType as string | undefined,
      count: candidatesByAssessor.get(String(a._id))!.size,
    }))
    .sort((a, b) => b.count - a.count);
}
