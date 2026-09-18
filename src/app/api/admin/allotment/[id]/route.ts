import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Order, User, Notification } from "@/server/models";

/**
 * PUT /api/admin/allotment/:id
 * Sets or updates GTO, TO, Psych, and IO assessor allotments for a specific
 * paid Order (batch enrollment) — moved from the student (User) so a
 * student's second paid batch no longer overwrites the first batch's
 * allotment. `:id` is now an Order id, not a User id.
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

    const order = await Order.findById(id).populate("slotId", "isFullCourse").populate("userId", "name");

    if (!order || order.status !== "paid") {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }
    const student = order.userId as unknown as { _id: unknown; name: string } | null;
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Gating is derived from THIS order's own purchase, not the student's
    // (now-legacy) global clinicalStage — an empty selectedModules array on
    // a full-course Slot means the same as an explicit "full_course" entry
    // (see createOrder's own fallback semantics).
    const slot = order.slotId as unknown as { isFullCourse?: boolean } | null;
    const modules: string[] = order.selectedModules || [];
    const stages = modules.length === 0 && slot?.isFullCourse ? ["full_course"] : modules;
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

    const oldGTO = order.assignedGTO ? order.assignedGTO.toString() : null;
    const oldTO = order.assignedTO ? order.assignedTO.toString() : null;
    const oldPsych = order.assignedPsych ? order.assignedPsych.toString() : null;
    const oldIO = order.assignedIO ? order.assignedIO.toString() : null;

    if (assignedGTO !== undefined) order.assignedGTO = assignedGTO || null;
    if (assignedTO !== undefined) order.assignedTO = assignedTO || null;
    if (assignedPsych !== undefined) order.assignedPsych = assignedPsych || null;
    if (assignedIO !== undefined) order.assignedIO = assignedIO || null;
    if (assignedAssessments !== undefined) order.assignedAssessments = assignedAssessments;

    await order.save();

    // Hotfix (2026-09-17): the psych-battery system (StudentEntryView's
    // "can I start my test" gate, dashboards, notifications, meeting
    // resolution) still reads assessor assignment off User in several
    // places — a real rework of all of those is tracked separately. Until
    // that's done, mirror this order's allotment onto the student's User
    // record whenever it's their MOST RECENT paid order, so those consumers
    // keep seeing the right (or at least the current-batch) assignment
    // instead of a permanently-null/stale value. Never mirrors an older
    // order's allotment over a newer one.
    const mostRecentPaidOrder = await Order.findOne({ userId: order.userId, status: "paid" }).sort({ createdAt: -1 });
    if (mostRecentPaidOrder && String(mostRecentPaidOrder._id) === String(order._id)) {
      await User.findByIdAndUpdate(order.userId, {
        assignedGTO: order.assignedGTO,
        assignedTO: order.assignedTO,
        assignedPsych: order.assignedPsych,
        assignedIO: order.assignedIO,
        assignedAssessments: order.assignedAssessments,
      });
    }

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

    return NextResponse.json({ status: "ok", message: "Assessor allotment configured successfully", order });
  } catch (error) {
    console.error("PUT /api/admin/allotment/:id error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to configure allotment" }, { status: 500 });
  }
}
