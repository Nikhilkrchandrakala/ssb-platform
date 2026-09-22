import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User, Order, Slot } from "@/server/models";

/**
 * PUT /api/admin/orders/:id/batch
 * Updates the batchNo of the slot linked to this order transaction.
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
    const body = await req.json();
    const batchNo = (body.batchNo || "").trim();
    const targetSlotId = body.targetSlotId;

    if (!batchNo && !targetSlotId) {
      return NextResponse.json({ error: "Batch number or targetSlotId is required" }, { status: 400 });
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order transaction not found" }, { status: 404 });
    }

    // Find destination slot
    let targetSlot = null;
    if (targetSlotId) {
      targetSlot = await Slot.findById(targetSlotId);
    } else if (batchNo) {
      targetSlot = await Slot.findOne({ batchNo, isCancelled: { $ne: true } });
    }

    const oldSlotId = order.slotId ? order.slotId.toString() : null;

    if (targetSlot && targetSlot._id.toString() !== oldSlotId) {
      // Safely transfer student to the target slot
      if (oldSlotId) {
        await Slot.findByIdAndUpdate(oldSlotId, { $pull: { bookedStudents: order.userId } });
      }
      await Slot.findByIdAndUpdate(targetSlot._id, { $addToSet: { bookedStudents: order.userId } });
      order.slotId = targetSlot._id;
      await order.save();

      if (order.userId) {
        await User.findByIdAndUpdate(order.userId, {
          batch: (targetSlot.batchNo || "").trim(),
          enrollmentMode: targetSlot.mode || "online",
        });
      }
    } else if (order.slotId) {
      // Only mutate the slot directly if no other students are booked in it, or fallback
      const oldSlot = await Slot.findById(order.slotId);
      const otherStudents = (oldSlot?.bookedStudents || []).filter(
        (bid: { toString(): string }) => bid.toString() !== (order.userId ? order.userId.toString() : "")
      );

      if (otherStudents.length === 0) {
        await Slot.findByIdAndUpdate(order.slotId, { batchNo });
      }

      if (order.userId) {
        await User.findByIdAndUpdate(order.userId, { batch: batchNo });
      }
    }

    return NextResponse.json({ status: "ok", message: "Order batch details updated successfully" });
  } catch (error) {
    console.error("PUT /api/admin/orders/:id/batch error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update order batch" }, { status: 500 });
  }
}
