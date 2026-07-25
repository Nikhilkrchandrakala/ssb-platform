import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Submission } from "@/server/models/Submission";
import { requireUser } from "../../../../_lib/auth";

type Params = { params: Promise<{ id: string; index: string }> };

// GET /api/psych/submissions/:id/piq-file/:index — serves a previously
// uploaded PIQ file by its position in the upload history. Legacy stored PIQ
// files as base64 blobs directly on the Submission document (`piqFileData`,
// a Vercel read-only-filesystem workaround) and streamed that blob back.
// New uploads (see .../piq route) go straight to R2 and only populate the
// parallel `piqFiles` URL array, so this proxies the R2 object instead —
// this route stays auth-gated (rather than just handing back the R2 URL)
// to preserve the original "only an authenticated session can fetch this
// file" contract. Pre-migration submissions that still carry a `piqFileData`
// entry at this index are served from that legacy blob for compatibility.
export async function GET(_req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id, index: indexParam } = await params;
  const index = parseInt(indexParam, 10);

  try {
    const submission = await Submission.findById(id).select({
      piqFileData: { $slice: [index, 1] },
      piqFiles: 1,
    });
    if (!submission) return NextResponse.json({ message: "Submission not found" }, { status: 404 });

    const submissionRecord = submission as unknown as {
      piqFileData?: { filename?: string; mimetype?: string; data?: string }[];
      piqFiles?: string[];
    };

    const legacyFile = submissionRecord.piqFileData?.[0];
    if (legacyFile?.data) {
      const buffer = Buffer.from(legacyFile.data, "base64");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": legacyFile.mimetype || "application/octet-stream",
          "Content-Disposition": `inline; filename="${legacyFile.filename || "piq-file"}"`,
          "Content-Length": String(buffer.length),
        },
      });
    }

    const fileUrl = submissionRecord.piqFiles?.[index];
    if (!fileUrl) return NextResponse.json({ message: "File not found" }, { status: 404 });

    const upstream = await fetch(fileUrl);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const filename = fileUrl.split("/").pop() || "piq-file";

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
