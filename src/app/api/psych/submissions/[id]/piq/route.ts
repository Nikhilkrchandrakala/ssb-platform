import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Submission } from "@/server/models/Submission";
import { User } from "@/server/models/User";
import { requireUser, userId } from "../../../_lib/auth";
import { getEvaluationRecipientIds, notifyRecipients } from "../../../_lib/notify";
import { uploadToR2 } from "@/server/storage/r2";
import { sendPiqUploadedEmail, sendPiqUploadedSms } from "@/server/integrations/msg91";

type Params = { params: Promise<{ id: string }> };

// POST /api/psych/submissions/:id/piq — candidate PIQ (1 or 2) file upload.
// Legacy stored these as base64 blobs inside the Submission document (a
// Vercel read-only-filesystem workaround) and served them back through
// GET .../piq-file/:index. That storage scheme is superseded by R2 here:
// files are uploaded to the "battery" folder and their URLs are appended to
// `piqFiles`, which .../piq-file/:index now proxies by index. Gemini/OCR
// parsing of the PIQ (`runPiqOCR`) was already a no-op in production and is
// not ported — only its non-AI side effects (status transitions + assessor
// notification) are kept.
export async function POST(req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { id: submissionId } = await params;

  try {
    const submission = await Submission.findById(submissionId);
    if (!submission) return NextResponse.json({ message: "Submission not found" }, { status: 404 });

    if (user.role === "student" && String(submission.userId) !== userId(user)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
    }

    const candidateUser = await User.findById(submission.userId);
    let isIOOnly = false;
    if (candidateUser) {
      const stages = (candidateUser.clinicalStage || "")
        .split(",")
        .map((st: string) => st.trim())
        .filter(Boolean);
      isIOOnly = stages.includes("interview") && !stages.includes("full_course") && !stages.includes("psych");
    }

    const piqType = (formData.get("piqType") as string | null) || req.nextUrl.searchParams.get("piqType") || "piq1";
    const submissionRecord = submission as unknown as {
      piq1Status?: string;
      piq2Status?: string;
      piqStatus?: string;
      piqFiles?: string[];
      piq1UploadedAt?: Date;
      piq2UploadedAt?: Date;
    };
    const currentPiq1Status = submissionRecord.piq1Status || "PENDING";
    if (piqType === "piq2" && !isIOOnly && currentPiq1Status !== "VERIFIED") {
      return NextResponse.json(
        { message: "PIQ 2 upload is only allowed after PIQ 1 has been successfully uploaded and verified." },
        { status: 400 }
      );
    }

    const filePaths: string[] = [];
    for (const file of files) {
      const { url } = await uploadToR2("battery", file, { fileName: `${piqType}_${file.name}` });
      filePaths.push(url);
    }

    submissionRecord.piqFiles = [...(submissionRecord.piqFiles || []), ...filePaths];
    if (piqType === "piq2") {
      submissionRecord.piq2Status = "VERIFIED";
      submissionRecord.piq2UploadedAt = new Date();
    } else {
      submissionRecord.piq1Status = "VERIFIED";
      submissionRecord.piqStatus = "PARSED";
      submissionRecord.piq1UploadedAt = new Date();
    }
    await submission.save();

    // Notify allotted assessors + admins (matches legacy runPiqOCR's
    // non-AI side effect — no actual OCR/parsing runs).
    try {
      const student = await User.findById(submission.userId);
      const recipientIds = await getEvaluationRecipientIds(student);
      const candidateName = student ? student.name : "Candidate";
      await notifyRecipients(recipientIds, {
        studentId: submission.userId,
        submissionId: submission._id,
        title: "PIQ Uploaded",
        message: `Candidate ${candidateName} has uploaded their PIQ files.`,
      });

      // Targeted email + SMS, deliberately narrower than the in-app
      // notification above: PIQ1 -> assigned TO/Psych only, PIQ2 -> assigned
      // IO only (2026-08-05 product decision). Skips silently if the
      // relevant assessor(s) aren't assigned yet; no fallback recipient.
      if (candidateUser) {
        const assessorIds =
          piqType === "piq2"
            ? [candidateUser.assignedIO].filter(Boolean)
            : [candidateUser.assignedTO, candidateUser.assignedPsych].filter(Boolean);
        const uniqueAssessorIds = Array.from(new Set(assessorIds.map((id) => String(id))));
        if (uniqueAssessorIds.length > 0) {
          const assessors = await User.find({ _id: { $in: uniqueAssessorIds } }).select("name email phone");
          await Promise.all(
            assessors.flatMap((a) => {
              const sends = [];
              if (a.email) {
                sends.push(
                  sendPiqUploadedEmail({
                    to: a.email,
                    assessorName: a.name || "Assessor",
                    candidateName,
                    batchNumber: candidateUser.batch || "—",
                    chestNo: candidateUser.chestNo || "—",
                  })
                );
              }
              if (a.phone) {
                sends.push(
                  sendPiqUploadedSms({
                    toPhone: a.phone,
                    assessorName: a.name || "Assessor",
                    candidateName,
                    batchNumber: candidateUser.batch || "—",
                    chestNo: candidateUser.chestNo || "—",
                  })
                );
              }
              return sends;
            })
          );
        }
      }
    } catch (notifErr) {
      console.error("Failed to create PIQ notification:", notifErr);
    }

    return NextResponse.json({ message: "PIQ files uploaded successfully", files: filePaths });
  } catch (error) {
    console.error("PIQ upload error:", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
