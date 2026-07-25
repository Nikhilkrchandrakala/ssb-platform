import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Candidate } from "@/server/models";
import { uploadToR2 } from "@/server/storage/r2";

// NOTE: see addCandidate/route.ts — legacy had no auth on this route at
// all; gated to admin/owner here for consistency with the rest of the
// migration. Flagged in the final report.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    await connectDB();

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return NextResponse.json({ message: "Candidate not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const name = formData.get("name") as string | null;
    const entry = formData.get("entry") as string | null;
    const board = formData.get("board") as string | null;
    const status = formData.get("status") as string | null;
    const file = formData.get("img");

    if (name) candidate.name = name;
    if (entry) candidate.entry = entry;
    if (board) candidate.board = board;
    if (status !== null) candidate.status = status;

    // NOTE: legacy never deleted the old R2/disk image when replacing it on
    // update — preserved as-is (orphaned old image), same gap as legacy.
    if (file instanceof File && file.size > 0) {
      const { url } = await uploadToR2("candidates", file);
      candidate.img = url;
    }

    await candidate.save();

    return NextResponse.json({ message: "Candidate updated successfully", data: candidate });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
