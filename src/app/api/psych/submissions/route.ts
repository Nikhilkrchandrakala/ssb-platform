import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Submission } from "@/server/models/Submission";
import { Order } from "@/server/models/Order";
import { User } from "@/server/models/User";
import { requireUser, userId } from "../_lib/auth";
import { resolveAllotmentForOrder, resolveCurrentAllotmentForUser } from "@/server/psychAllotment";

type AssessorType = "GTO" | "TO" | "Psych" | "IO";
type AssignedField = "assignedGTO" | "assignedTO" | "assignedPsych" | "assignedIO";

function fieldForAssessorType(type: AssessorType): AssignedField {
  if (type === "GTO") return "assignedGTO";
  if (type === "TO") return "assignedTO";
  if (type === "Psych") return "assignedPsych";
  return "assignedIO";
}

interface CandidatePair {
  orderId: string | null; // null only for a candidate with no real paid Order at all
  userId: string;
}

// One (candidate, batch) pair per allotment — the same candidate can appear
// twice if they're allotted on two different paid batches. Reads Order as
// the source of truth, and additionally includes any manually-created
// candidate whose allotment only ever existed on User because they have no
// real purchase (orderId: null in that case — mirrors psychAllotment.ts's
// same fallback rule).
async function findAssignedCandidatePairs(matchOrderQuery: Record<string, unknown>, matchUserQuery: Record<string, unknown>): Promise<CandidatePair[]> {
  const orders = await Order.find({ ...matchOrderQuery, status: "paid" }).select("_id userId");
  const pairs: CandidatePair[] = orders.map((o) => ({ orderId: String(o._id), userId: String(o.userId) }));

  const usersMatched = await User.find(matchUserQuery).select("_id");
  const paidOrderUserIds = new Set((await Order.distinct("userId", { status: "paid" })).map(String));
  for (const u of usersMatched) {
    if (!paidOrderUserIds.has(String(u._id))) {
      pairs.push({ orderId: null, userId: String(u._id) });
    }
  }
  return pairs;
}

