import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";

// Shared across the main site, admin panel, and psych-battery — all three
// resolve "who am I" from the same session cookie via this one endpoint now,
// replacing psych-battery's separate `/api/auth/me`.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
