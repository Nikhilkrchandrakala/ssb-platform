import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/server/rateLimit";
import { connectDB } from "@/server/db";
import { User, Lead } from "@/server/models";
import { signSessionToken, setSessionCookie } from "@/server/auth";
import { last10 } from "@/server/integrations/msg91";
import { verificationTokens } from "@/server/otpStore";
import { submitOfflineJoinContact } from "@/server/integrations/zoho";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/offlineJoin — public, unauthenticated. The offline-batch
 * equivalent of /api/quickJoin, except OTP-gated: the caller must already
 * hold a valid emailVerifyToken/phoneVerifyToken minted by the same
 * /api/signup/verify-email-otp and /api/signup/verify-phone-otp routes the
 * full /SignUp wizard uses (see OfflineJoinPanel.tsx, which drives those
 * steps inline). Token check mirrors /api/register/route.ts exactly.
 *
 * Unlike quickJoin, every account created here is tagged
 * enrollmentMode: "offline" so it lands in the same admin-visible pool as
 * every other offline lead/student (see src/lib/enrollmentMode.ts).
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "offlineJoin", { limit: 10, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const { emailVerifyToken, phoneVerifyToken } = body;

    if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 });
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ message: "A valid email is required" }, { status: 400 });
    }
    if (!phone || last10(phone).length !== 10) {
      return NextResponse.json({ message: "A valid 10-digit phone number is required" }, { status: 400 });
    }

    const phoneLast10 = last10(phone);

    const emailEntry = await verificationTokens.get(`email:${email}`);
    if (!emailEntry || emailEntry.token !== emailVerifyToken || emailEntry.expiresAt < Date.now()) {
      return NextResponse.json({ message: "Email not verified. Please verify your email first." }, { status: 400 });
    }
    const phoneEntry = await verificationTokens.get(`phone:${phoneLast10}`);
    if (!phoneEntry || phoneEntry.token !== phoneVerifyToken || phoneEntry.expiresAt < Date.now()) {
      return NextResponse.json({ message: "Phone not verified. Please verify your phone first." }, { status: 400 });
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
      if (!existingPhone || existingPhone !== phoneLast10) {
        return NextResponse.json(
          { status: "exists", message: "An account with this email already exists. Please log in, or contact us for help." },
          { status: 409 }
        );
      }

      await verificationTokens.delete(`email:${email}`);
      await verificationTokens.delete(`phone:${phoneLast10}`);

      // A passwordless lead resuming here (possibly having first started an
      // online quick-join earlier) — this offline attempt is their most
      // recent expressed intent, so re-tag them accordingly.
      if (existing.enrollmentMode !== "offline") {
        existing.enrollmentMode = "offline";
        await existing.save();
      }

      const token = signSessionToken({ id: String(existing._id), role: existing.role || "lead" });
      await setSessionCookie(token);
      submitOfflineJoinContact(name, email, phone).catch((err) => {
        console.error("[offlineJoin] background Zoho submission failed:", err);
      });
      return NextResponse.json({ status: "ok" });
    }

    let user;
    try {
      user = await User.create({ name, email, phone, role: "lead", enrollmentMode: "offline" });
    } catch (err) {
      const mongoErr = err as { code?: number };
      if (mongoErr?.code === 11000) {
        return NextResponse.json({ message: "That phone number is already registered to another account." }, { status: 409 });
      }
      throw err;
    }

    await verificationTokens.delete(`email:${email}`);
    await verificationTokens.delete(`phone:${phoneLast10}`);

    await Lead.create({ name, email, phoneNumber: phone, enrollmentMode: "offline" }).catch((err) => {
      console.error("[offlineJoin] Lead.create failed (non-fatal)", err);
    });

    const token = signSessionToken({ id: String(user._id), role: user.role || "lead" });
    await setSessionCookie(token);

    submitOfflineJoinContact(name, email, phone).catch((err) => {
      console.error("[offlineJoin] background Zoho submission failed:", err);
    });

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
