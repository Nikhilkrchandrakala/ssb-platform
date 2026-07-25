import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { AdminUser } from "@/server/models/AdminUser";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    await connectDB();

    const emailLower = email.toLowerCase().trim();
    const existingUser = await AdminUser.findOne({ email: { $regex: new RegExp(`^${emailLower}$`, "i") } });
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
