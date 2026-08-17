import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { DeletedUserLog } from "@/server/models";

/**
 * GET /api/admin/deleted-users
 * Recent-deletions audit trail — see DELETE /api/admin/students/[id], which
 * writes one of these right before permanently purging an account and every
 * record that referenced it. This is the only place left to answer "who did
 * we delete and when" once that cascade has run.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(user, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const logs = await DeletedUserLog.find({}).sort({ createdAt: -1 }).limit(200);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET /api/admin/deleted-users error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch deletion log" }, { status: 500 });
  }
}
