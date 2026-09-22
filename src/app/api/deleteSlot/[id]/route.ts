import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Slot, Order } from "@/server/models";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    await connectDB();

    const slot = await Slot.findById(id);
    if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

    const orderCount = await Order.countDocuments({ slotId: id });
    const studentCount = slot.bookedStudents?.length || 0;

    // If there are enrolled students or orders, soft-delete to preserve all data
    if (orderCount > 0 || studentCount > 0) {
      slot.isCancelled = true;
      slot.cancelledAt = new Date();
      await slot.save();

      return NextResponse.json({
        message: `Batch #${slot.batchNo || slot.title} has ${studentCount || orderCount} enrolled candidate(s). It has been safely cancelled (soft-deleted). Student orders remain intact and can be consolidated into another batch anytime.`,
        softDeleted: true,
      });
    }

    // If completely empty with zero enrolled students, safe to hard delete
    await Slot.findByIdAndDelete(id);

    return NextResponse.json({ message: "Deleted successfully", softDeleted: false });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
