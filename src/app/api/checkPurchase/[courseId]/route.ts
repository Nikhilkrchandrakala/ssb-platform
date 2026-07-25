import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Order } from "@/server/models";

// `courseId` here is a module slug (e.g. "ssb_ppdt", "psych", "full_course"),
// the same values createOrder stores in Order.selectedModules — Order never
// had a `courseId` field. A slot booked as isFullCourse grants every module
// even if selectedModules itself is empty, so that's resolved via slotId.
export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courseId } = await params;

    await connectDB();

    const orders = await Order.find({
      userId: String(user._id),
      status: "paid",
      // Sales module (salesimplementation.md Phase 5): a defaulted installment
      // plan's revoked order must not grant access, even though it's still
      // technically `status: "paid"` from its first installment.
      accessRevoked: { $ne: true },
    }).populate("slotId", "isFullCourse");

    const purchased = orders.some((order) => {
      const modules: string[] = order.selectedModules || [];
      if (modules.includes(courseId) || modules.includes("full_course")) return true;
      const slot = order.slotId as { isFullCourse?: boolean } | null;
      return Boolean(slot?.isFullCourse);
    });

    return NextResponse.json({ purchased });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
