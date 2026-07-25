import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Notification } from "@/server/models";

/**
 * GET /api/notifications
 * Fetch notifications for the logged-in user (any authenticated role — self-scoped).
 * Ported from legacy notificationRoutes.js.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const userId = user._id || user.id;

    const notifications = await Notification.find({ recipientId: userId })
      .populate("studentId", "name email chestNo batch")
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch notifications" }, { status: 500 });
  }
}
