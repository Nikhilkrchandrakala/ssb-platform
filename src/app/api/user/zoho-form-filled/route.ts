import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { User } from "@/server/models";

/**
 * POST /api/user/zoho-form-filled
 * Called after successful Zoho CRM lead form submission. Sets zohoFormFilled = true
 * on the user's account so future downloads are allowed. Self-scoped.
 * Ported from legacy UserProfile.js.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const userId = currentUser._id || currentUser.id;
    const {
      dob,
      ssbAspirant,
      servingCandidate,
      vtxHeard,
      youtubeSubscribed,
      podcastSubscribed,
      ssbExperience,
      nextSsbDate,
      ssbBoards,
      ssbEntries,
      city,
      state,
    } = await req.json();

    const user = await User.findByIdAndUpdate(
      userId,
      {
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
      },
      { new: true }
    );
    if (!user) {
      return NextResponse.json({ status: "error", message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ status: "ok", message: "Zoho form status updated", zohoFormFilled: true });
  } catch (error) {
    return NextResponse.json({ status: "error", message: error instanceof Error ? error.message : "Failed to update Zoho form status" }, { status: 500 });
  }
}
