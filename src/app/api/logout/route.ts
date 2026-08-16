import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, COOKIE_DOMAIN } from "@/server/auth";

export async function POST() {
  const res = NextResponse.json({ status: "ok" });
  // Two Set-Cookie headers, built by hand and appended directly to this
  // response — going through cookies().set() (clearSessionCookie()) twice
  // for the same name only produced one final header in practice (the
  // second call's mutation silently won), so multiple Set-Cookie lines for
  // the same cookie name need res.headers.append() instead.
  //
  // Deleting a cookie requires matching the Domain it was set with, and
  // sessions established before the cookie-domain fix (2026-08-16) are
  // host-only (no Domain attribute) — clearing only the new
  // .ssbwithisv.in-scoped variant would leave a pre-existing host-only
  // session logged in. Clear both forms so logout works regardless of when
  // the session was created.
  if (COOKIE_DOMAIN) {
    res.headers.append("Set-Cookie", `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; Domain=${COOKIE_DOMAIN}`);
  }
  res.headers.append("Set-Cookie", `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0`);
  return res;
}
