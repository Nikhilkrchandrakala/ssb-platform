import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Coupon } from "@/server/models";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code } = await req.json();

    await connectDB();

    await Coupon.updateOne(
      { code: code.toUpperCase() },
      {
        $push: {
          usedBy: {
            userId: String(user._id),
            usedAt: new Date(),
          },
        },
      }
    );

    return NextResponse.json({ message: "Coupon marked as used" });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
