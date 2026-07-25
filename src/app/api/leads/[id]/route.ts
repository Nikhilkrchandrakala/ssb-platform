import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Lead } from "@/server/models";

/**
 * DELETE /api/leads/:id
 * Legacy had no auth on this endpoint; locked to admin/owner here since it
 * permanently deletes a captured lead record.
 * Ported from legacy Leads.js.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const lead = await Lead.findByIdAndDelete(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Lead deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete lead" }, { status: 500 });
  }
}
