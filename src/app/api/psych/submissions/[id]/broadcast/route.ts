import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Submission } from "@/server/models/Submission";
import { User } from "@/server/models/User";
import { requireUser } from "../../../_lib/auth";
import { resolvePendingSubmissionId } from "../../../_lib/pendingSubmission";
import { notifyRecipients } from "../../../_lib/notify";
import { sendMsg91Email } from "../../../_lib/email";

type Params = { params: Promise<{ id: string }> };

const INDIVIDUAL_TYPES = ["psych", "io", "gto", "to"];

// POST /api/psych/submissions/:id/broadcast — admin/owner only. Releases
// either a single assessor's report (`assessorType` in body) or the full
// combined report to the candidate.
export async function POST(req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (user.role !== "admin" && user.role !== "owner") {
    return NextResponse.json({ message: "Access Denied: Administrative privileges required" }, { status: 403 });
  }

  const { id: rawId } = await params;
  const body = await req.json();
  const { assessorType } = body as { assessorType?: string };

  const resolved = await resolvePendingSubmissionId(rawId);
  if ("error" in resolved) {
    return NextResponse.json({ message: resolved.error.message }, { status: resolved.error.status });
  }

  try {
    const submission = await Submission.findById(resolved.id).select("-piqFileData");
    if (!submission) return NextResponse.json({ message: "Submission not found" }, { status: 404 });

    const submissionRecord = submission as unknown as Record<string, unknown> & {
      get: (path: string) => unknown;
      set: (path: string, value: unknown) => unknown;
    };

    const isIndividual = !!assessorType && INDIVIDUAL_TYPES.includes(assessorType.toLowerCase());

    if (isIndividual) {
      const type = assessorType!.toLowerCase();
      submissionRecord.set(`reportVisibility.${type}`, true);

      // Copy current assessor remarks to the released/broadcasted field.
      const remarksField = `${type}Remarks`;
      const releasedRemarksField = `released${type.charAt(0).toUpperCase() + type.slice(1)}Remarks`;
      submissionRecord.set(releasedRemarksField, submissionRecord.get(remarksField) || "");
    } else {
      submissionRecord.status = "REPORT_RELEASED";
      submissionRecord.reportVisibility = { psych: true, io: true, gto: true, to: true };

      submissionRecord.set("releasedPsychRemarks", submissionRecord.psychRemarks || "");
      submissionRecord.set("releasedGtoRemarks", submissionRecord.gtoRemarks || "");
      submissionRecord.set("releasedIoRemarks", submissionRecord.ioRemarks || "");
      submissionRecord.set("releasedToRemarks", submissionRecord.toRemarks || "");
    }

    await submission.save();

    const student = await User.findById(submission.userId);
    if (student) {
      const recipientIds = [String(student._id)];
      if (student.assignedPsych) recipientIds.push(String(student.assignedPsych));
      if (student.assignedGTO) recipientIds.push(String(student.assignedGTO));
      if (student.assignedIO) recipientIds.push(String(student.assignedIO));
      if (student.assignedTO) recipientIds.push(String(student.assignedTO));

      const candidateName = student.name || "Candidate";
      const notifTitle = isIndividual ? `${assessorType!.toUpperCase()} Report Released` : "Results Broadcasted";
      const notifMessage = isIndividual
        ? `The ${assessorType!.toUpperCase()} evaluation report for ${candidateName} has been released by the Admin.`
        : `The official evaluation report for ${candidateName} has been broadcasted by the Admin.`;

      await notifyRecipients(recipientIds, {
        studentId: submission.userId,
        submissionId: submission._id,
        title: notifTitle,
        message: notifMessage,
      });

      // Email via MSG91 ONLY for the final combined broadcast.
      if (!isIndividual) {
        if (!student.email) {
          console.warn("[EMAIL WARNING] Student email is missing. Cannot send results broadcast email.");
        } else {
          await sendMsg91Email(
            {
              to: [{ name: candidateName, email: student.email }],
              templateId: "results_broadcast_template_1",
              variables: {
                candidate_name: candidateName,
                evaluation_details: `Your psychological evaluation results are published. Overall Score: ${
                  (submissionRecord.score as number | undefined) ?? "--"
                }.`,
                report_link: "https://ssbwithisv.in/ProfileDashboard?tab=psycheTest",
              },
            },
            "Results-Broadcast"
          );
        }
      }
    }

    return NextResponse.json({ message: "Results successfully broadcasted", submission });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
