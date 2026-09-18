import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import crypto from "node:crypto";
import { Lead, User } from "@/server/models";
import { escapeRegExp } from "@/server/escapeRegExp";
import { sendCredentialsEmail } from "@/server/integrations/msg91";

/**
 * POST /api/leads/:id/elevate
 * Elevates a Lead entry to a registered student User account with a temporary
 * password. Legacy had no auth on this endpoint; locked to admin/owner here
 * since it creates a real login-capable account.
 * Ported from legacy Leads.js.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const lead = await Lead.findById(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const emailLower = (lead.email || "").toLowerCase().trim();
    const phone = (lead.phoneNumber || "").replace(/\D/g, "");
    const last10 = phone.length >= 10 ? phone.slice(-10) : phone;

    const existingUser = await User.findOne({
      $or: [
        { email: { $regex: new RegExp("^" + escapeRegExp(emailLower) + "$", "i") } },
        ...(last10 ? [{ phone: { $regex: new RegExp(last10 + "$") } }] : []),
      ],
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "This lead is already a registered user",
          user: { name: existingUser.name, email: existingUser.email, role: existingUser.role },
        },
        { status: 409 }
      );
    }

    // Random per-account password — never a shared, guessable constant.
    const tempPassword = crypto.randomBytes(9).toString("base64url");
    const newUser = new User({
      name: (lead.name || "").trim(),
      email: emailLower,
      phone: last10,
      password: tempPassword,
      role: "student",
      batch: "",
      isManuallyCreated: true,
    });

    await newUser.save();

    const mail = await sendCredentialsEmail({
      to: emailLower,
      name: newUser.name || "Candidate",
      username: emailLower,
      password: tempPassword,
    }).catch(() => ({ delivered: false }));

    return NextResponse.json(
      {
        message: "Lead elevated to registered candidate successfully",
        user: { _id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role },
        credentialsEmailed: mail.delivered,
        // Only surfaced when the email didn't go out, so the admin can hand it over directly.
        ...(mail.delivered ? {} : { tempPassword }),
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to elevate lead" }, { status: 500 });
  }
}
