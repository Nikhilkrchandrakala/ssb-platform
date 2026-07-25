import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Order } from "@/server/models";

/**
 * GET /api/user/purchasedCourses
 * Self-scoped — any logged-in user's own paid orders.
 * Ported from legacy UserProfile.js.
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const userId = currentUser._id || currentUser.id;

    const orders = await Order.find({
      userId,
      status: "paid",
    })
      .populate("slotId", "title price startTime endTime batchNo")
      .sort({ createdAt: -1 });

    return NextResponse.json({ status: "ok", total: orders.length, orders });
  } catch (err) {
    return NextResponse.json({ status: "error", message: err instanceof Error ? err.message : "Failed to fetch purchased courses" }, { status: 500 });
  }
}
