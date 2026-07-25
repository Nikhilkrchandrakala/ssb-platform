import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Order } from "@/server/models";

// Legacy route did `.populate("courseId")`, but Order never had a `courseId`
// field (only `slotId`) — populating slotId is the resolution path instead.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const orders = await Order.find({
    userId: String(user._id),
    status: "paid",
  })
    .populate("slotId", "title price startTime endTime batchNo isFullCourse")
    .sort({ createdAt: -1 });

  return NextResponse.json(orders);
}
