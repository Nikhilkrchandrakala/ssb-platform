import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { NumberMonitor } from "@/server/models";

/**
 * PUT /api/updateNumberMonitor/:id
 * Legacy only required checkAuth (any logged-in user); locked to admin/owner
 * here — same reasoning as addNumberMonitor.
 * Ported from legacy NumberMonitor.js.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!hasRole(user, ["admin", "owner"])) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const body = await req.json();

    const data = await NumberMonitor.findOneAndUpdate(
      { _id: id },
      {
        officerSelection: body.officerSelection,
        yearService: body.yearService,
        facultyExperience: body.facultyExperience,
        totalFaculty: body.totalFaculty,
      },
      { new: true }
    );

    return NextResponse.json({ message: "Successfully updated the entry", data });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to update entry" }, { status: 500 });
  }
}
