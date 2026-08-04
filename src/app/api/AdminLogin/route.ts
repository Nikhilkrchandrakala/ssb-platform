import { NextRequest, NextResponse } from "next/server";
import { signSessionToken, setSessionCookie } from "@/server/auth";
import { resolveLoginCredentials } from "@/server/resolveLogin";

export async function POST(req: NextRequest) {
  try {
    const { phone, email, password } = await req.json();

    if ((!phone && !email) || !password) {
      return NextResponse.json({ error: "Email or Phone and password required" }, { status: 400 });
    }

    const result = await resolveLoginCredentials({ email, phone, password });
    if (result.status === "not_found") {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }
    if (result.status === "invalid_password") {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    const { user, role } = result;
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
