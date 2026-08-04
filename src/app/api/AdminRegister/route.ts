import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { AdminUser } from "@/server/models/AdminUser";
import { getCurrentUser, hasRole } from "@/server/auth";

// This endpoint mints new admin accounts, so it must never be reachable
// without an existing owner session — it was originally ported verbatim from
// the legacy Express backend (Ssbwithisv-website-backend/Backend/api/AdminRegister.js),
// which had no auth check at all, letting anyone self-provision admin access.
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasRole(currentUser, ["owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    await connectDB();

    const emailLower = email.toLowerCase().trim();
    const escapedEmail = emailLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existingUser = await AdminUser.findOne({ email: { $regex: new RegExp(`^${escapedEmail}$`, "i") } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const newUser = new AdminUser({ email: emailLower, password });
    await newUser.save();

    return NextResponse.json({ status: "ok", message: "User registered successfully" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registration failed" }, { status: 500 });
  }
}
