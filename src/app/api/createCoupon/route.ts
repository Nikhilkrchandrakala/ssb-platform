import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Coupon } from "@/server/models";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner", "franchise"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { code, discountType, discountValue, expiry } = await req.json();

    if (!code || !discountType || !discountValue) {
      return NextResponse.json({ message: "All fields required" }, { status: 400 });
    }

    await connectDB();

    // duplicate check
    const exists = await Coupon.findOne({ code: code.toUpperCase() });
    if (exists) {
      return NextResponse.json({ message: "Coupon already exists" }, { status: 400 });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      expiry,
    });

    await coupon.save();

    return NextResponse.json({
      message: "Coupon created successfully",
      coupon,
    });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
