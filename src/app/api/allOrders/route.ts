import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Order } from "@/server/models";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await connectDB();

    const orders = await Order.find({ status: "paid" })
      .populate("userId", "name email")
      .populate("slotId", "title batchNo price startTime endTime maxStudents")
      .populate("salesPersonId", "name email")
      .populate("installmentPlanId", "status installments")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      total: orders.length,
      orders,
    });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
