import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Lead, User } from "@/server/models";

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
        { email: { $regex: new RegExp("^" + emailLower + "$", "i") } },
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

    const tempPassword = "password123";
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

    return NextResponse.json(
      {
        message: "Lead elevated to registered candidate successfully",
        user: { _id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to elevate lead" }, { status: 500 });
  }
}
