import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Submission } from "@/server/models/Submission";
import { User } from "@/server/models/User";
import { requireUser, userId } from "../_lib/auth";

type AssessorType = "GTO" | "TO" | "Psych" | "IO";

function candidateQueryForAssessorType(type: AssessorType, assessorId: string): Record<string, unknown> {
  if (type === "GTO") return { assignedGTO: assessorId };
  if (type === "TO") return { assignedTO: assessorId };
  if (type === "Psych") return { assignedPsych: assessorId };
  return { assignedIO: assessorId };
}

// GET /api/psych/submissions
export async function GET() {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const uid = userId(user);

  try {
    let query: Record<string, unknown> = {};
    if (user.role === "student") {
      query.userId = uid;
    } else if (user.role === "assessor") {
      const assessor = await User.findById(uid);
      const assessorType = (assessor as unknown as { assessorType?: AssessorType } | null)?.assessorType;
      if (assessor && assessorType) {
        const candidateQuery = candidateQueryForAssessorType(assessorType, uid);
        const candidates = await User.find(candidateQuery).select("_id");
        const candidateIds = candidates.map((c) => c._id);
        query = { $or: [{ assessorId: uid }, { userId: { $in: candidateIds } }] };
      } else {
        query.assessorId = uid;
      }
    }

    const submissions = await Submission.find(query)
      .select("-piqFileData")
      .populate("userId", "name email assignedGTO assignedTO assignedPsych assignedIO clinicalStage profileImage chestNo batch")
      .populate("assessmentId", "title type")
      .sort({ updatedAt: -1 });

    // Students see ALL of their own submissions, undeduplicated — dedup below
    // is only meaningful for the assessor/admin "one row per candidate" view.
    if (user.role === "student") {
      const studentSubmissions = submissions.map((sub) => {
        const subJSON = sub.toJSON ? sub.toJSON() : sub;
        return { ...subJSON, student: (subJSON as Record<string, unknown>).userId };
      });
      return NextResponse.json(studentSubmissions);
    }

    const uniqueSubmissionsMap = new Map<string, Record<string, unknown>>();
    submissions.forEach((sub) => {
      const subJSON = sub.toJSON ? (sub.toJSON() as Record<string, unknown>) : (sub as unknown as Record<string, unknown>);
      const subUserId = subJSON.userId as { id?: unknown; _id?: unknown } | string | undefined;
      if (!subUserId) return;

      const uid2 =
        typeof subUserId === "object" ? subUserId.id ?? subUserId._id : subUserId;
      const studentId = String(uid2);

      if (!uniqueSubmissionsMap.has(studentId)) {
        uniqueSubmissionsMap.set(studentId, { ...subJSON, student: subJSON.userId });
      }
    });

    let mappedSubmissions = Array.from(uniqueSubmissionsMap.values());

    // Append pending submissions for allotted candidates who haven't uploaded anything yet.
    if (user.role === "assessor" || user.role === "admin" || user.role === "owner") {
      let candidateQuery: Record<string, unknown> | null = {};

      if (user.role === "assessor") {
        const assessor = await User.findById(uid);
        const assessorType = (assessor as unknown as { assessorType?: AssessorType } | null)?.assessorType;
        if (assessor && assessorType) {
          candidateQuery = candidateQueryForAssessorType(assessorType, uid);
        } else {
          candidateQuery = null;
        }
      } else {
        // Admins/owners see every candidate with at least one assigned assessor.
        candidateQuery = {
          $or: [
            { assignedPsych: { $exists: true, $ne: null } },
            { assignedGTO: { $exists: true, $ne: null } },
            { assignedIO: { $exists: true, $ne: null } },
            { assignedTO: { $exists: true, $ne: null } },
          ],
        };
      }

      if (candidateQuery) {
        const candidates = await User.find(candidateQuery).select(
          "_id name email assignedGTO assignedTO assignedPsych assignedIO clinicalStage profileImage chestNo batch"
        );
        const usersWithSubmissions = new Set(
          submissions.map((s) => {
            const su = s.userId as unknown as { _id?: unknown } | undefined;
            return su && su._id ? String(su._id) : "";
          })
        );

        for (const candidate of candidates) {
          if (!usersWithSubmissions.has(String(candidate._id))) {
            mappedSubmissions.push({
              id: `pending-${candidate._id}`,
              _id: `pending-${candidate._id}`,
              userId: candidate._id,
              status: "PENDING",
              student: candidate.toObject ? candidate.toObject() : candidate,
              assessmentId: null,
              startedAt: null,
            });
          }
        }
      }
    }

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

    const candidateUser = await User.findById(uid);
    let gtoStatus = "NOT_REQUIRED";
    let ioStatus = "NOT_REQUIRED";
    let toStatus = "NOT_REQUIRED";
    let psychStatus = "PENDING"; // Always required once a battery is assigned.
    if (candidateUser) {
      if (candidateUser.assignedGTO) gtoStatus = "PENDING";
      if (candidateUser.assignedIO) ioStatus = "PENDING";
      if (candidateUser.assignedTO) toStatus = "PENDING";
      if (candidateUser.assignedPsych) psychStatus = "PENDING";
    }

    submission = new Submission({
      ...body,
      userId: uid,
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
