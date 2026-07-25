import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { NumberMonitor } from "@/server/models";

/**
 * POST /api/addNumberMonitor
 * Legacy only required checkAuth (any logged-in user could edit this
 * landing-page stat widget); locked to admin/owner here since it's site-wide
 * content configuration.
 * Ported from legacy NumberMonitor.js.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!hasRole(user, ["admin", "owner"])) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const newEntry = new NumberMonitor({
      officerSelection: body.officerSelection,
      yearService: body.yearService,
      facultyExperience: body.facultyExperience,
      totalFaculty: body.totalFaculty,
    });

    await newEntry.save();
    const data = await NumberMonitor.find({});
    return NextResponse.json({ message: "Successfully created a new entry", data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to create entry" }, { status: 500 });
  }
}
