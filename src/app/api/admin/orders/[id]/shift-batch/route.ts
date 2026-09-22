import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Order, Slot, User, Notification } from "@/server/models";

/**
 * PUT /api/admin/orders/:id/shift-batch
 *
 * Atomically transfers a candidate's paid order enrollment from their current slot
 * to a target slot. Updates booked student seat arrays, re-links the order, updates
 * the user profile batch, and creates an in-app dashboard notification.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: orderId } = await params;
    const body = await req.json();
    const { targetSlotId, allowOvercapacity = false, notifyStudent = true } = body;

    if (!targetSlotId) {
      return NextResponse.json({ error: "Target batch is required" }, { status: 400 });
    }

    await connectDB();
    const session = await mongoose.startSession();

    let targetBatchNo = "";
    let targetBatchTitle = "";
    let formattedStartDate = "";

    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(orderId).session(session);
        if (!order) {
          throw new Error("Order record not found");
        }

        const oldSlotId = order.slotId ? order.slotId.toString() : null;
        if (oldSlotId === targetSlotId) {
          return; // Already in target batch
        }

        const targetSlot = await Slot.findById(targetSlotId).session(session);
        if (!targetSlot) {
          throw new Error("Target batch slot not found");
        }
        if (targetSlot.isCancelled) {
          throw new Error("Cannot shift student into a cancelled batch");
        }

        targetBatchNo = (targetSlot.batchNo || "").trim();
        targetBatchTitle = targetSlot.title || `Batch ${targetBatchNo}`;
        formattedStartDate = new Date(targetSlot.startTime).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        // Capacity check
        const currentCount = targetSlot.bookedStudents ? targetSlot.bookedStudents.length : 0;
        if (!allowOvercapacity && currentCount >= (targetSlot.maxStudents || 50)) {
          throw new Error(`Target Batch #${targetBatchNo} is full (${currentCount}/${targetSlot.maxStudents} seats booked). Enable overcapacity override to proceed.`);
        }

        // 1. Remove candidate from old slot's bookedStudents
        if (oldSlotId) {
          await Slot.findByIdAndUpdate(
            oldSlotId,
            { $pull: { bookedStudents: order.userId } },
            { session }
          );
        }

        // 2. Add candidate to target slot's bookedStudents
        await Slot.findByIdAndUpdate(
          targetSlotId,
          { $addToSet: { bookedStudents: order.userId } },
          { session }
        );

        // 3. Re-link the order to target slot
        order.slotId = targetSlot._id;
        await order.save({ session });

        // 4. Update the candidate's User profile
        if (order.userId) {
          await User.findByIdAndUpdate(
            order.userId,
            {
              batch: targetBatchNo,
              enrollmentMode: targetSlot.mode || "online",
            },
            { session }
          );

          // 5. Create in-app dashboard notification for the candidate
          if (notifyStudent) {
            await Notification.create(
              [
                {
                  recipientId: order.userId,
                  studentId: order.userId,
                  title: `Batch Updated: Batch #${targetBatchNo}`,
                  message: `Your batch enrollment has been shifted to Batch #${targetBatchNo} (${targetBatchTitle}), starting on ${formattedStartDate}. Please check your updated schedule under 'My Batches'.`,
                  type: "SYSTEM",
                },
              ],
              { session }
            );
          }
        }
      });

      return NextResponse.json({
        status: "ok",
        message: `Candidate shifted to Batch #${targetBatchNo} (Starts ${formattedStartDate}).`,
        targetSlotId,
        targetBatchNo,
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("PUT /api/admin/orders/:id/shift-batch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to shift student batch" },
      { status: 500 }
    );
  }
}
