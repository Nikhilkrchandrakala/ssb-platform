import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Slot } from "@/server/models";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(user, ["admin", "owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const {
      title,
      batchNo,
      startTime,
      endTime,
      maxStudents,
      price,
      isFullCourse,
      mode,
      location,
      programType,
      noLateAdmissions,
    } = await req.json();

    await connectDB();

    const isSoftSkills = programType === "soft_skills" || (title && title.toLowerCase().includes("soft skills"));

    const slot = new Slot({
      title,
      batchNo,
      startTime,
      endTime: endTime || (isSoftSkills ? "10:30 AM" : ""),
      maxStudents: maxStudents || (isSoftSkills ? 25 : 50),
      price: price !== undefined ? price : (isSoftSkills ? 5999 : 12499),
      isFullCourse: isFullCourse !== undefined ? isFullCourse : (isSoftSkills ? true : false),
      mode: mode === "offline" ? "offline" : "online",
      location: location || "",
      programType: isSoftSkills ? "soft_skills" : (programType || "ssb"),
      noLateAdmissions: noLateAdmissions !== undefined ? Boolean(noLateAdmissions) : (isSoftSkills ? true : false),
      createdBy: String(user._id),
    });

    await slot.save();

    return NextResponse.json(
      {
        message: "Slot created successfully",
        data: slot,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
