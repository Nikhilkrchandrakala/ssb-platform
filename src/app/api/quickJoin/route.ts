import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { User, Lead } from "@/server/models";
import { signSessionToken, setSessionCookie } from "@/server/auth";
import { last10 } from "@/server/integrations/msg91";
import { verifyTurnstileToken } from "@/server/turnstile";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/quickJoin — public, unauthenticated. The "Join SSB Batch" quick
 * signup: name/email/phone only (from the Zoho Web-to-Contact embed on
 * /Batches), no OTP, no password. Silently establishes a session for a
 * brand-new or still-passwordless lead so they can go straight into
 * checkout — real credentials only get generated once they actually pay
 * (see /api/verifyPayment's isNewAccount branch).
 *
 * Deliberately narrow security model, since this is the only public route
 * in the app that mints a session from unverified input: never auto-session
 * an email that already has a real password (existing account — points the
 * frontend at Log In instead), and for an existing *passwordless* record
 * only reuse it if the phone typed here also matches what's already on
 * file. Without that second check, anyone who knows/guesses a lead's email
 * (e.g. one already added via the admin Sales panel) could type it in here
 * and get a live session as that person — the phone match is what closes
 * that hole while still letting someone who abandoned this same form
 * earlier pick up where they left off.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();

    if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 });
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ message: "A valid email is required" }, { status: 400 });
    }
    if (!phone || last10(phone).length !== 10) {
      return NextResponse.json({ message: "A valid 10-digit phone number is required" }, { status: 400 });
    }

    const turnstileOk = await verifyTurnstileToken(body.turnstileToken, req.headers.get("cf-connecting-ip") || undefined);
    if (!turnstileOk) {
      return NextResponse.json({ message: "Verification failed. Please try again." }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email });

    if (existing) {
      if (existing.password) {
        return NextResponse.json(
          { status: "exists", message: "An account with this email already exists. Please log in instead." },
          { status: 409 }
        );
      }
      const existingPhone = existing.phone ? last10(existing.phone) : "";
      if (!existingPhone || existingPhone !== last10(phone)) {
        return NextResponse.json(
          { status: "exists", message: "An account with this email already exists. Please log in, or contact us for help." },
          { status: 409 }
        );
      }

      // Phone matches what's already on file — safe to re-session this record.
      const token = signSessionToken({ id: String(existing._id), role: existing.role || "lead" });
      await setSessionCookie(token);
      return NextResponse.json({ status: "ok" });
    }

    let user;
    try {
      user = await User.create({ name, email, phone, role: "lead" });
    } catch (err) {
      // Duplicate-phone unique-index collision (phone is unique+sparse) —
      // surface a friendly message rather than a raw 500.
      const mongoErr = err as { code?: number };
      if (mongoErr?.code === 11000) {
        return NextResponse.json({ message: "That phone number is already registered to another account." }, { status: 409 });
      }
      throw err;
    }

    // Best-effort — mirrors the existing best-effort /api/addLead call the
    // full /SignUp flow already makes after registration.
    await Lead.create({ name, email, phoneNumber: phone }).catch((err) => {
      console.error("[quickJoin] Lead.create failed (non-fatal)", err);
    });

    const token = signSessionToken({ id: String(user._id), role: user.role || "lead" });
    await setSessionCookie(token);

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
