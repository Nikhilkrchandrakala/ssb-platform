import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { Submission } from "@/server/models/Submission";
import { User } from "@/server/models/User";
import { requireUser, userId } from "../_lib/auth";

type MeetingRole = "psych" | "to" | "gto" | "io";

const ROLE_LABELS: Record<MeetingRole, string> = {
  psych: "Psychologist Feedback",
  to: "TO Aptitude",
  gto: "GTO Outdoor Case",
  io: "IO Interview",
};

interface FlatMeeting {
  id: string;
  _id: string;
  submissionId: string;
  meetingType: MeetingRole;
  meetingTypeLabel: string;
  meetingDate: string;
  meetingLink: string;
  completed: boolean;
  status: "Upcoming" | "Completed" | "Missed" | "Today";
  student: { id: string; _id: string; name: string; email: string; chestNo: string; batch: string; profileImage?: string };
  assessor: { id: string; _id: string; name: string; email: string } | null;
}

// GET /api/psych/meetings — flattens each submission's up-to-4 per-role
// meeting fields (psych/to/gto/io) into individual meeting rows, then
// filters/sorts/paginates. Ported from legacy GET /api/meetings. The
// BYPASS_AUTH offline-preview mock-data path from legacy is dropped along
// with the rest of the ?token= handoff/preview machinery it was coupled to.
export async function GET(req: NextRequest) {
  await connectDB();
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const sp = req.nextUrl.searchParams;

  try {
    const query: Record<string, unknown> = {
      $or: [
        { psychMeetingDate: { $ne: null } },
        { toMeetingDate: { $ne: null } },
        { gtoMeetingDate: { $ne: null } },
        { ioMeetingDate: { $ne: null } },
        { psychMeetingLink: { $nin: [null, ""] } },
        { toMeetingLink: { $nin: [null, ""] } },
        { gtoMeetingLink: { $nin: [null, ""] } },
        { ioMeetingLink: { $nin: [null, ""] } },
      ],
    };
    if (user.role === "student") {
      query.userId = userId(user);
    }

    const rawSubmissions = await Submission.find(query)
      .select("-piqFileData")
      .populate({
        path: "userId",
        select: "name email assignedGTO assignedTO assignedPsych assignedIO clinicalStage profileImage chestNo batch",
        populate: [
          { path: "assignedPsych", select: "name email" },
          { path: "assignedTO", select: "name email" },
          { path: "assignedGTO", select: "name email" },
          { path: "assignedIO", select: "name email" },
        ],
      })
      .populate("assessmentId", "title type");

    // If the logged-in user is an assessor, restrict them to their assigned
    // role's meetings only.
    let assessorTypeFilter = "";
    if (user.role === "assessor") {
      const loggedInUser = await User.findById(userId(user));
      assessorTypeFilter = (loggedInUser as unknown as { assessorType?: string } | null)?.assessorType || "";
    }

    const allMeetings: FlatMeeting[] = [];
    const roles: MeetingRole[] = ["psych", "to", "gto", "io"];

    for (const sub of rawSubmissions) {
      const subJSON = (sub.toJSON ? sub.toJSON() : sub) as Record<string, unknown>;
      const student = (subJSON.userId as Record<string, unknown>) || { name: "Candidate", email: "" };
      if (!student) continue;

      for (const role of roles) {
        let dateVal = subJSON[`${role}MeetingDate`] as string | null | undefined;
        const linkVal = (subJSON[`${role}MeetingLink`] as string) || "";
        if (!dateVal && !linkVal) continue;

        // If a meeting link was set without a specific date, provide a fallback date
        // so the frontend date parsing and sorting do not fail with Invalid Date.
        if (!dateVal) {
          dateVal = (subJSON.updatedAt as string) || (subJSON.startedAt as string) || new Date().toISOString();
        }

        let assessor: Record<string, unknown> | null = null;
        if (role === "psych") assessor = student.assignedPsych as Record<string, unknown> | null;
        else if (role === "to") assessor = student.assignedTO as Record<string, unknown> | null;
        else if (role === "gto") assessor = student.assignedGTO as Record<string, unknown> | null;
        else if (role === "io") assessor = student.assignedIO as Record<string, unknown> | null;

        // If the logged-in user is an assessor, include the meeting if either the role matches
        // their assessorType OR if they are specifically assigned as the assessor for this role.
        if (user.role === "assessor") {
          const isAssignedToThisRole = assessor && String(assessor._id || assessor.id || "") === String(userId(user));
          if (assessorTypeFilter && role !== assessorTypeFilter.toLowerCase() && !isAssignedToThisRole) {
            continue;
          }
        }

        const completedVal = (subJSON[`${role}MeetingCompleted`] as boolean) || false;
        const meetingDate = new Date(dateVal);
        const now = new Date();

        let status: FlatMeeting["status"] = "Upcoming";
        if (completedVal) status = "Completed";
        else if (meetingDate < now) status = "Missed";

        const todayStr = now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
        const meetingDateStr = meetingDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
        if (meetingDateStr === todayStr) status = "Today";

        const subId = String(subJSON._id || subJSON.id);
        allMeetings.push({
          id: `${subId}_${role}`,
          _id: `${subId}_${role}`,
          submissionId: subId,
          meetingType: role,
          meetingTypeLabel: ROLE_LABELS[role],
          meetingDate: dateVal,
          meetingLink: linkVal,
          completed: completedVal,
          status,
          student: {
            id: String(student._id || student.id || ""),
            _id: String(student._id || student.id || ""),
            name: (student.name as string) || "Candidate",
            email: (student.email as string) || "",
            chestNo: (student.chestNo as string) || "--",
            batch: (student.batch as string) || "--",
            profileImage: student.profileImage as string | undefined,
          },
          assessor: assessor
            ? {
                id: String(assessor._id || assessor.id || ""),
                _id: String(assessor._id || assessor.id || ""),
                name: (assessor.name as string) || "Assessor",
                email: (assessor.email as string) || "",
              }
            : null,
        });
      }
    }

    let filteredMeetings = allMeetings;

    const search = sp.get("search");
    if (search) {
      const searchVal = search.toLowerCase();
      filteredMeetings = filteredMeetings.filter(
        (m) =>
          m.student.name.toLowerCase().includes(searchVal) ||
          m.student.chestNo.toLowerCase().includes(searchVal) ||
          m.student.batch.toLowerCase().includes(searchVal) ||
          m.student.email.toLowerCase().includes(searchVal) ||
          (m.assessor && m.assessor.name.toLowerCase().includes(searchVal)) ||
          m.meetingTypeLabel.toLowerCase().includes(searchVal) ||
          m.id.toLowerCase().includes(searchVal)
      );
    }

    const statusParam = sp.get("status");
    if (statusParam) {
      if (statusParam === "Today") {
        const todayStr = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
        filteredMeetings = filteredMeetings.filter(
          (m) => new Date(m.meetingDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) === todayStr
        );
      } else {
        filteredMeetings = filteredMeetings.filter((m) => m.status === statusParam);
      }
    }

    const meetingType = sp.get("meetingType");
    if (meetingType) {
      filteredMeetings = filteredMeetings.filter((m) => m.meetingType === meetingType);
    }

    const batch = sp.get("batch");
    if (batch) {
      filteredMeetings = filteredMeetings.filter((m) => m.student.batch === batch);
    }

    const assessorFilter = sp.get("assessor");
    if (assessorFilter) {
      filteredMeetings = filteredMeetings.filter((m) => m.assessor && m.assessor.id === assessorFilter);
    }

    const startDate = sp.get("startDate");
    const endDate = sp.get("endDate");
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredMeetings = filteredMeetings.filter((m) => {
        const d = new Date(m.meetingDate);
        return d >= start && d <= end;
      });
    }

    const todayStr = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
    const stats = {
      total: allMeetings.length,
      today: allMeetings.filter((m) => new Date(m.meetingDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) === todayStr)
        .length,
      upcoming: allMeetings.filter((m) => m.status === "Upcoming").length,
      completed: allMeetings.filter((m) => m.status === "Completed").length,
      missed: allMeetings.filter((m) => m.status === "Missed").length,
    };

    const sortBy = sp.get("sortBy") || "meetingDate";
    const sortOrder = sp.get("sortOrder") || "desc";

    filteredMeetings.sort((a, b) => {
      let valA: unknown;
      let valB: unknown;

      if (sortBy === "candidateName") {
        valA = a.student.name;
        valB = b.student.name;
      } else if (sortBy === "chestNo") {
        valA = parseInt(a.student.chestNo) || 0;
        valB = parseInt(b.student.chestNo) || 0;
      } else if (sortBy === "batch") {
        valA = a.student.batch;
        valB = b.student.batch;
      } else if (sortBy === "assessorName") {
        valA = a.assessor?.name || "";
        valB = b.assessor?.name || "";
      } else {
        valA = (a as unknown as Record<string, unknown>)[sortBy];
        valB = (b as unknown as Record<string, unknown>)[sortBy];
      }

      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      const compA = valA as string | number;
      const compB = valB as string | number;
      if (compA < compB) return sortOrder === "asc" ? -1 : 1;
      if (compA > compB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const page = parseInt(sp.get("page") || "1");
    const limit = parseInt(sp.get("limit") || "25");
    const startIndex = (page - 1) * limit;
    const paginatedMeetings = filteredMeetings.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      meetings: paginatedMeetings,
      totalCount: filteredMeetings.length,
      stats,
      page,
      limit,
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
