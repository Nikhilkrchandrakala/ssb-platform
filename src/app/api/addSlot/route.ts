import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Slot } from "@/server/models";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { title, batchNo, startTime, endTime, maxStudents, price, isFullCourse } = await req.json();

    await connectDB();

    const slot = new Slot({
      title,
      batchNo,
      startTime,
      endTime,
      maxStudents,
      price,
      isFullCourse: isFullCourse || false,
      createdBy: String(user._id),
    });

    await slot.save();

    return NextResponse.json(
      {
        message: "Slot created successfully",
        data: slot,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
