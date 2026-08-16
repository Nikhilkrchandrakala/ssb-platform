import { NextResponse } from "next/server";
import { clearSessionCookie, SESSION_COOKIE_NAME } from "@/server/auth";

export async function POST() {
  await clearSessionCookie();
  const res = NextResponse.json({ status: "ok" });
  // Deleting a cookie requires matching the Domain it was set with. Sessions
  // established before the cookie-domain fix (2026-08-16) are host-only (no
  // Domain attribute) — clearSessionCookie() alone only clears the new
  // .ssbwithisv.in-scoped variant, so a pre-existing host-only session would
  // otherwise survive logout. Explicitly clear the undomained form too so
  // logout works regardless of when the session was created.
  res.headers.append("Set-Cookie", `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0`);
  return res;
}
