import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Franchise, Order } from "@/server/models";

/**
 * GET /api/franchiseDetails/:code
 * Fetches a single franchise plus its paid sales/commission summary.
 * Ported from legacy franchiseRoutes.js. Legacy had no auth; locked to
 * admin/owner here since it exposes sales and commission figures.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { code } = await params;

    const franchise = await Franchise.findOne({ referralCode: code });

    if (!franchise) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const orders = await Order.find({
      referralCode: code,
      status: "paid",
    })
      .populate("userId", "name email")
      .populate("slotId", "title price startTime endTime")
      .sort({ createdAt: -1 });

    const totalSales = orders.reduce((sum, o) => sum + (o.price || 0), 0);
    const commission = (totalSales * franchise.commissionPercent) / 100;

    return NextResponse.json({
      franchise,
      totalSales,
      totalOrders: orders.length,
      commission,
      orders,
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to fetch franchise details" }, { status: 500 });
  }
}
