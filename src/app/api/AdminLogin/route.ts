import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/server/db";
import { AdminUser } from "@/server/models/AdminUser";
import { Franchise } from "@/server/models/Franchise";
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

    const phoneLast10 = phone ? last10(phone) : null;
    const emailClean = email ? email.trim() : null;

    type Candidate = { _id: unknown; password?: string; name?: string; email?: string; phone?: string; role?: string; assessorType?: string | null; permissions?: string[] };
    let user: Candidate | null = null;
    let role = "";

    // 1. Admin/owner check
    if (phone) {
      user = await AdminUser.findOne({ phone: { $regex: new RegExp(`${phoneLast10}$`) } });
    } else if (email) {
      user = await AdminUser.findOne({ email: { $regex: new RegExp(`^${emailClean}$`, "i") } });
    }
    if (user) {
      role = user.role === "owner" ? "owner" : "admin";
    } else {
      // 2. Franchise check
      if (phone) {
        user = await Franchise.findOne({ phone: { $regex: new RegExp(`${phoneLast10}$`) } });
      } else if (email) {
        user = await Franchise.findOne({ email: { $regex: new RegExp(`^${emailClean}$`, "i") } });
      }
      if (user) role = "franchise";
    }

    // 3. Assessor check (in main User collection)
    if (!user) {
      let assessorUser = null;
      if (phone) {
        assessorUser = await User.findOne({ phone: { $regex: new RegExp(`${phoneLast10}$`) }, role: "assessor" });
      } else if (email) {
        assessorUser = await User.findOne({ email: { $regex: new RegExp(`^${emailClean}$`, "i") }, role: "assessor" });
      }
      if (assessorUser) {
        user = assessorUser;
        role = "assessor";
      }
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    const token = signSessionToken({ id: String(user._id), role });
    await setSessionCookie(token);

    return NextResponse.json({
      status: "ok",
      role,
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        assessorType: role === "assessor" ? user.assessorType || null : null,
        permissions: role === "admin" || role === "owner" ? user.permissions || [] : [],
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 500 });
  }
}
