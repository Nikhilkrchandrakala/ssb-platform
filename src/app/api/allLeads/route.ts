import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Lead, User } from "@/server/models";

interface LeadLike {
  email?: string;
  phoneNumber?: string;
  date?: string | Date;
  [key: string]: unknown;
}

/**
 * GET /api/allLeads
 * Merges raw Lead capture entries with `role: "lead"` User accounts, de-duplicated
 * by email/phone. Legacy had no auth on this endpoint (exposes PII across every
 * prospect); locked to admin/owner here since this is purely an admin dashboard
 * listing consumed by the not-yet-ported admin panel.
 * Ported from legacy Leads.js.
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const rawLeads = await Lead.find({}).sort({ date: -1, time: -1 }).lean();

    const userLeads = await User.find({ role: "lead" }).sort({ createdAt: -1 }).lean();

    const mappedUserLeads = userLeads.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      phoneNumber: u.phone || "N/A",
      date: u.createdAt || new Date(),
      time: u.createdAt ? new Date(u.createdAt).toLocaleTimeString() : "N/A",
      isRegisteredLead: true,
    }));

    const data: LeadLike[] = [...rawLeads, ...mappedUserLeads];
    // Sales module (salesimplementation.md Phase 6, stretch): a lead converted
    // via enrollStudent sorts ahead of any same-email duplicate (e.g. the
    // `role: "lead"` User enrollStudent itself just created) regardless of
    // recency, so the dedup pass below keeps the converted, badge-carrying
    // entry instead of silently shadowing it with a newer-but-unconverted one.
    data.sort((a, b) => {
      const aConverted = a.convertedAt ? 1 : 0;
      const bConverted = b.convertedAt ? 1 : 0;
      if (aConverted !== bConverted) return bConverted - aConverted;
      return new Date(String(b.date)).getTime() - new Date(String(a.date)).getTime();
    });

    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const uniqueData: LeadLike[] = [];

    for (const lead of data) {
      const email = (lead.email || "").toLowerCase().trim();
      const rawPhone = lead.phoneNumber || "";
      const phone = rawPhone.replace(/\D/g, "");

      let isDuplicate = false;

      if (email && email !== "n/a" && email !== "") {
        if (seenEmails.has(email)) {
          isDuplicate = true;
        }
      }

      if (phone && phone !== "" && phone !== "na") {
        const last10 = phone.length >= 10 ? phone.slice(-10) : phone;
        if (seenPhones.has(last10)) {
          isDuplicate = true;
        }
      }

      if (!isDuplicate) {
        if (email && email !== "n/a" && email !== "") {
          seenEmails.add(email);
        }
        if (phone && phone !== "" && phone !== "na") {
          const last10 = phone.length >= 10 ? phone.slice(-10) : phone;
          seenPhones.add(last10);
        }
        uniqueData.push(lead);
      }
    }

    return NextResponse.json(uniqueData);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to fetch leads" }, { status: 500 });
  }
}
