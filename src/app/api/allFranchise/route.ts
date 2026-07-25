import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Franchise } from "@/server/models";

/**
 * GET /api/allFranchise
 * Ported from legacy franchiseRoutes.js. Legacy had no auth; locked to
 * admin/owner here since it lists every franchise partner and their referral codes.
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const data = await Franchise.find().sort({ createdAt: -1 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to fetch franchises" }, { status: 500 });
  }
}
