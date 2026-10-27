import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { connectDB } from "@/server/db";
import { Slot, SoftSkillsSubmission } from "@/server/models";

/**
 * GET /api/admin/softskills/batches
 * Lists all Soft Skills batches with candidate & submission statistics.
 */
export async function GET(_req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(currentUser, "softskills_evaluation")) {
      return NextResponse.json({ error: "Forbidden: Access restricted to Soft Skills Evaluators and Admins" }, { status: 403 });
    }

    await connectDB();

    // Query active (non-cancelled) Soft Skills slots
    const slots = await Slot.find({
      isCancelled: { $ne: true },
      $or: [
        { programType: "soft_skills" },
        { title: { $regex: /soft\s*skills/i } },
      ],
    })
      .sort({ startTime: -1 })
      .lean();

    const batchesWithStats = await Promise.all(
      slots.map(async (slot) => {
        const bookedStudentsCount = slot.bookedStudents?.length || 0;

        const submissions = await SoftSkillsSubmission.find({
          slotId: slot._id,
        }).lean();

        let reviewPendingCount = 0;
        let completedCount = 0;

        for (const sub of submissions) {
          if (sub.status === "COMPLETED") {
            completedCount++;
          } else if (sub.status === "REVIEW_PENDING") {
            reviewPendingCount++;
          }
        }

        const pendingCount = bookedStudentsCount - reviewPendingCount - completedCount;

        return {
          _id: slot._id,
          title: slot.title,
          batchNo: slot.batchNo,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxStudents: slot.maxStudents || 25,
          bookedCount: bookedStudentsCount,
          pendingCount: Math.max(0, pendingCount),
          reviewPendingCount,
          completedCount,
        };
      })
    );

    return NextResponse.json({ batches: batchesWithStats });
  } catch (err) {
    console.error("[GET /api/admin/softskills/batches] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load batches" },
      { status: 500 }
    );
  }
}
