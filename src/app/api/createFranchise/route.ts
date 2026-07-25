import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Franchise } from "@/server/models";

function generateCode() {
  return "REF" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * POST /api/createFranchise
 * Ported from legacy franchiseRoutes.js. Legacy did not require auth on this
 * endpoint (likely an oversight), but creating a franchise partner is clearly
 * an admin action, so this is locked to admin/owner here.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { name, email, phone, commissionPercent, password } = await req.json();

    if (!password) {
      return NextResponse.json({ message: "Password is required" }, { status: 400 });
    }

    const existing = await Franchise.findOne({ email });

    if (existing) {
      return NextResponse.json({ message: "Email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const referralCode = generateCode();

    const franchise = new Franchise({
      name,
      email,
      phone,
      password: hashedPassword,
      referralCode,
      commissionPercent,
    });

    await franchise.save();

    return NextResponse.json({
      message: "Franchise created",
      data: franchise,
      referralLink: `https://ssbwithisv.in/?ref=${referralCode}`,
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to create franchise" }, { status: 500 });
  }
}
