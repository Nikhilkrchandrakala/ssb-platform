import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Franchise, Order } from "@/server/models";

/**
 * GET /api/myDashboard
 * Logged-in franchise's own sales dashboard, scoped to their own referral code.
 * Ported from legacy franchiseRoutes.js.
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["franchise"])) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const userId = String(currentUser._id || currentUser.id);

    const franchise = await Franchise.findById(userId);

    if (!franchise) {
      return NextResponse.json({ message: "Franchise not found" }, { status: 404 });
    }

    const orders = await Order.find({
      referralCode: franchise.referralCode,
      status: "paid",
    })
      .populate("userId", "name email")
      .populate("slotId", "title price startTime endTime")
      .sort({ createdAt: -1 });

    const totalSales = orders.reduce((sum, o) => sum + (o.price || 0), 0);
    const commissionPercent = franchise.commissionPercent || 0;
    const commission = (totalSales * commissionPercent) / 100;

    return NextResponse.json({
      franchise,
      totalSales,
      totalOrders: orders.length,
      commission,
      orders,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to fetch dashboard" }, { status: 500 });
  }
}
