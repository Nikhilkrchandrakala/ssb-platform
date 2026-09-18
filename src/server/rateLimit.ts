import { NextRequest, NextResponse } from "next/server";

// In-memory fixed-window limiter. Fine for the single PM2 process this app
// runs as on the VPS; if it's ever scaled to multiple instances, each keeps
// its own counters (limits become per-instance) — move to Mongo/Redis then.
const hits = new Map<string, { count: number; resetAt: number }>();

let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }
}

// Behind Nginx: X-Real-IP is set by the proxy itself; otherwise take the
// right-most X-Forwarded-For entry (added by our proxy — the left-most ones
// are client-supplied and spoofable).
function clientIp(req: NextRequest): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}

/** Returns a 429 response when the caller is over the limit, otherwise null. */
export function rateLimit(
  req: NextRequest,
  name: string,
  opts: { limit: number; windowMs: number }
): NextResponse | null {
  if (process.env.NODE_ENV === "development") return null;

  const now = Date.now();
  sweep(now);

  const key = `${name}:${clientIp(req)}`;
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }
  entry.count += 1;
  if (entry.count > opts.limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many attempts. Please try again later.", message: "Too many attempts. Please try again later.", success: false },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }
  return null;
}
