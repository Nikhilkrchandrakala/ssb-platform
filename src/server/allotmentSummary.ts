import { User } from "@/server/models";

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
 */
export async function computeBatchAllotmentSummary(batch: string): Promise<AssessorAllotmentCount[]> {
  const students = await User.find({ role: "student", batch }).select(
    "assignedGTO assignedTO assignedPsych assignedIO"
  );

  const candidatesByAssessor = new Map<string, Set<string>>();
  for (const s of students) {
    const assessorIds = [s.assignedGTO, s.assignedTO, s.assignedPsych, s.assignedIO].filter(Boolean).map(String);
    for (const assessorId of assessorIds) {
      if (!candidatesByAssessor.has(assessorId)) candidatesByAssessor.set(assessorId, new Set());
      candidatesByAssessor.get(assessorId)!.add(String(s._id));
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