// GET /api/psych/submissions
export async function GET() {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const uid = userId(user);

  try {
    if (user.role === "student") {
      // Students see ALL of their own submissions, undeduplicated — one per
      // batch is exactly what the per-batch dashboard UI needs.
      const submissions = await Submission.find({ userId: uid })
        .select("-piqFileData")
        .populate("userId", "name email profileImage chestNo batch")
        .populate("assessmentId", "title type")
        .sort({ updatedAt: -1 });
      const studentSubmissions = await Promise.all(
        submissions.map(async (sub) => {
          const subJSON = sub.toJSON ? sub.toJSON() : sub;
          const orderId = (subJSON as Record<string, unknown>).orderId as string | null | undefined;
          const allotment = await resolveAllotmentForOrder(orderId, uid);
          return { ...subJSON, student: (subJSON as Record<string, unknown>).userId, isOffline: allotment.isOffline };
        })
      );
      return NextResponse.json(studentSubmissions);
    }

    // Assessor/admin/owner: resolve which (candidate, batch) pairs are in
    // scope first, since assessor allotment lives per-Order now.
    let pairs: CandidatePair[];
    if (user.role === "assessor") {
      const assessor = await User.findById(uid);
      const assessorType = (assessor as unknown as { assessorType?: AssessorType } | null)?.assessorType;
      if (!assessor || !assessorType) {
        pairs = [];
      } else {
        const field = fieldForAssessorType(assessorType);
        pairs = await findAssignedCandidatePairs({ [field]: uid }, { [field]: uid });
      }
    } else {
      // Admins/owners see every (candidate, batch) pair with at least one assigned assessor.
      const anyAssignedCondition = {
        $or: [
          { assignedPsych: { $exists: true, $ne: null } },
          { assignedGTO: { $exists: true, $ne: null } },
          { assignedIO: { $exists: true, $ne: null } },
          { assignedTO: { $exists: true, $ne: null } },
        ],
      };
      pairs = await findAssignedCandidatePairs(anyAssignedCondition, anyAssignedCondition);
    }

    const candidateUserIds = [...new Set(pairs.map((p) => p.userId))];
    const candidateUsers = await User.find({ _id: { $in: candidateUserIds } }).select(
      "_id name email clinicalStage profileImage chestNo batch"
    );
    const candidateUserById = new Map(candidateUsers.map((u) => [String(u._id), u]));

    const submissions = await Submission.find({
      $or: [{ assessorId: uid }, { userId: { $in: candidateUserIds } }],
    })
      .select("-piqFileData")
      .populate("assessmentId", "title type")
      .sort({ updatedAt: -1 });

    // One row per (candidate, batch) pair — a candidate allotted on two
    // batches now legitimately gets two rows instead of being collapsed to
    // whichever submission was updated most recently.
    const pairKey = (userId: string, orderId: string | null) => `${userId}:${orderId ?? "none"}`;
    const mappedByPair = new Map<string, Record<string, unknown>>();

    for (const sub of submissions) {
      const subUserId = String(sub.userId);
      const subOrderId = sub.orderId ? String(sub.orderId) : null;
      const key = pairKey(subUserId, subOrderId);
      if (mappedByPair.has(key)) continue; // already-seen pair, keep the most-recently-updated (sorted above)

      const candidateUser = candidateUserById.get(subUserId);
      const allotment = await resolveAllotmentForOrder(subOrderId, subUserId);
      const subJSON = sub.toJSON ? (sub.toJSON() as Record<string, unknown>) : (sub as unknown as Record<string, unknown>);
      mappedByPair.set(key, {
        ...subJSON,
        student: candidateUser
          ? {
              ...(candidateUser.toJSON ? candidateUser.toJSON() : candidateUser),
              assignedGTO: allotment.assignedGTO,
              assignedTO: allotment.assignedTO,
              assignedPsych: allotment.assignedPsych,
              assignedIO: allotment.assignedIO,
            }
          : null,
        isOffline: allotment.isOffline,
      });
    }

    // Append pending rows for allotted (candidate, batch) pairs with no submission yet.
    for (const pair of pairs) {
      const key = pairKey(pair.userId, pair.orderId);
      if (mappedByPair.has(key)) continue;

      const candidateUser = candidateUserById.get(pair.userId);
      if (!candidateUser) continue;
      const allotment = await resolveAllotmentForOrder(pair.orderId, pair.userId);
      const pseudoId = pair.orderId ? `pending-order-${pair.orderId}` : `pending-user-${pair.userId}`;
      mappedByPair.set(key, {
        id: pseudoId,
        _id: pseudoId,
        userId: pair.userId,
        orderId: pair.orderId,
        status: "PENDING",
        student: {
          ...(candidateUser.toObject ? candidateUser.toObject() : candidateUser),
          assignedGTO: allotment.assignedGTO,
          assignedTO: allotment.assignedTO,
          assignedPsych: allotment.assignedPsych,
          assignedIO: allotment.assignedIO,
        },
        isOffline: allotment.isOffline,
        assessmentId: null,
        startedAt: null,
      });
    }

    let mappedSubmissions = Array.from(mappedByPair.values());

    // Admins/owners only ever see students with at least one assigned assessor.
    if (user.role === "admin" || user.role === "owner") {
      mappedSubmissions = mappedSubmissions.filter((sub) => {
        const st = sub.student as Record<string, unknown> | undefined;
        if (!st) return false;
        return st.assignedPsych || st.assignedGTO || st.assignedIO || st.assignedTO;
      });
    }

    return NextResponse.json(mappedSubmissions);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

// POST /api/psych/submissions — creates or updates-in-place the caller's
// submission for the given assessment (one submission per user+assessment).
export async function POST(req: NextRequest) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const uid = userId(user);

  try {
    const body = await req.json();

    let submission = await Submission.findOne({ userId: uid, assessmentId: body.assessmentId });

    if (submission) {
      // Protect terminal/advanced statuses from being clobbered by a re-create
      // call (e.g. a PIQ upload passing status: 'IN_PROGRESS' shouldn't reset
      // a PENDING_UPLOAD / COMPLETED submission back to IN_PROGRESS).
      const PROTECTED_STATUSES = [
        "PENDING_UPLOAD",
        "COMPLETED",
        "UPLOADED",
        "REVIEW_PENDING",
        "REPORT_RELEASED",
        "MEETING_SCHEDULED",
      ];
      const existingStatus = (submission as unknown as { status?: string }).status;
      const isProtected = !!existingStatus && PROTECTED_STATUSES.includes(existingStatus);

      Object.keys(body).forEach((key) => {
        if (key === "userId" || key === "assessmentId") return;
        if (key === "status" && isProtected) return;
        (submission as unknown as Record<string, unknown>)[key] = body[key];
      });
      await submission.save();
      return NextResponse.json(submission, { status: 200 });
    }

    // Resolves the student's current batch (most recent paid Order) so this
    // new Submission is tied to it — see src/server/psychAllotment.ts.
    const allotment = await resolveCurrentAllotmentForUser(uid);
    let gtoStatus = "NOT_REQUIRED";
    let ioStatus = "NOT_REQUIRED";
    let toStatus = "NOT_REQUIRED";
    let psychStatus = "PENDING"; // Always required once a battery is assigned.
    if (allotment.assignedGTO) gtoStatus = "PENDING";
    if (allotment.assignedIO) ioStatus = "PENDING";
    if (allotment.assignedTO) toStatus = "PENDING";
    if (allotment.assignedPsych) psychStatus = "PENDING";

    submission = new Submission({
      ...body,
      userId: uid,
      orderId: allotment.orderId,
      startedAt: new Date(),
      psychStatus,
      gtoStatus,
      ioStatus,
      toStatus,
    });
    await submission.save();
    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
