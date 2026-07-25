import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Assessment } from "@/server/models";

/**
 * GET /api/admin/assessments
 * Fetches all available timed psych assessment configurations.
 * Ported from legacy studentRoutes.js.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(user, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const assessments = await Assessment.find().sort({ title: 1 });
    return NextResponse.json({ status: "ok", assessments });
  } catch (error) {
    console.error("GET /api/admin/assessments error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch assessments" }, { status: 500 });
  }
}
