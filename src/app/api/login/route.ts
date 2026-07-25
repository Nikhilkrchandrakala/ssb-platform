import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/server/db";
import { User } from "@/server/models/User";
import { signSessionToken, setSessionCookie } from "@/server/auth";
import { last10 } from "@/server/integrations/msg91";

export async function POST(req: NextRequest) {
  try {
    const { phone, email, password } = await req.json();

    if ((!phone && !email) || !password) {
      return NextResponse.json({ error: "Email or Phone and password required" }, { status: 400 });
    }

    await connectDB();

    let user;
    if (phone) {
      user = await User.findOne({ phone: { $regex: new RegExp(`${last10(phone)}$`) } });
    } else {
      const emailClean = email.trim();
      user = await User.findOne({ email: { $regex: new RegExp(`^${emailClean}$`, "i") } });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    if (user.role === "assessor" || user.role === "admin" || user.role === "owner") {
      return NextResponse.json({ error: "Access denied. Please use the admin login portal." }, { status: 403 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    const token = signSessionToken({ id: user._id.toString(), role: user.role || "student" });
    await setSessionCookie(token);

    return NextResponse.json({
      status: "ok",
      user: { name: user.name, email: user.email, phone: user.phone },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 500 });
  }
}
