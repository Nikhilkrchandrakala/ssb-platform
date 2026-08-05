import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User } from "@/server/models";
import { computeBatchAllotmentSummary } from "@/server/allotmentSummary";

/**
 * GET /api/admin/allotment-summary?batch=X
 * Preview for the "Notify Assessors" page: always returns the full batch
 * list (for the selector); when `batch` is given, also returns each
 * assessor's current candidate count in that batch.
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const batches = (await User.distinct("batch", { role: "student", batch: { $ne: "" } })).sort();

    const batch = req.nextUrl.searchParams.get("batch");
    const assessors = batch ? await computeBatchAllotmentSummary(batch) : [];

    return NextResponse.json({ status: "ok", batches, assessors });
  } catch (error) {
    console.error("GET /api/admin/allotment-summary error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load allotment summary" }, { status: 500 });
  }
}
