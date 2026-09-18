import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { User, Order, Slot } from "@/server/models";

/**
 * GET /api/admin/allotment-orders
 * Fetches paid Orders (one row per batch enrollment) with server-side
 * pagination, search, and filter support. Replaces /api/admin/allotment-students
 * as the Allotment page's data source: assessor allotment now lives on the
 * Order, not the student, so a student with 2 paid batches shows as 2
 * independently-allottable rows instead of one row whose second allotment
 * silently overwrote the first.
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
    const moduleFilter = sp.get("clinicalStage"); // kept as the same param name the client already uses
    const batch = sp.get("batch");
    const mode = sp.get("mode");

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const andConditions: Record<string, unknown>[] = [{ status: "paid" }];

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      const matchingUserIds = await User.distinct("_id", {
        $or: [{ name: regex }, { email: regex }, { phone: regex }, { chestNo: regex }],
      });
      andConditions.push({ userId: { $in: matchingUserIds } });
    }

    if (mode === "online" || mode === "offline") {
      // Filtered off the ORDER's own slot, not User.enrollmentMode — a
      // student can have both an online and an offline batch (e.g. bought
      // one of each), and enrollmentMode is a single global flag on User
      // that the offline booking flow sets permanently, silently
      // mislabeling that student's other, unrelated online orders too. Same
      // $exists fallback as elsewhere: a raw distinct() never sees the
      // schema-level "online" default that only applies once Mongoose
      // hydrates a document.
      const matchingModeSlotIds = await Slot.distinct(
        "_id",
        mode === "online" ? { $or: [{ mode: "online" }, { mode: { $exists: false } }] } : { mode: "offline" }
      );
      andConditions.push({ slotId: { $in: matchingModeSlotIds } });
    }

    if (batch && batch !== "all") {
      const matchingSlotIds = await Slot.distinct("_id", { batchNo: batch });
      andConditions.push({ slotId: { $in: matchingSlotIds } });
    }

    if (moduleFilter && moduleFilter !== "all") {
      // A full-course order (explicit "full_course" or an empty
      // selectedModules array, per createOrder's own fallback semantics)
      // covers every specific module too — mirrors the
      // stages.includes("full_course") || stages.includes(target) gating
      // used everywhere else in this codebase.
      andConditions.push({
        $or: [{ selectedModules: moduleFilter }, { selectedModules: "full_course" }, { selectedModules: { $size: 0 } }],
      });
    }

    const query = { $and: andConditions };

    const totalCount = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNum);

    const orders = await Order.find(query)
      .populate("userId", "name email phone chestNo batch enrollmentMode profileImage")
      .populate("slotId", "title batchNo isFullCourse mode")
      .populate("assignedGTO", "name email phone")
      .populate("assignedTO", "name email phone")
      .populate("assignedPsych", "name email phone")
      .populate("assignedIO", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Rows whose student was later deleted (Order kept for financial
    // history, see Order's buyerName/buyerEmail comment) have no populated
    // userId — not allottable, so drop them from this list rather than
    // rendering a broken row.
    const rows = orders.filter((o) => o.userId);

    const paidSlotIds = await Order.distinct("slotId", { status: "paid" });
    const allBatches = await Slot.distinct("batchNo", { _id: { $in: paidSlotIds }, batchNo: { $ne: "" } });

    return NextResponse.json({
      status: "ok",
      orders: rows,
      totalCount,
      page: pageNum,
      totalPages,
      batches: allBatches.sort(),
    });
  } catch (error) {
    console.error("GET /api/admin/allotment-orders error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch allotment orders" }, { status: 500 });
  }
}
