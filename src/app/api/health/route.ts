import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db";
import { User, AdminUser } from "@/server/models";
import { signSessionToken, getCurrentUser } from "@/server/auth";

// Phase 1 verification endpoint: read-only DB check + a pure JWT round-trip.
// Does not create/modify any documents in the (production) Atlas cluster.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Access Denied: disabled in production" }, { status: 403 });
  }

  await connectDB();

  const [userCount, adminCount] = await Promise.all([
    User.countDocuments(),
    AdminUser.countDocuments(),
  ]);

  const token = signSessionToken({ id: "phase1-check", role: "student" });
  const currentUser = await getCurrentUser(); // null unless a real session cookie is present

  return NextResponse.json({
    db: {
      connected: mongoose.connection.readyState === 1,
      dbName: mongoose.connection.db?.databaseName ?? null,
      userCount,
      adminCount,
    },
    jwtRoundTripOk: typeof token === "string" && token.length > 0,
    currentUser,
  });
}
