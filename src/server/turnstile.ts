const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifies a Cloudflare Turnstile token server-side. Fails closed: any
 * missing secret, network error, or non-success response returns false
 * rather than letting the request through.
 */
export async function verifyTurnstileToken(token: string | undefined | null, remoteIp?: string): Promise<boolean> {
  // Turnstile site keys are domain-restricted in the Cloudflare dashboard —
  // the production key doesn't allow localhost, so the widget can't
  // meaningfully be tested outside the deployed domain. Bypassed in dev
  // only, keyed on an explicit "development" NODE_ENV (same as isDevOtpBypass)
  // so an unset NODE_ENV on the server can never skip verification.
  if (process.env.NODE_ENV === "development") return true;

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
