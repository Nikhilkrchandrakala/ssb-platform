import { NextRequest, NextResponse } from "next/server";
import { requireSiteUser } from "@/server/auth";
import { connectDB } from "@/server/db";
import { SoftSkillsSubmission, Slot } from "@/server/models";
import { extractYouTubeVideoId } from "@/lib/youtube";

/**
 * GET /api/student/softskills/submission?slotId=...
 * Returns the student's submission record for a given Soft Skills batch slot.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireSiteUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const slotId = searchParams.get("slotId");
    if (!slotId) {
      return NextResponse.json({ error: "slotId is required" }, { status: 400 });
    }

    await connectDB();

    let submission = await SoftSkillsSubmission.findOne({
      userId: user._id,
      slotId,
    });

    // If no record exists yet, return empty default state
    if (!submission) {
      return NextResponse.json({
        submission: {
          slotId,
          userId: user._id,
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
      });
    }

    return NextResponse.json({ submission });
  } catch (err) {
    console.error("[GET /api/student/softskills/submission] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student/softskills/submission
 * Submits or updates a YouTube video URL for Video 1 (Baseline) or Video 2 (Capstone).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireSiteUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { slotId, videoNumber, videoUrl } = body;

    if (!slotId || (videoNumber !== 1 && videoNumber !== 2) || !videoUrl) {
      return NextResponse.json(
        { error: "slotId, videoNumber (1 or 2), and videoUrl are required" },
        { status: 400 }
      );
    }

    const videoId = extractYouTubeVideoId(videoUrl);
    if (!videoId) {
      return NextResponse.json(
        {
          error:
            "Invalid YouTube URL. Please provide a valid YouTube watch, youtu.be, or unlisted video link.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return NextResponse.json({ error: "Batch slot not found" }, { status: 404 });
    }

    let submission = await SoftSkillsSubmission.findOne({
      userId: user._id,
      slotId,
    });

    if (!submission) {
      submission = new SoftSkillsSubmission({
        userId: user._id,
        slotId,
        status: "PENDING",
      });
    }

    // Video 2 requires mentor unlock
    if (videoNumber === 2 && !submission.video2Unlocked) {
      return NextResponse.json(
        {
          error:
            "Video 2 (Final Capstone Speech) is currently locked. Your mentor will unlock this submission towards the end of the course.",
        },
        { status: 403 }
      );
    }

    if (videoNumber === 1) {
      submission.video1Url = videoUrl.trim();
      submission.video1Id = videoId;
      submission.video1SubmittedAt = new Date();
    } else {
      submission.video2Url = videoUrl.trim();
      submission.video2Id = videoId;
      submission.video2SubmittedAt = new Date();
    }

    // Status management:
    // When BOTH videos are submitted and mentor hasn't completed feedback yet, status becomes REVIEW_PENDING
    const hasBothVideos = Boolean(submission.video1Url && submission.video2Url);
    if (hasBothVideos) {
      if (submission.status !== "COMPLETED") {
        submission.status = "REVIEW_PENDING";
      }
    } else {
      if (submission.status !== "COMPLETED") {
        submission.status = "PENDING";
      }
    }

    await submission.save();

    return NextResponse.json({
      success: true,
      message: `Video ${videoNumber} submitted successfully!`,
      submission,
    });
  } catch (err) {
    console.error("[POST /api/student/softskills/submission] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit video" },
      { status: 500 }
    );
  }
}
