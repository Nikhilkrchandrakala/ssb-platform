import { NextRequest } from "next/server";

/**
 * Shared-secret auth for the sales module's cron routes (salesimplementation.md
 * Phase 5) — these are invoked by the VPS's OS crontab via `curl`, not a
 * logged-in browser session, so there's no user to call getCurrentUser() for.
 */
export function isValidCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if the secret was never provisioned
  return req.headers.get("x-cron-secret") === secret;
}
