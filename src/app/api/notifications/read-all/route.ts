import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Notification } from "@/server/models";

/**
 * PUT /api/notifications/read-all
 * Marks all notifications as read for the logged-in user.
 * Ported from legacy notificationRoutes.js.
 */
export async function PUT() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const userId = user._id || user.id;

    await Notification.updateMany({ recipientId: userId, isRead: false }, { $set: { isRead: true } });

    return NextResponse.json({ status: "ok", message: "All notifications marked as read" });
  } catch (error) {
    console.error("PUT /api/notifications/read-all error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to mark notifications read" }, { status: 500 });
  }
}
