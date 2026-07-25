import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Slot } from "@/server/models";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const { batchNo } = await req.json();

    await connectDB();

    const slot = await Slot.findByIdAndUpdate(id, { batchNo }, { new: true });

    if (!slot) return NextResponse.json({ message: "Batch not found" }, { status: 404 });

    return NextResponse.json({
      message: "Batch number updated successfully",
      data: slot,
    });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
