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
    const { batchNo } = await req.json();

    if (batchNo === undefined) {
      return NextResponse.json({ error: "Batch number is required" }, { status: 400 });
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order transaction not found" }, { status: 404 });
    }

    if (!order.slotId) {
      return NextResponse.json({ error: "No slot linked to this transaction" }, { status: 400 });
    }

    await Slot.findByIdAndUpdate(order.slotId, { batchNo: (batchNo || "").trim() });

    if (order.userId) {
      await User.findByIdAndUpdate(order.userId, { batch: (batchNo || "").trim() });
    }

    return NextResponse.json({ status: "ok", message: "Order batch details updated successfully" });
  } catch (error) {
    console.error("PUT /api/admin/orders/:id/batch error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update order batch" }, { status: 500 });
  }
}
