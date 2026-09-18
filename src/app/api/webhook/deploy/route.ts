import { NextRequest, NextResponse } from "next/server";
import { exec } from "node:child_process";
import { timingSafeEqual } from "node:crypto";

// Force the Node.js runtime (not Edge) — this handler shells out via
// child_process, same as the legacy Express receiver.
export const runtime = "nodejs";

/**
 * POST /api/webhook/deploy
 * Secure GitHub Webhook receiver for push-triggered VPS auto-deployments.
 *
 * NOTE: despite the "webhookRoutes.js" filename suggesting a payment webhook,
 * the legacy source for this file is a GitHub -> VPS deploy hook (query-string
 * secret, `git pull` + `pm2 restart` via child_process) — there is no Razorpay
 * webhook route anywhere in the legacy backend (payment confirmation happens
 * synchronously in orderRoutes.js `/verifyPayment`, which is commerce-agent
 * scope). Ported faithfully as-is; only makes sense when this app is deployed
 * on a persistent VPS with the same git checkout layout, not on serverless
 * platforms like Vercel.
 * Ported from legacy webhookRoutes.js.
 */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") || "";
  // No hardcoded fallback: if DEPLOY_WEBHOOK_SECRET isn't configured on the
  // server the webhook is disabled rather than guessable from the source.
  const expectedSecret = process.env.DEPLOY_WEBHOOK_SECRET || "";

  const a = Buffer.from(secret);
  const b = Buffer.from(expectedSecret);
  if (!expectedSecret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized: Invalid secret token" }, { status: 401 });
  }

  console.log("GitHub Webhook Triggered: Commencing Next.js Platform Auto-Deploy...");

  // Confirmed via `pm2 describe ssb-platform` (2026-09-06): the live process's
  // exec cwd is /var/www/ssb-platform, not /var/www/ssbwithisv/ssb-platform —
  // this hardcoded path was stale (probably left over from an earlier layout)
  // and would have pulled/built in a directory the running app never reads
  // from, making this webhook a silent no-op.
  const repoCwd = "/var/www/ssb-platform";

  setTimeout(() => {
    // 1. Pull the unified repository
    exec("git pull origin main", { cwd: repoCwd }, (err, stdout) => {
      if (err) {
        console.error(`[Webhook] Error pulling codebase: ${err.message}`);
        return;
      }
      console.log(`[Webhook] Code pulled successfully:\n${stdout}`);

      // 2. Install dependencies (required for schema or package updates)
      exec("npm install", { cwd: repoCwd }, (errInstall, stdoutInstall) => {
        if (errInstall) {
          console.error(`[Webhook] Error installing dependencies: ${errInstall.message}`);
          return;
        }
        console.log(`[Webhook] Dependencies installed successfully.`);

        // 3. Compile the Next.js production build (requires sufficient VPS memory)
        console.log("[Webhook] Building Next.js application...");
        exec("npm run build", { cwd: repoCwd }, (errBuild, stdoutBuild) => {
          if (errBuild) {
            console.error(`[Webhook] Error building Next.js: ${errBuild.message}`);
            return;
          }
          console.log(`[Webhook] Build complete:\n${stdoutBuild}`);

          // 4. Restart the Next.js PM2 process
          exec("pm2 restart ssb-platform", (errPm2) => {
            if (errPm2) {
              console.error(`[Webhook] Error restarting PM2: ${errPm2.message}`);
            } else {
              console.log("[Webhook] PM2 process 'ssb-platform' restarted successfully.");
            }
          });
        });
      });
    });
  }, 1000);

  return NextResponse.json({
    status: "ok",
    message: "Deployment triggered. Rebuilding Next.js platform on VPS...",
  });
}
