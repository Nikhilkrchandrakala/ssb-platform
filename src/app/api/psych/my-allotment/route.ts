import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { requireUser, userId } from "../_lib/auth";
import { resolveCurrentAllotmentForUser } from "@/server/psychAllotment";

/**
 * GET /api/psych/my-allotment — student-only. Returns the caller's current
 * (most recent paid batch's) assessor allotment. StudentEntryView.tsx uses
 * this instead of the session user's own assignedGTO/TO/Psych/IO fields
 * (populated by getCurrentUser() straight off User), which go stale the
 * moment an admin re-allots on the Allotment page — that page now writes to
 * Order, not User.
 */
export async function GET() {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (user.role !== "student") {
    return NextResponse.json({ message: "Students only" }, { status: 403 });
  }

  const allotment = await resolveCurrentAllotmentForUser(userId(user));
  const hasAssessor = !!(allotment.assignedGTO || allotment.assignedTO || allotment.assignedPsych || allotment.assignedIO);

  // `isOffline` rides through on `...allotment` (see ResolvedAllotment) —
  // StudentEntryView.tsx uses it to skip the PIQ/timed-test/dossier journey
  // entirely for an offline candidate.
  return NextResponse.json({ ...allotment, hasAssessor });
}
