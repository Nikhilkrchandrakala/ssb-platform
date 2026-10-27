import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { hasAdminPermission } from "@/server/adminAccess";
import { connectDB } from "@/server/db";
import { Slot, User, SoftSkillsSubmission } from "@/server/models";

/**
 * GET /api/admin/softskills/candidates?slotId=...
 * Lists all enrolled candidates in a Soft Skills batch with their video submissions and status.
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminPermission(currentUser, "softskills_evaluation")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const slotId = searchParams.get("slotId");
    if (!slotId) {
      return NextResponse.json({ error: "slotId is required" }, { status: 400 });
    }

    await connectDB();

    const slot = await Slot.findById(slotId).lean();
    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    const bookedIds = (slot.bookedStudents || []) as any[];

    // Fetch student profile details
    const students = await User.find({
      _id: { $in: bookedIds },
    })
      .select("name email phone chestNo profileImage createdAt")
      .lean();

    // Fetch existing submissions for this batch
    const submissions = await SoftSkillsSubmission.find({
      slotId,
      userId: { $in: bookedIds },
    })
      .populate("reviewedBy", "name email")
      .lean();

    const submissionMap = new Map<string, any>();
    for (const sub of submissions) {
      submissionMap.set(String(sub.userId), sub);
    }

    // Merge student info with submission info
    const candidates = students.map((student) => {
      const sub = submissionMap.get(String(student._id));

      return {
        _id: student._id,
        name: student.name || "Unnamed Student",
        email: student.email,
        phone: student.phone || "—",
        chestNo: student.chestNo || "—",
        profileImage: student.profileImage || null,
        submission: sub || {
          _id: null,
          slotId,
          userId: student._id,
          video1Url: "",
          video1Id: "",
          video1SubmittedAt: null,
          video2Unlocked: false,
          video2Url: "",
          video2Id: "",
          video2SubmittedAt: null,
          status: "PENDING",
          feedback: "",
          reviewedAt: null,
        },
      };
    });

    return NextResponse.json({
      slot: {
        _id: slot._id,
        title: slot.title,
        batchNo: slot.batchNo,
        startTime: slot.startTime,
        endTime: slot.endTime,
        bookedCount: bookedIds.length,
      },
      candidates,
    });
  } catch (err) {
    console.error("[GET /api/admin/softskills/candidates] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load candidates" },
      { status: 500 }
    );
  }
}
