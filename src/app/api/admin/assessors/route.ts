import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User } from "@/server/models";

/**
 * GET /api/admin/assessors
 * Fetches all assessor accounts along with their active load calculation (assigned count).
 * Ported from legacy studentRoutes.js.
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const assessors = await User.find({ role: "assessor" }).select("-password").lean();

    const resultList = await Promise.all(
      assessors.map(async (assessor) => {
        const activeLoad = await User.countDocuments({
          $or: [
            { assignedGTO: assessor._id },
            { assignedTO: assessor._id },
            { assignedPsych: assessor._id },
            { assignedIO: assessor._id },
          ],
        });

        return { ...assessor, activeLoad };
      })
    );

    return NextResponse.json({ status: "ok", assessors: resultList });
  } catch (error) {
    console.error("GET /api/admin/assessors error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch assessors" }, { status: 500 });
  }
}
