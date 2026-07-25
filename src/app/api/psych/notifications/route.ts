import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Notification } from "@/server/models/Notification";
import { requireUser, userId } from "../_lib/auth";

// GET /api/psych/notifications
export async function GET() {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const notifications = await Notification.find({ recipientId: userId(auth.user) })
      .populate("studentId", "name email")
      .populate("submissionId", "assessmentId status")
      .sort("-createdAt");
    return NextResponse.json(notifications);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
