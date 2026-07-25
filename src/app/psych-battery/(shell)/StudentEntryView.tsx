"use client";

// Ported from psych_battery/src/pages/StudentEntry.tsx.
//
// Architecture changes vs legacy:
// - Legacy split identity across a Firebase-y `user` and a separate Mongo
//   `profile` (both from AuthProvider). PsychUserProvider now hands down one
//   merged user document (from getCurrentUser()), so both collapse into `user`.
// - `mainSiteUrl` cross-origin redirects are gone — the main site's
//   ProfileDashboard is a route in this same Next app now, so every
//   `window.location.href = \`${mainSiteUrl}/...\`` becomes a same-origin
//   router.push().
// - No react-router — useNavigate() -> useRouter() from next/navigation.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePsychUser, type PsychUser } from "@/components/psych/PsychUserProvider";
import { api } from "@/app/psych-battery/lib/api";
import { Assessment, AssessmentSubmission } from "@/app/psych-battery/types";
import { Play, Timer, BookOpen, AlertTriangle } from "lucide-react";
import { Watermark } from "@/app/psych-battery/components/Watermark";
import { Card, Badge, GlassCard, Reveal, Button, staggerDelay } from "@/app/psych-battery/components/ui/Primitives";

// getCurrentUser() returns the full populated Mongo user document, but the
// PsychUser interface (shared by every psych-battery page) only declares the
// generic identity subset. Extend it locally with the extra fields this page
// needs rather than widening the shared type.
interface StudentUser extends PsychUser {
  batch?: string;
  clinicalStage?: string;
  assignedGTO?: unknown;
  assignedTO?: unknown;
  assignedPsych?: unknown;
  assignedIO?: unknown;
}

// Legacy's AssessmentSubmission type never declared piq1Status/piq2Status
// (they were only ever accessed via `any`-typed submission state) — extend
// locally so this page can stay strictly typed.
interface SubmissionWithPiqStatus extends AssessmentSubmission {
  piq1Status?: string;
  piq2Status?: string;
}

function extractAssessmentId(a: { id?: string; _id?: string } | string | undefined): string | undefined {
  if (!a) return undefined;
  return typeof a === "string" ? a : a.id || a._id;
}

