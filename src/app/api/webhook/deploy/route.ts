import { NextRequest, NextResponse } from "next/server";
import { exec } from "node:child_process";

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
  const secret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.DEPLOY_WEBHOOK_SECRET || "Joint3servicesDeploySecret2026";

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized: Invalid secret token" }, { status: 401 });
  }

  console.log("GitHub Webhook Triggered: Commencing VPS Auto-Deploy...");

  setTimeout(() => {
    exec("git pull origin main", { cwd: "/var/www/ssbwithisv/Backend" }, (err, stdout) => {
      if (err) {
        console.error(`[Webhook] Error pulling Backend: ${err.message}`);
      } else {
        console.log(`[Webhook] Backend pulled successfully:\n${stdout}`);
      }

      exec("git pull origin main", { cwd: "/var/www/ssbwithisv/admin" }, (errAdmin, stdoutAdmin) => {
        if (errAdmin) {
          console.error(`[Webhook] Error pulling Admin UI: ${errAdmin.message}`);
        } else {
          console.log(`[Webhook] Admin UI pulled successfully:\n${stdoutAdmin}`);
        }

        console.log("[Webhook] Compiling application (npm run build)...");
        exec("npm run build", { cwd: "/var/www/ssbwithisv/admin" }, (errBuild, stdoutBuild) => {
          if (errBuild) {
            console.error(`[Webhook] Error compiling Admin UI: ${errBuild.message}`);
          } else {
            console.log(`[Webhook] Admin UI compiled successfully:\n${stdoutBuild}`);
          }

          console.log("[Webhook] Restarting all processes with PM2...");
          exec("pm2 restart all", (errPm2) => {
            if (errPm2) {
              console.error(`[Webhook] Error restarting PM2: ${errPm2.message}`);
            } else {
              console.log("[Webhook] All PM2 processes restarted successfully.");
            }
          });
        });
      });
    });
  }, 1000);

  return NextResponse.json({
    status: "ok",
    message: "Deployment triggered successfully. Processing updates on the VPS...",
  });
}
