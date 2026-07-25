import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Submission } from "@/server/models/Submission";
import { requireUser } from "../../../_lib/auth";

type Params = { params: Promise<{ id: string }> };

// POST /api/psych/submissions/:id/audit — admin/owner only. Approves or
// kicks back a single assessor's evaluation for revision.
export async function POST(req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (user.role !== "admin" && user.role !== "owner") {
    return NextResponse.json({ message: "Access Denied: Administrative privileges required" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const submission = await Submission.findById(id).select("-piqFileData");
    if (!submission) return NextResponse.json({ message: "Submission not found" }, { status: 404 });

    const { assessorType, action, remarks } = (await req.json()) as {
      assessorType?: string;
      action?: string;
      remarks?: string;
    };
    if (!assessorType || !action) {
      return NextResponse.json({ message: "Assessor type and action are required" }, { status: 400 });
    }

    const submissionRecord = submission as unknown as {
      get: (path: string) => unknown;
      set: (path: string, value: unknown) => unknown;
    };

    const statusField = `${assessorType.toLowerCase()}Status`;
    const remarksField = `${assessorType.toLowerCase()}Remarks`;

    if (action === "APPROVE") {
      submissionRecord.set(statusField, "COMPLETED");
    } else if (action === "REJECT") {
      submissionRecord.set(statusField, "UNDER_REVIEW");
      if (remarks) {
        const currentRemarks = (submissionRecord.get(remarksField) as string) || "";
        submissionRecord.set(remarksField, `${currentRemarks}\n\n[ADMIN REVISION REQUEST]: ${remarks}`);
      }
    }

    await submission.save();
    return NextResponse.json({ message: `Successfully updated ${assessorType} status to ${action}`, submission });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
