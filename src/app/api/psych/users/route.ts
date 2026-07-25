import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { User } from "@/server/models/User";
import { requireUser, requireAdmin } from "../_lib/auth";

// GET /api/psych/users — admin/owner only.
export async function GET() {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const forbidden = requireAdmin(auth.user);
  if (forbidden) return forbidden;

  try {
    const users = await User.find();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
