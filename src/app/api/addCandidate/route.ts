import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Candidate } from "@/server/models";
import { uploadToR2 } from "@/server/storage/r2";

// NOTE: legacy candidateRoutes.js had NO auth middleware at all on any
// route (not even the generic checkAuth used by blogs/gallery/magazine) —
// add/update/delete were fully public. Gated to admin/owner here for
// consistency with the rest of this migration (see updateCourse, addBlog,
// etc., which all harden a legacy checkAuth-or-nothing to admin/owner).
// Flagged in the final report as a deliberate deviation from legacy.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const name = formData.get("name") as string | null;
    const entry = formData.get("entry") as string | null;
    const board = formData.get("board") as string | null;
    const status = formData.get("status") as string | null;
    const file = formData.get("img");

    if (!name || !entry || !board || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ message: "Required fields missing" }, { status: 400 });
    }

    await connectDB();

    const { url: imageUrl } = await uploadToR2("candidates", file);

    const candidate = new Candidate({
      name,
      entry,
      board,
      status: status || "",
      img: imageUrl,
    });

    await candidate.save();

    return NextResponse.json(
      { message: "Candidate added successfully", data: candidate },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
