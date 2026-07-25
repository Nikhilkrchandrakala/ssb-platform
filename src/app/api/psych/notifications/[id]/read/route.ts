import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Notification } from "@/server/models/Notification";
import { requireUser, userId } from "../../../_lib/auth";

type Params = { params: Promise<{ id: string }> };

// PUT /api/psych/notifications/:id/read
export async function PUT(_req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: userId(auth.user) },
      { isRead: true },
      { new: true }
    );
    return NextResponse.json(notification);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
