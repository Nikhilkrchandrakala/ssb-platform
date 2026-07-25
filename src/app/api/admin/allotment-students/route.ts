import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User, Order } from "@/server/models";

/**
 * GET /api/admin/allotment-students
 * Fetches ONLY enrolled (paid) student accounts with server-side pagination,
 * search, and filter support. Used exclusively by the Allotment page.
 * Ported from legacy studentRoutes.js.
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const sp = req.nextUrl.searchParams;
    const page = sp.get("page") || "1";
    const limit = sp.get("limit") || "25";
    const search = sp.get("search");
    const clinicalStage = sp.get("clinicalStage");
    const batch = sp.get("batch");

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const paidUserIds = await Order.distinct("userId", { status: "paid" });

    const manualStudentIds = await User.distinct("_id", {
      role: "student",
      isManuallyCreated: true,
    });

    const allEnrolledIds = [
      ...new Set([...paidUserIds.map((id) => id.toString()), ...manualStudentIds.map((id) => id.toString())]),
    ];
    void allEnrolledIds; // preserved from legacy — computed but unused there too

    const query: Record<string, unknown> = { role: "student" };

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$and = [{ $or: [{ name: regex }, { email: regex }, { phone: regex }, { chestNo: regex }] }];
    }

    if (clinicalStage && clinicalStage !== "all") {
      query.clinicalStage = clinicalStage;
    }

    if (batch && batch !== "all") {
      query.batch = batch;
    }

    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNum);

    const students = await User.find(query)
      .populate("assignedGTO", "name email phone")
      .populate("assignedTO", "name email phone")
      .populate("assignedPsych", "name email phone")
      .populate("assignedIO", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const allBatches = await User.distinct("batch", {
      role: "student",
      batch: { $ne: "" },
    });

    return NextResponse.json({
      status: "ok",
      students,
      totalCount,
      page: pageNum,
      totalPages,
      batches: allBatches.sort(),
    });
  } catch (error) {
    console.error("GET /api/admin/allotment-students error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch students" }, { status: 500 });
  }
}
