import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Assessment } from "@/server/models/Assessment";
import { User } from "@/server/models/User";
import { requireUser, requireAdmin, userId } from "../_lib/auth";

// GET /api/psych/assessments — students see only their assigned assessments
// (or all active ones if none are individually assigned); everyone else sees
// everything. Ported from legacy GET /api/assessments.
export async function GET() {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  try {
    let query: Record<string, unknown> = {};
    if (user.role === "student") {
      const studentUser = await User.findById(userId(user));
      const assigned = (studentUser as unknown as { assignedAssessments?: unknown[] } | null)?.assignedAssessments;
      if (assigned && assigned.length > 0) {
        query = { _id: { $in: assigned } };
      } else {
        query = { active: true };
      }
    }
    const assessments = await Assessment.find(query);
    return NextResponse.json(assessments);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

// POST /api/psych/assessments — admin/owner only.
export async function POST(req: NextRequest) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const forbidden = requireAdmin(user);
  if (forbidden) return forbidden;

  try {
    const body = await req.json();
    const assessment = new Assessment({ ...body, createdBy: userId(user) });
    await assessment.save();
    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
