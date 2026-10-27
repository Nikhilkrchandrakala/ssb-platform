import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { connectDB } from "@/server/db";
import { Slot, SoftSkillsSubmission } from "@/server/models";

/**
 * POST /api/admin/softskills/unlock
 * Body: { slotId: string, userId?: string, unlockAll?: boolean, lockedState?: boolean }
 * Unlocks or locks Video 2 submission for a single student or all students in a batch.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(currentUser, "softskills_evaluation")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { slotId, userId, unlockAll, lockedState } = body;

    if (!slotId) {
      return NextResponse.json({ error: "slotId is required" }, { status: 400 });
    }

    await connectDB();

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return NextResponse.json({ error: "Batch slot not found" }, { status: 404 });
    }

    const unlockValue = lockedState === false ? false : true;
    const now = new Date();

    if (unlockAll) {
      const bookedIds = (slot.bookedStudents || []) as any[];

      // Upsert submissions for all booked students to unlock Video 2
      const bulkOps = bookedIds.map((sid) => ({
        updateOne: {
          filter: { userId: sid, slotId: slot._id },
          update: {
            $set: {
              video2Unlocked: unlockValue,
              video2UnlockedAt: unlockValue ? now : null,
              video2UnlockedBy: unlockValue ? currentUser._id : null,
            },
            $setOnInsert: {
              status: "PENDING",
            },
          },
          upsert: true,
        },
      }));

      if (bulkOps.length > 0) {
        await SoftSkillsSubmission.bulkWrite(bulkOps);
      }

      return NextResponse.json({
        success: true,
        message: unlockValue
          ? `Final capstone video unlocked for all ${bulkOps.length} students in this batch!`
          : `Final capstone video locked for all students in this batch.`,
        unlockedCount: bulkOps.length,
      });
    }

    if (!userId) {
      return NextResponse.json({ error: "userId or unlockAll is required" }, { status: 400 });
    }

    let submission = await SoftSkillsSubmission.findOne({
      userId,
      slotId: slot._id,
    });

    if (!submission) {
      submission = new SoftSkillsSubmission({
        userId,
        slotId: slot._id,
        status: "PENDING",
        video2Unlocked: unlockValue,
        video2UnlockedAt: unlockValue ? now : null,
        video2UnlockedBy: unlockValue ? currentUser._id : null,
      });
    } else {
      submission.video2Unlocked = unlockValue;
      submission.video2UnlockedAt = unlockValue ? now : null;
      submission.video2UnlockedBy = unlockValue ? currentUser._id : null;
    }

    await submission.save();

    return NextResponse.json({
      success: true,
      message: unlockValue
        ? "Video 2 unlocked successfully for this candidate."
        : "Video 2 locked for this candidate.",
      submission,
    });
  } catch (err) {
    console.error("[POST /api/admin/softskills/unlock] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update video lock status" },
      { status: 500 }
    );
  }
}
