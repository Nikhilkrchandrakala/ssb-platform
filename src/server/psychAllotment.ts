import { Order, User, Slot } from "@/server/models";

export interface ResolvedAllotment {
  orderId: string | null;
  assignedGTO: string | null;
  assignedTO: string | null;
  assignedPsych: string | null;
  assignedIO: string | null;
  assignedAssessments: string[];
  // Offline candidates are evaluated in person during their batch — the
  // whole self-service PIQ/timed-test/dossier journey doesn't apply to
  // them, only the assessor's own scoring/remarks. Derived from the
  // order's own slot (an offline batch), falling back to the student's
  // User.enrollmentMode for the no-real-order edge cases.
  isOffline: boolean;
  // Whether a super-admin has unlocked online uploads for this offline student.
  uploadsUnlocked: boolean;
  // The specific batch number for this enrollment (from the order's slot).
  // Prevents multi-batch candidates from having all their cards display the same
  // overwritten global User.batch string.
  batchNo: string | null;
}

async function getSlotDetails(slotIdOrObj: unknown): Promise<{ isOffline: boolean; batchNo: string | null }> {
  if (!slotIdOrObj) return { isOffline: false, batchNo: null };
  if (typeof slotIdOrObj === "object" && slotIdOrObj !== null && "mode" in slotIdOrObj) {
    const slotObj = slotIdOrObj as { mode?: string; batchNo?: string };
    return {
      isOffline: slotObj.mode === "offline",
      batchNo: slotObj.batchNo ? slotObj.batchNo.trim() : null,
    };
  }
  const slot = await Slot.findById(slotIdOrObj).select("mode batchNo");
  return {
    isOffline: slot?.mode === "offline",
    batchNo: slot?.batchNo ? slot.batchNo.trim() : null,
  };
}

async function fromOrder(order: {
  _id: unknown;
  assignedGTO?: unknown;
  assignedTO?: unknown;
  assignedPsych?: unknown;
  assignedIO?: unknown;
  assignedAssessments?: unknown[];
  slotId?: unknown;
  uploadsUnlocked?: boolean;
}): Promise<ResolvedAllotment> {
  const slotDetails = await getSlotDetails(order.slotId);
  return {
    orderId: String(order._id),
    assignedGTO: order.assignedGTO ? String(order.assignedGTO) : null,
    assignedTO: order.assignedTO ? String(order.assignedTO) : null,
    assignedPsych: order.assignedPsych ? String(order.assignedPsych) : null,
    assignedIO: order.assignedIO ? String(order.assignedIO) : null,
    assignedAssessments: (order.assignedAssessments || []).map(String),
    isOffline: slotDetails.isOffline,
    uploadsUnlocked: !!order.uploadsUnlocked,
    batchNo: slotDetails.batchNo,
  };
}

async function fromUserFallback(userId: string): Promise<ResolvedAllotment> {
  const user = await User.findById(userId).select("assignedGTO assignedTO assignedPsych assignedIO assignedAssessments enrollmentMode batch");
  return {
    orderId: null,
    assignedGTO: user?.assignedGTO ? String(user.assignedGTO) : null,
    assignedTO: user?.assignedTO ? String(user.assignedTO) : null,
    assignedPsych: user?.assignedPsych ? String(user.assignedPsych) : null,
    assignedIO: user?.assignedIO ? String(user.assignedIO) : null,
    assignedAssessments: (user?.assignedAssessments || []).map(String),
    isOffline: user?.enrollmentMode === "offline",
    uploadsUnlocked: false,
    batchNo: user?.batch ? user.batch.trim() : null,
  };
}

/**
 * Resolves assessor allotment for a specific Order (batch enrollment) —
 * the per-batch source of truth since assignedGTO/TO/Psych/IO/
 * assignedAssessments moved off User onto Order. Falls back to the
 * student's User-level fields only if the order itself can't be found
 * (deleted order, bad id) — covers the same "no real purchase" edge cases
 * `resolveCurrentAllotmentForUser` handles for manually-created candidates.
 */
export async function resolveAllotmentForOrder(
  orderId: string | null | undefined,
  fallbackUserId?: string,
): Promise<ResolvedAllotment> {
  if (orderId) {
    const order = await Order.findById(orderId).select(
      "assignedGTO assignedTO assignedPsych assignedIO assignedAssessments slotId uploadsUnlocked",
    );
    if (order) return fromOrder(order);
  }
  if (fallbackUserId) return fromUserFallback(fallbackUserId);
  return {
    orderId: null,
    assignedGTO: null,
    assignedTO: null,
    assignedPsych: null,
    assignedIO: null,
    assignedAssessments: [],
    isOffline: false,
    uploadsUnlocked: false,
    batchNo: null,
  };
}

/**
 * Resolves a student's "current" allotment when there's no specific Order
 * in scope yet (e.g. materializing their first-ever Submission) — their
 * most recent paid Order, same rule used by
 * scripts/migrate-allotment-to-orders.ts and the Allotment hotfix. Falls
 * back to their User-level fields if they have no paid Order at all
 * (manually-created candidates with an allotment but no real purchase).
 */
export async function resolveCurrentAllotmentForUser(
  userId: string,
): Promise<ResolvedAllotment> {
  const mostRecentPaidOrder = await Order.findOne({ userId, status: "paid" })
    .sort({ createdAt: -1 })
    .select(
      "assignedGTO assignedTO assignedPsych assignedIO assignedAssessments slotId uploadsUnlocked",
    );
  if (mostRecentPaidOrder) return fromOrder(mostRecentPaidOrder);
  return fromUserFallback(userId);
}
