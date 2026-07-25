import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User } from "@/server/models";

/**
 * POST /api/admin/students/:id/stage
 * Updates clinical assessment stage for a student.
 * Ported from legacy studentRoutes.js (originally `router.post`, comment said PUT — kept as POST to match the actual mount).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const { clinicalStage } = await req.json();

    const allowedStages = ["full_course", "ssb_ppdt", "psych", "interview", "group_testing"];
    const stages = (clinicalStage || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    const allValid = stages.every((s: string) => allowedStages.includes(s));
    if (stages.length === 0 || !allValid) {
      return NextResponse.json({ error: "Invalid course(s) specified" }, { status: 400 });
    }

    const student = await User.findById(id);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    student.clinicalStage = clinicalStage;
    if (
      !student.role ||
      (student.role !== "student" &&
        student.role !== "lead" &&
        student.role !== "admin" &&
        student.role !== "assessor" &&
        student.role !== "franchise")
    ) {
      student.role = "student";
    }
    await student.save();

    return NextResponse.json({ status: "ok", message: "Clinical stage updated successfully", student });
  } catch (error) {
    console.error("PUT /api/admin/students/:id/stage error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update stage" }, { status: 500 });
  }
}
