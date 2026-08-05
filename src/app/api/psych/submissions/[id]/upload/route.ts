import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Submission } from "@/server/models/Submission";
import { User } from "@/server/models/User";
import { requireUser, userId } from "../../../_lib/auth";
import { getEvaluationRecipientIds, notifyRecipients } from "../../../_lib/notify";
import { uploadToR2 } from "@/server/storage/r2";
import { sendDossierUploadedEmail, sendDossierUploadedSms } from "@/server/integrations/msg91";

type Params = { params: Promise<{ id: string }> };

// POST /api/psych/submissions/:id/upload — candidate Dossier upload. Accepts
// either a JSON body with pre-uploaded `fileUrls` (client uploaded directly),
// or multipart `files` which are streamed to R2 here. Legacy forwarded raw
// files to the main Express backend's /api/uploadBatteryImage over HTTP —
// that hop is gone now that this is one app; we upload straight to R2.
// Gemini/OCR parsing of the dossier (`runOCR`) was already a no-op in
// production and is not ported.
export async function POST(req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { id: submissionId } = await params;

  try {
    const submission = await Submission.findById(submissionId).select("-piqFileData");
    if (!submission) return NextResponse.json({ message: "Submission not found" }, { status: 404 });

    if (user.role === "student" && String(submission.userId) !== userId(user)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const filePaths: string[] = [];

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body && Array.isArray(body.fileUrls)) {
        filePaths.push(...body.fileUrls);
      }
    } else {
      const formData = await req.formData();
      const files = formData.getAll("files").filter((f): f is File => f instanceof File);
      if (files.length === 0) {
        return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
      }
      for (const file of files) {
        const { url } = await uploadToR2("battery", file);
        filePaths.push(url);
      }
    }

    if (filePaths.length === 0) {
      return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
    }

    const submissionRecord = submission as unknown as { uploadedFiles?: string[]; status?: string };
    submissionRecord.uploadedFiles = [...(submissionRecord.uploadedFiles || []), ...filePaths];
    submissionRecord.status = "REVIEW_PENDING";
    await submission.save();

    try {
      const student = await User.findById(submission.userId);
      const recipientIds = await getEvaluationRecipientIds(student);
      const candidateName = student ? student.name : "Candidate";
      await notifyRecipients(recipientIds, {
        studentId: submission.userId,
        submissionId: submission._id,
        title: "Dossier Uploaded",
        message: `Candidate ${candidateName} has uploaded their Dossier.`,
      });

      // Email + SMS only the assigned TO/Psych for this candidate —
      // deliberately narrower than the in-app notification above (which also
      // reaches admins/owner). Skips silently if neither is assigned yet; no
      // fallback recipient, per explicit product decision (2026-08-05).
      if (student) {
        const assessorIds = [student.assignedTO, student.assignedPsych].filter(Boolean).map((id) => String(id));
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
