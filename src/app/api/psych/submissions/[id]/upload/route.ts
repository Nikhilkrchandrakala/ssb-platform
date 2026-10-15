import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Submission } from "@/server/models/Submission";
import { User } from "@/server/models/User";
import { requireUser, userId } from "../../../_lib/auth";
import { getEvaluationRecipientIds, notifyRecipients } from "../../../_lib/notify";
import { uploadToR2 } from "@/server/storage/r2";
import { sendDossierUploadedEmail, sendDossierUploadedSms } from "@/server/integrations/msg91";
import { resolveAllotmentForOrder } from "@/server/psychAllotment";

import { resolvePendingSubmissionId } from "../../../_lib/pendingSubmission";

type Params = { params: Promise<{ id: string }> };

// POST /api/psych/submissions/:id/upload — candidate Dossier upload. Accepts
// either a JSON body with pre-uploaded `fileUrls` (client uploaded directly),
// or multipart `files` which are streamed to R2 here. Supports pending-*
// pseudo-ids for unstarted candidates (e.g. when an admin uploads for them).
export async function POST(req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { id: rawId } = await params;

  try {
    const resolved = await resolvePendingSubmissionId(rawId);
    if ("error" in resolved) {
      return NextResponse.json({ message: resolved.error.message }, { status: resolved.error.status });
    }
    const submissionId = resolved.id;

    const submission = await Submission.findById(submissionId).select("-piqFileData");
    if (!submission) return NextResponse.json({ message: "Submission not found" }, { status: 404 });

    if (user.role === "student" && String(submission.userId) !== userId(user)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const filePaths: string[] = [];
    let testConductedVia: string | undefined;
    let notes: string | undefined;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body && Array.isArray(body.fileUrls)) {
        filePaths.push(...body.fileUrls);
      }
      if (body?.testConductedVia) testConductedVia = body.testConductedVia;
      if (body?.notes) notes = body.notes;
    } else {
      const formData = await req.formData();
      const files = formData.getAll("files").filter((f): f is File => f instanceof File);
      testConductedVia = (formData.get("testConductedVia") as string) || undefined;
      notes = (formData.get("notes") as string) || undefined;

      if (files.length === 0) {
        return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
      }

      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { message: `File "${file.name}" exceeds the 5 MB limit for dossiers.` },
            { status: 400 }
          );
        }
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          return NextResponse.json(
            { message: `Dossiers must be in PDF format only. File "${file.name}" is not a PDF.` },
            { status: 400 }
          );
        }
      }

      for (const file of files) {
        const { url } = await uploadToR2("battery", file);
        filePaths.push(url);
      }
    }

    if (filePaths.length === 0) {
      return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
    }

    const submissionRecord = submission as unknown as {
      uploadedFiles?: string[];
      status?: string;
      dossierUploadedAt?: Date;
      testConductedVia?: string;
      dossierUploadedBy?: unknown;
      dossierUploadNotes?: string;
    };
    submissionRecord.uploadedFiles = [...(submissionRecord.uploadedFiles || []), ...filePaths];
    submissionRecord.status = "REVIEW_PENDING";
    submissionRecord.dossierUploadedAt = new Date();

    if (testConductedVia) {
      submissionRecord.testConductedVia = testConductedVia;
    } else if (user.role !== "student") {
      submissionRecord.testConductedVia = "DIRECT_UPLOAD";
    }

    if (notes) {
      submissionRecord.dossierUploadNotes = notes;
    }
    if (user.role !== "student") {
      submissionRecord.dossierUploadedBy = userId(user);
    }

    await submission.save();

    try {
      const student = await User.findById(submission.userId);
      const allotment = await resolveAllotmentForOrder(submission.orderId ? String(submission.orderId) : null, String(submission.userId));
      const recipientIds = await getEvaluationRecipientIds({
        _id: submission.userId,
        assignedIO: allotment.assignedIO,
        assignedTO: allotment.assignedTO,
        assignedPsych: allotment.assignedPsych,
      });
      const candidateName = student ? student.name : "Candidate";
      const isLiveCall = submissionRecord.testConductedVia === "LIVE_CALL";
      const isDirectUpload = submissionRecord.testConductedVia === "DIRECT_UPLOAD";
      const notifTitle = isLiveCall
        ? "Dossier Uploaded (Live Call)"
        : isDirectUpload
        ? "Dossier Uploaded (Direct/DM)"
        : "Dossier Uploaded";
      const notifMessage = isLiveCall
        ? `Candidate ${candidateName} has uploaded their Dossier (Conducted via Live Call).`
        : isDirectUpload
        ? `A dossier for candidate ${candidateName} was uploaded directly by the team.`
        : `Candidate ${candidateName} has uploaded their Dossier.`;

      await notifyRecipients(recipientIds, {
        studentId: submission.userId,
        submissionId: submission._id,
        title: notifTitle,
        message: notifMessage,
      });

      // Email + SMS only the assigned TO/Psych for this candidate —
      // deliberately narrower than the in-app notification above (which also
      // reaches admins/owner). Skips silently if neither is assigned yet; no
      // fallback recipient, per explicit product decision (2026-08-05).
      if (student) {
        const assessorIds = [allotment.assignedTO, allotment.assignedPsych].filter(Boolean).map((id) => String(id));
        const uniqueAssessorIds = Array.from(new Set(assessorIds));
        if (uniqueAssessorIds.length > 0) {
          const assessors = await User.find({ _id: { $in: uniqueAssessorIds } }).select("name email phone");
          await Promise.all(
            assessors.flatMap((a) => {
              const sends = [];
              if (a.email) {
                sends.push(
                  sendDossierUploadedEmail({
                    to: a.email,
                    assessorName: a.name || "Assessor",
                    candidateName,
                    batchNumber: student.batch || "—",
                    chestNo: student.chestNo || "—",
                  })
                );
              }
              if (a.phone) {
                sends.push(
                  sendDossierUploadedSms({
                    toPhone: a.phone,
                    assessorName: a.name || "Assessor",
                    candidateName,
                    batchNumber: student.batch || "—",
                    chestNo: student.chestNo || "—",
                  })
                );
              }
              return sends;
            })
          );
        }
      }
    } catch (notifErr) {
      console.error("Failed to create Dossier notification:", notifErr);
    }

    return NextResponse.json({ message: "Files uploaded successfully", files: filePaths });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
