import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Notification } from "@/server/models";

/**
 * DELETE /api/notifications/:id
 * Deletes a specific notification belonging to the logged-in user.
 * Ported from legacy notificationRoutes.js.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { id } = await params;
    const userId = user._id || user.id;

    const notification = await Notification.findOneAndDelete({ _id: id, recipientId: userId });

    if (!notification) {
      return NextResponse.json({ error: "Notification not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ status: "ok", message: "Notification deleted" });
  } catch (error) {
    console.error("DELETE /api/notifications/:id error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete notification" }, { status: 500 });
  }
}
