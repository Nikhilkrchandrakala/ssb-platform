import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Notification } from "@/server/models/Notification";
import { requireUser, userId } from "../../_lib/auth";

// PUT /api/psych/notifications/read-all
export async function PUT() {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    await Notification.updateMany({ recipientId: userId(auth.user), isRead: false }, { $set: { isRead: true } });
    return NextResponse.json({ message: "All notifications marked as read" });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
