import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Submission } from "@/server/models/Submission";
import { User } from "@/server/models/User";
import { requireUser, userId, isStaff, requireStaff, forbidden } from "../../_lib/auth";
import { resolvePendingSubmissionId } from "../../_lib/pendingSubmission";
import { sendMeetingEmails, MeetingRole } from "../../_lib/meetingEmail";
import { resolveAllotmentForOrder } from "@/server/psychAllotment";

type Params = { params: Promise<{ id: string }> };

// GET /api/psych/submissions/:id — accepts real ids and "pending-<userId>"
// pseudo-ids (materialized into a real Submission on first read).
export async function GET(_req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id: rawId } = await params;

  // Candidates may only ever read their own submission; the pending-*
  // pseudo-ids are an assessor/admin dashboard concept.
  if (!isStaff(auth.user) && rawId.startsWith("pending-")) return forbidden();

  const resolved = await resolvePendingSubmissionId(rawId);
  if ("error" in resolved) {
    return NextResponse.json({ message: resolved.error.message }, { status: resolved.error.status });
  }

  try {
    const submission = await Submission.findById(resolved.id)
      .select("-piqFileData")
      .populate("userId", "name email clinicalStage profileImage chestNo batch")
      .populate("assessmentId", "title");
    if (!submission) {
      return NextResponse.json({ message: "Submission not found" }, { status: 404 });
    }

    const studentId = String((submission.userId as unknown as { _id?: unknown })?._id || submission.userId);
    if (!isStaff(auth.user) && studentId !== userId(auth.user)) return forbidden();
    const allotment = await resolveAllotmentForOrder(submission.orderId ? String(submission.orderId) : null, studentId);
    const subJSON = submission.toJSON ? (submission.toJSON() as Record<string, unknown>) : (submission as unknown as Record<string, unknown>);
    const studentJSON = subJSON.userId as Record<string, unknown> | undefined;
    return NextResponse.json({
      ...subJSON,
      userId: studentJSON
        ? {
            ...studentJSON,
            assignedGTO: allotment.assignedGTO,
            assignedTO: allotment.assignedTO,
            assignedPsych: allotment.assignedPsych,
            assignedIO: allotment.assignedIO,
          }
        : subJSON.userId,
      isOffline: allotment.isOffline,
    });
  } catch {
    return NextResponse.json({ message: "Submission not found" }, { status: 404 });
  }
}

const MEETING_ROLES: MeetingRole[] = ["psych", "gto", "io", "to"];

// PUT /api/psych/submissions/:id — updates arbitrary submission fields, and
// fires meeting-scheduled/rescheduled/cancelled emails when a *MeetingLink or
// *MeetingDate field changes (or is explicitly re-triggered).
export async function PUT(req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  // Writes here (marks, status, meeting links) are assessor/admin actions —
  // a candidate must never be able to edit any submission, including their own.
  const notStaff = requireStaff(auth.user);
  if (notStaff) return notStaff;
  const { id: rawId } = await params;

  const resolved = await resolvePendingSubmissionId(rawId);
  if ("error" in resolved) {
    return NextResponse.json({ message: resolved.error.message }, { status: resolved.error.status });
  }
  const submissionId = resolved.id;

  try {
    const body = await req.json();

    const oldSubmission = await Submission.findById(submissionId).select("-piqFileData").populate("userId", "name email");
    const submission = await Submission.findByIdAndUpdate(submissionId, body, { new: true })
      .select("-piqFileData")
      .populate("userId", "name email");

    if (!submission) {
      return NextResponse.json({ message: "Submission not found" }, { status: 404 });
    }

    const subRecord = submission as unknown as Record<string, unknown>;
    const oldRecord = (oldSubmission as unknown as Record<string, unknown>) || {};

    for (const role of MEETING_ROLES) {
      const linkField = `${role}MeetingLink`;
      const dateField = `${role}MeetingDate`;

      const linkChanged = body[linkField] !== undefined && body[linkField] !== oldRecord[linkField];
      const dateChanged =
        body[dateField] !== undefined &&
        (body[dateField] === null
          ? oldRecord[dateField] !== null
          : new Date(body[dateField]).getTime() !== new Date((oldRecord[dateField] as string | Date | undefined) || 0).getTime());
      const explicitlyTriggered = body.triggerEmail && body.meetingRole === role;

      if (!(explicitlyTriggered || linkChanged || dateChanged)) continue;

      const studentPopulated = submission.userId as unknown as { email?: string; name?: string; _id?: unknown } | undefined;
      const studentEmail = studentPopulated?.email;
      const studentName = studentPopulated?.name || "Candidate";
      const meetingLink = body[linkField] !== undefined ? body[linkField] : subRecord[linkField];
      const meetingDate = body[dateField] !== undefined ? body[dateField] : subRecord[dateField];

      let assessorEmail = "";
      let assessorName = "";
      try {
        const studentId = String(studentPopulated?._id ?? submission.userId);
        const allotment = await resolveAllotmentForOrder(submission.orderId ? String(submission.orderId) : null, studentId);
        let assessorId: unknown = null;
        if (role === "psych" && allotment.assignedPsych) assessorId = allotment.assignedPsych;
        else if (role === "to" && allotment.assignedTO) assessorId = allotment.assignedTO;
        else if (role === "gto" && allotment.assignedGTO) assessorId = allotment.assignedGTO;
        else if (role === "io" && allotment.assignedIO) assessorId = allotment.assignedIO;

        if (assessorId) {
          const assignedAssessor = await User.findById(assessorId as string);
          if (assignedAssessor) {
            assessorEmail = assignedAssessor.email;
            assessorName = assignedAssessor.name;
          }
        }

        // Fallback to the currently logged-in user if no assigned assessor.
        if (!assessorEmail) {
          const assessorUser = await User.findById(userId(auth.user));
          if (assessorUser) {
            assessorEmail = assessorUser.email;
            assessorName = assessorUser.name;
          }
        }
      } catch (err) {
        console.error("Failed to fetch assessor for email:", err);
      }

      if (!studentEmail) {
        console.warn(`[EMAIL WARNING] Student email is missing. Cannot send meeting email for ${role.toUpperCase()}.`);
        continue;
      }

      let formattedDate = "TBA";
      let formattedTime = "TBA";
      const isCancelled = body[dateField] === null || (subRecord[dateField] === null && oldRecord[dateField] !== null);

      if (isCancelled) {
        formattedDate = "Cancelled";
        formattedTime = "Cancelled";
      } else if (meetingDate) {
        const d = new Date(meetingDate as string);
        formattedDate = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });
        formattedTime = d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });
      }

      const emailResults = await sendMeetingEmails({
        role,
        studentEmail,
        studentName,
        assessorEmail,
        assessorName,
        meetingLink: meetingLink as string | null | undefined,
        formattedDate,
        formattedTime,
      });
      if (emailResults.candidateDelivered === false || emailResults.assessorDelivered === false) {
        console.warn(`[EMAIL WARNING] Meeting email delivery failed for ${role.toUpperCase()}:`, emailResults);
      }
    }

    return NextResponse.json(submission);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