export default function StudentEntryView() {
  const { user: rawUser } = usePsychUser();
  const user = rawUser as StudentUser | null;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<SubmissionWithPiqStatus | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<SubmissionWithPiqStatus[]>([]);

  const hasBatch = !!(user?.batch && user.batch.trim() !== "");
  const hasAssessor = !!(user?.assignedPsych || user?.assignedGTO || user?.assignedIO || user?.assignedTO);
  // Check PIQ across ALL submissions for the user — not just the matched one.
  // This handles the case where PIQs were uploaded to one submission (assessment A)
  // but the current active assessment is B (or assessmentId lookup returns a different sub).
  const hasPiq1 =
    allSubmissions.some(
      (s) =>
        s.piq1Status === "VERIFIED" ||
        s.piq1Status === "PROCESSING" ||
        (s.piqFiles && s.piqFiles.some((f) => f.includes("piq1")))
    ) ||
    submission?.piq1Status === "VERIFIED" ||
    submission?.piq1Status === "PROCESSING" ||
    !!submission?.piqFiles?.some((f) => f.includes("piq1"));
  const hasPiq2 =
    allSubmissions.some(
      (s) =>
        s.piq2Status === "VERIFIED" ||
        s.piq2Status === "PROCESSING" ||
        (s.piqFiles && s.piqFiles.some((f) => f.includes("piq2")))
    ) ||
    submission?.piq2Status === "VERIFIED" ||
    submission?.piq2Status === "PROCESSING" ||
    !!submission?.piqFiles?.some((f) => f.includes("piq2"));
  const hasBothPiqs = !!(hasPiq1 && hasPiq2);
  const isEligible = hasBatch && hasAssessor && hasBothPiqs;

  const [primaryAssessment, setPrimaryAssessment] = useState<Assessment | null>(null);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const userStages = user.clinicalStage ? user.clinicalStage.split(",").map((s) => s.trim().toLowerCase()) : [];
    const isFullOrPsych = userStages.includes("full_course") || userStages.includes("psych") || userStages.includes("psychology");
    if (!isFullOrPsych) {
      router.push("/ProfileDashboard?tab=psycheTest");
      return;
    }

    Promise.all([api.assessments.list(), api.submissions.list()])
      .then(([assessmentsList, submissionsList]: [Assessment[], SubmissionWithPiqStatus[]]) => {
        if (cancelled) return;

        const activeAssessments = assessmentsList.filter((a) => a.active);

        if (activeAssessments.length === 0) {
          // If no active assessments, bounce back to profile
          router.push("/ProfileDashboard?tab=psycheTest");
          return;
        }

        const primary = activeAssessments[0];
        setPrimaryAssessment(primary);

        // Calculate approx time (duration is stored in the assessment object, or derived)
        // Duration is in minutes (e.g. 60)
        setTotalTime(primary.duration ? primary.duration * 60 : 3600);

        const matchedSubmission = submissionsList.find((s) => {
          const assId = extractAssessmentId(s.assessmentId as string | { id?: string; _id?: string });
          return assId === primary.id || assId === primary._id;
        });
        setAllSubmissions(submissionsList);
        setSubmission(matchedSubmission || null);

        if (!matchedSubmission) {
          // Candidate hasn't started yet — nothing further to do, "Commence
          // Test" button below handles it.
        } else if (
          matchedSubmission.status === "PENDING_UPLOAD" ||
          matchedSubmission.status === "COMPLETED" ||
          matchedSubmission.status === "UPLOADED" ||
          matchedSubmission.status === "REPORT_RELEASED" ||
          matchedSubmission.status === "MEETING_SCHEDULED"
        ) {
          router.push("/ProfileDashboard?tab=psycheTest");
        }
        // else: IN_PROGRESS or ASSIGNED — stay on this page, candidate can resume.
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch evaluation data:", err);
        router.push("/ProfileDashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, router]);

  const handleStart = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request failed", err);
    }
    router.push(`/psych-battery/assessment/${primaryAssessment?._id || primaryAssessment?.id}?autoStart=true`);
  };

  const getWelcomeName = () => {
    const rawName = user?.name || user?.email || "Candidate";
    if (rawName.includes("@")) {
      return rawName.split("@")[0];
    }
    return rawName.split(" ")[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-app-bg text-app-text-main">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent"></div>
      </div>
    );
  }

  if (!primaryAssessment) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 space-y-10 sm:space-y-12 pb-20 pt-6 sm:pt-10 animate-fade-in">
      <Watermark user={user} isAdminPreview={user?.role === "admin" || user?.role === "assessor" || user?.role === "owner"} />
      <div className="space-y-3 sm:space-y-4">
        <button
          onClick={() => (window.location.href = "/ProfileDashboard")}
          className="text-[10px] font-bold text-app-text-muted hover:text-app-text-bright flex items-center gap-2 transition-colors uppercase tracking-[0.2em] cursor-pointer"
        >
          ← Back to Profile
        </button>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-app-text-bright leading-[1.05]">
          Welcome, {getWelcomeName()}
        </h1>
        <p className="text-base sm:text-lg text-app-text-muted leading-relaxed max-w-2xl">
          {primaryAssessment.description || "This assessment will evaluate various cognitive and psychological traits."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <GlassCard className="p-6 sm:p-8 flex flex-col items-center text-center gap-4">
          <Reveal delay={staggerDelay(0)} className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-400/40">
            <Timer className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-app-text-muted uppercase tracking-widest mb-1.5">Total Duration</h3>
            <p className="text-3xl sm:text-4xl font-black text-app-text-bright">
              {Math.round(totalTime / 60)}
              <span className="text-base text-app-text-muted ml-1.5">min</span>
            </p>
          </div>
          </Reveal>
        </GlassCard>

        <GlassCard className="p-6 sm:p-8 flex flex-col items-center text-center gap-4">
          <Reveal delay={staggerDelay(1)} className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-400/40">
            <BookOpen className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-app-text-muted uppercase tracking-widest mb-1.5">Format</h3>
            <p className="text-lg font-black text-app-text-bright uppercase tracking-wide">Multiple Modules</p>
          </div>
          </Reveal>
        </GlassCard>

        <GlassCard className="p-6 sm:p-8 flex flex-col items-center text-center gap-3">
          <Reveal delay={staggerDelay(2)} className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-400/40">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-app-text-muted uppercase tracking-widest mb-2">Instructions</h3>
            <ul className="text-xs sm:text-sm text-app-text-muted space-y-1 font-medium">
              <li>Do not refresh the page</li>
              <li>Ensure stable connection</li>
              <li>Test is strictly timed</li>
            </ul>
          </div>
          </Reveal>
        </GlassCard>
      </div>

      {!isEligible && (
        <Card className="p-6 max-w-xl mx-auto text-center space-y-2 border-red-400/40 bg-red-500/15">
          <AlertTriangle className="w-7 h-7 text-red-400 mx-auto" />
          <Badge tone="danger" className="mx-auto">Evaluation Start Blocked</Badge>
          <p className="text-xs text-app-text-muted pt-1">You cannot start this evaluation because your profile details are incomplete:</p>
          <ul className="text-xs text-app-text-muted list-disc list-inside text-left max-w-xs mx-auto">
            {!hasBatch && <li>A batch has not been assigned to your profile.</li>}
            {!hasAssessor && <li>An assessor has not been assigned to your profile.</li>}
            {!hasBothPiqs && <li>Both PIQ 1 (Initial) and PIQ 2 (Final) must be uploaded.</li>}
          </ul>
          <p className="text-[11px] text-red-400 font-semibold pt-1">
            Please contact Integrated SSB Virtuosos Admin to configure your evaluation details.
          </p>
        </Card>
      )}

      <div className="pt-4 sm:pt-6">
        <Button
          variant="primary"
          onClick={handleStart}
          disabled={!isEligible}
          className="w-full py-5 md:py-6 px-6 rounded-2xl text-lg md:text-2xl gap-3"
        >
          <Play className="fill-current w-6 h-6 md:w-8 md:h-8" />
          Commence Test
        </Button>
      </div>
    </div>
  );
}
