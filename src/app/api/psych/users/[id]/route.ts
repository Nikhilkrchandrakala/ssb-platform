import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { User } from "@/server/models/User";
import { requireUser, requireAdmin } from "../../_lib/auth";

type Params = { params: Promise<{ id: string }> };

// PUT /api/psych/users/:id — admin/owner only.
export async function PUT(req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const forbidden = requireAdmin(auth.user);
  if (forbidden) return forbidden;
  const { id } = await params;

  try {
    const body = await req.json();
    const user = await User.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
