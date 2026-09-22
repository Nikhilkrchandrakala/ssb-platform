import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Slot, Order, User, Submission, Notification } from "@/server/models";

/**
 * POST /api/admin/batches/consolidate
 *
 * Atomically cancels one or more source batches (soft deletion), merges their registered
 * candidates into a designated target batch, and optionally reschedules the target batch's
 * start date. Creates in-app notifications on the students' dashboards.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      targetSlotId,
      newStartDate,
      sourceSlotIds = [],
      updatedCapacity,
      notifyStudents = true,
    } = body;

    if (!targetSlotId) {
      return NextResponse.json({ error: "Target batch is required" }, { status: 400 });
    }

    await connectDB();
    const session = await mongoose.startSession();

    let targetBatchNo = "";
    let targetBatchTitle = "";
    let formattedStartDate = "";
    let targetStudentIds: string[] = [];
    let mergedStudentIds: string[] = [];
    let dateWasRescheduled = false;

    try {
      await session.withTransaction(async () => {
        // 1. Resolve target slot
        const targetSlot = await Slot.findById(targetSlotId).session(session);
        if (!targetSlot) {
          throw new Error("Target batch slot not found");
        }
        if (targetSlot.isCancelled) {
          throw new Error("Cannot merge into a cancelled batch");
        }

        targetBatchNo = (targetSlot.batchNo || "").trim();
        targetBatchTitle = targetSlot.title || `Batch ${targetBatchNo}`;

        // 2. Reschedule target slot if newStartDate is supplied
        if (newStartDate) {
          const start = new Date(newStartDate);
          if (Number.isNaN(start.getTime())) {
            throw new Error("Invalid start date format");
          }
          targetSlot.startTime = start.toISOString();
          targetSlot.endTime = new Date(start.getTime() + 86400000).toISOString();
          dateWasRescheduled = true;
        }

        formattedStartDate = new Date(targetSlot.startTime).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        // Current students in target slot
        targetStudentIds = (targetSlot.bookedStudents || []).map((id: { toString(): string }) => id.toString());

        // 3. Process source slots to cancel & merge
        const validSourceIds = (sourceSlotIds as string[]).filter((id) => id && id !== targetSlotId);

        if (validSourceIds.length > 0) {
          // Find paid orders referencing the source slots
          const sourceOrders = await Order.find({
            slotId: { $in: validSourceIds },
            status: "paid",
          }).session(session);

          mergedStudentIds = Array.from(
            new Set(sourceOrders.map((o: { userId: { toString(): string } }) => o.userId.toString()))
          );

          // 4. Combine students and verify capacity
          const combinedSet = new Set([...targetStudentIds, ...mergedStudentIds]);

          if (updatedCapacity && typeof updatedCapacity === "number" && updatedCapacity > 0) {
            targetSlot.maxStudents = Math.max(updatedCapacity, combinedSet.size);
          } else if (combinedSet.size > (targetSlot.maxStudents || 0)) {
            targetSlot.maxStudents = combinedSet.size + 5; // Auto-expand capacity
          }

          targetSlot.bookedStudents = Array.from(combinedSet);

          // 5. Re-link source orders to target slot
          await Order.updateMany(
            { slotId: { $in: validSourceIds }, status: "paid" },
            { $set: { slotId: targetSlot._id } },
            { session }
          );

          // 6. Update user profile batch strings for all merged candidates
          if (mergedStudentIds.length > 0) {
            await User.updateMany(
              { _id: { $in: mergedStudentIds } },
              {
                $set: {
                  batch: targetSlot.batchNo.trim(),
                  enrollmentMode: targetSlot.mode || "online",
                },
              },
              { session }
            );
          }

          // 7. Soft-delete the source slots
          await Slot.updateMany(
            { _id: { $in: validSourceIds } },
            {
              $set: {
                isCancelled: true,
                cancelledAt: new Date(),
                mergedInto: targetSlot._id,
                bookedStudents: [],
              },
            },
            { session }
          );
        }

        // Save the updated target slot
        await targetSlot.save({ session });

        // 8. Sanitize pre-scheduled meetings if date changed to a future date
        if (dateWasRescheduled) {
          const newStartInstant = new Date(targetSlot.startTime);
          const allAffectedStudentIds = Array.from(new Set([...targetStudentIds, ...mergedStudentIds]));

          await Submission.updateMany(
            {
              userId: { $in: allAffectedStudentIds },
              $or: [
                { psychMeetingDate: { $lt: newStartInstant } },
                { ioMeetingDate: { $lt: newStartInstant } },
                { gtoMeetingDate: { $lt: newStartInstant } },
                { toMeetingDate: { $lt: newStartInstant } },
              ],
            },
            {
              $set: {
                psychMeetingDate: null,
                psychMeetingLink: null,
                ioMeetingDate: null,
                ioMeetingLink: null,
                gtoMeetingDate: null,
                gtoMeetingLink: null,
                toMeetingDate: null,
                toMeetingLink: null,
              },
            },
            { session }
          );
        }

        // 9. In-app notifications for candidates
        if (notifyStudents) {
          const notificationDocs: Array<{
            recipientId: string;
            studentId: string;
            title: string;
            message: string;
            type: "SYSTEM";
          }> = [];

          // Group A: Merged students transferred into target batch
          for (const studentId of mergedStudentIds) {
            notificationDocs.push({
              recipientId: studentId,
              studentId,
              title: `Batch Transfer: Batch #${targetBatchNo}`,
              message: `Your training has been transferred to Batch #${targetBatchNo} (${targetBatchTitle}), commencing on ${formattedStartDate}. Please check your updated schedule under 'My Batches'.`,
              type: "SYSTEM",
            });
          }

          // Group B: Original target batch students if date changed
          if (dateWasRescheduled) {
            for (const studentId of targetStudentIds) {
              if (!mergedStudentIds.includes(studentId)) {
                notificationDocs.push({
                  recipientId: studentId,
                  studentId,
                  title: `Schedule Revised: Batch #${targetBatchNo}`,
                  message: `The commencement date for Batch #${targetBatchNo} (${targetBatchTitle}) has been rescheduled to ${formattedStartDate}. Please review your revised schedule under 'My Batches'.`,
                  type: "SYSTEM",
                });
              }
            }
          }

          if (notificationDocs.length > 0) {
            await Notification.insertMany(notificationDocs, { session });
          }
        }
      });

      return NextResponse.json({
        status: "ok",
        message: `Successfully consolidated into Batch #${targetBatchNo} starting on ${formattedStartDate}.`,
        targetSlotId,
        dateRescheduled: dateWasRescheduled,
        mergedCount: mergedStudentIds.length,
        totalEnrolled: targetStudentIds.length + mergedStudentIds.length,
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("POST /api/admin/batches/consolidate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to consolidate batches" },
      { status: 500 }
    );
  }
}
