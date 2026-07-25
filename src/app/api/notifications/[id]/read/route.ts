import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Notification } from "@/server/models";

/**
 * PUT /api/notifications/:id/read
 * Marks a specific notification as read for the logged-in user.
 * Ported from legacy notificationRoutes.js.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { id } = await params;
    const userId = user._id || user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json({ error: "Notification not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(notification);
  } catch (error) {
    console.error("PUT /api/notifications/:id/read error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to mark notification read" }, { status: 500 });
  }
}
