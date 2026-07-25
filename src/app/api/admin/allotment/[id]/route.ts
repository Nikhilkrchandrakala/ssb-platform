import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User, Notification } from "@/server/models";

/**
 * PUT /api/admin/allotment/:id
 * Sets or updates GTO, TO, Psych, and IO assessor allotments for a specific student.
 * Ported from legacy studentRoutes.js.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const { assignedGTO, assignedTO, assignedPsych, assignedIO, assignedAssessments } = await req.json();

    const student = await User.findById(id);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const stages = (student.clinicalStage || "full_course").split(",").map((st: string) => st.trim()).filter(Boolean);
    const gtoAllowed = stages.includes("full_course") || stages.includes("group_testing");
    const ioAllowed = stages.includes("full_course") || stages.includes("interview");
    const psychOrToAllowed = stages.includes("full_course") || stages.includes("psych");

    if (assignedGTO && !gtoAllowed) {
      return NextResponse.json(
        { error: "A Group Testing Assessor (GTO) cannot be allotted to this student based on their course enrollment." },
        { status: 400 }
      );
    }
    if (assignedIO && !ioAllowed) {
      return NextResponse.json(
        { error: "An Interviewing Officer (IO) cannot be allotted to this student based on their course enrollment." },
        { status: 400 }
      );
    }
    if ((assignedPsych || assignedTO) && !psychOrToAllowed) {
      return NextResponse.json(
        { error: "A Psychology/Technical Assessor (Psych/TO) cannot be allotted to this student based on their course enrollment." },
        { status: 400 }
      );
    }

    if (assignedTO && assignedPsych) {
      return NextResponse.json(
        { error: "A candidate cannot be assigned to both a Psych Assessor and a Technical Assessor simultaneously." },
        { status: 400 }
      );
    }

    const oldGTO = student.assignedGTO ? student.assignedGTO.toString() : null;
    const oldTO = student.assignedTO ? student.assignedTO.toString() : null;
    const oldPsych = student.assignedPsych ? student.assignedPsych.toString() : null;
    const oldIO = student.assignedIO ? student.assignedIO.toString() : null;

    if (assignedGTO !== undefined) student.assignedGTO = assignedGTO || null;
    if (assignedTO !== undefined) student.assignedTO = assignedTO || null;
    if (assignedPsych !== undefined) student.assignedPsych = assignedPsych || null;
    if (assignedIO !== undefined) student.assignedIO = assignedIO || null;
    if (assignedAssessments !== undefined) student.assignedAssessments = assignedAssessments;

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

    const notifications: Record<string, unknown>[] = [];
    const createNotif = (assessorId: string | undefined, role: string) => {
      if (assessorId) {
        notifications.push({
          recipientId: assessorId,
          studentId: student._id,
          title: "New Candidate Allotted",
          message: `You have been allotted as ${role} for candidate ${student.name}.`,
          type: "ALLOTMENT",
        });
      }
    };

    if (assignedGTO !== undefined && assignedGTO !== oldGTO) createNotif(assignedGTO, "GTO");
    if (assignedTO !== undefined && assignedTO !== oldTO) createNotif(assignedTO, "TO");
    if (assignedPsych !== undefined && assignedPsych !== oldPsych) createNotif(assignedPsych, "Psychologist");
    if (assignedIO !== undefined && assignedIO !== oldIO) createNotif(assignedIO, "Interviewing Officer");

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    return NextResponse.json({ status: "ok", message: "Assessor allotment configured successfully", student });
  } catch (error) {
    console.error("PUT /api/admin/allotment/:id error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to configure allotment" }, { status: 500 });
  }
}
