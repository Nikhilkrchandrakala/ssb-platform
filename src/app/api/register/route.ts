import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { User } from "@/server/models/User";
import { AdminUser, Franchise } from "@/server/models";
import { verificationTokens } from "@/server/otpStore";
import { submitSignupLead } from "@/server/integrations/zoho";
import { cleanPhone, last10 } from "@/server/integrations/msg91";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, email, phone, password, emailVerifyToken, phoneVerifyToken,
      dob, ssbAspirant, servingCandidate, vtxHeard,
      youtubeSubscribed, podcastSubscribed, ssbExperience,
      nextSsbDate, ssbBoards, ssbEntries, city, state,
    } = body;

    if (!name || !email || !phone || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one uppercase letter" }, { status: 400 });
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one number" }, { status: 400 });
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one special character" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const cleaned = cleanPhone(phone);
    const phoneLast10 = last10(phone);

    const emailEntry = await verificationTokens.get(`email:${emailLower}`);
    if (!emailEntry || emailEntry.token !== emailVerifyToken || emailEntry.expiresAt < Date.now()) {
      return NextResponse.json({ error: "Email not verified. Please complete email verification first." }, { status: 400 });
    }
    const phoneEntry = await verificationTokens.get(`phone:${phoneLast10}`);
    if (!phoneEntry || phoneEntry.token !== phoneVerifyToken || phoneEntry.expiresAt < Date.now()) {
      return NextResponse.json({ error: "Phone number not verified. Please complete phone verification first." }, { status: 400 });
    }
    await verificationTokens.delete(`email:${emailLower}`);
    await verificationTokens.delete(`phone:${phoneLast10}`);

    await connectDB();

    const escapedEmail = emailLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const emailOrPhoneMatch = {
      $or: [
        { email: { $regex: new RegExp(`^${escapedEmail}$`, "i") } },
        { phone: { $regex: new RegExp(`${phoneLast10}$`) } },
      ],
    };

    const existingUser = await User.findOne(emailOrPhoneMatch);
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // AdminUser/Franchise enforce email uniqueness only within their own
    // collection, so without this check a candidate could self-register with
    // an email/phone already tied to a staff account. Login then resolves
    // AdminUser/Franchise first (see resolveLogin.ts) and never falls
    // through to the new User document, leaving it permanently unable to log
    // in with its own password — so this must be rejected at signup time.
    const [existingAdmin, existingFranchise] = await Promise.all([
      AdminUser.findOne(emailOrPhoneMatch),
      Franchise.findOne(emailOrPhoneMatch),
    ]);
    if (existingAdmin || existingFranchise) {
      return NextResponse.json(
        { error: "This email or phone is already associated with a staff account. Please contact support." },
        { status: 400 }
      );
    }

    const newUser = new User({
      name: name.trim(),
      email: emailLower,
      phone: cleaned,
      password,
      emailVerified: true,
      phoneVerified: true,
      zohoFormFilled: true,
      dob: dob || "",
      ssbAspirant: ssbAspirant || "",
      servingCandidate: servingCandidate || "",
      vtxHeard: vtxHeard || "",
      youtubeSubscribed: youtubeSubscribed || "",
      podcastSubscribed: podcastSubscribed || "",
      ssbExperience: ssbExperience || "",
      nextSsbDate: nextSsbDate || "",
      ssbBoards: Array.isArray(ssbBoards) ? ssbBoards : [],
      ssbEntries: Array.isArray(ssbEntries) ? ssbEntries : [],
      city: city || "",
      state: state || "",
    });

    await newUser.save();

    submitSignupLead(newUser).catch((err) => {
      console.error("[register] background Zoho submission failed:", err);
    });

    return NextResponse.json({ status: "ok", message: "User registered successfully" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registration failed" }, { status: 500 });
  }
}
