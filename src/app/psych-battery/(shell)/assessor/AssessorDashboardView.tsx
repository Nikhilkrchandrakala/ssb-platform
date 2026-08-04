"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/app/psych-battery/lib/api";
import { AssessmentSubmission, UserProfile } from "@/app/psych-battery/types";
import { usePsychUser } from "@/components/psych/PsychUserProvider";
import { Users, Filter, User as UserIcon, Bell, Check, Eye, FileCheck, GraduationCap, Clock3, CheckCircle2, ClipboardList } from "lucide-react";
import { cn } from "@/app/psych-battery/lib/utils";
import { assessorLabel } from "@/lib/assessorLabels";
import {
  PageHeader, StatTile, Badge, Avatar, SearchInput, IconButton, SegmentedControl,
  EmptyState, Card, GlassCard, Reveal, Skeleton, staggerDelay,
} from "@/app/psych-battery/components/ui/Primitives";

interface NotificationItem {
  id: string;
  recipientId: string;
  studentId: {
    id: string;
    name: string;
    email: string;
  };
  submissionId: {
    id: string;
    assessmentId: string;
    status: string;
  };
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const STATUS_TONE: Record<string, "success" | "warning" | "info" | "neutral"> = {
  COMPLETED: "success",
  REPORT_RELEASED: "success",
  MEETING_SCHEDULED: "warning",
  UPLOADED: "info",
};

const ROLE_BADGE: Record<string, string> = {
  Psych: "bg-purple-500/25 text-purple-200 border-purple-400/40",
  GTO: "bg-blue-500/25 text-blue-200 border-blue-400/40",
  IO: "bg-amber-500/25 text-amber-200 border-amber-400/40",
  TO: "bg-teal-500/25 text-teal-200 border-teal-400/40",
};

// Card accent per lifecycle status — top bar + avatar ring color, so the
// grid reads its state at a glance instead of needing to read the badge text.
const STATUS_ACCENT: Record<string, { bar: string; ring: string }> = {
  COMPLETED: { bar: "bg-emerald-400", ring: "ring-emerald-400/40" },
  REPORT_RELEASED: { bar: "bg-emerald-400", ring: "ring-emerald-400/40" },
  MEETING_SCHEDULED: { bar: "bg-amber-400", ring: "ring-amber-400/40" },
  UPLOADED: { bar: "bg-blue-400", ring: "ring-blue-400/40" },
};
const DEFAULT_ACCENT = { bar: "bg-app-border", ring: "ring-app-border" };

export default function AssessorDashboardView() {
  const { user } = usePsychUser();
  const [submissions, setSubmissions] = useState<(AssessmentSubmission & { student?: UserProfile })[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAssessorType, setActiveAssessorType] = useState<"Psych" | "GTO" | "TO" | "IO">("Psych");
  const [showNotifications, setShowNotifications] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user?.assessorType) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveAssessorType(user.assessorType);
    }
  }, [user]);

  const showRoleToggle = !user?.assessorType;

  const headerTitle =
    activeAssessorType === "Psych" ? `${assessorLabel("Psych")} Terminal` :
    activeAssessorType === "GTO" ? `${assessorLabel("GTO")} Assessment Desk` :
    activeAssessorType === "IO" ? `${assessorLabel("IO")} Terminal` :
    activeAssessorType === "TO" ? `${assessorLabel("TO")} Terminal` :
    "Assessor Terminal";

  const headerDesc =
    activeAssessorType === "Psych" ? "Monitor candidate timed batteries, TAT/WAT/SRT/SDT responses, and evaluate the 15 Officer Like Qualities (OLQs)." :
    activeAssessorType === "GTO" ? "Assess group dynamics, physical coordination, cooperation, and practical intellect of your allotted candidates." :
    activeAssessorType === "IO" ? "Conduct comprehensive personal interviews, grade verbal expression, and schedule/record feedback sessions." :
    activeAssessorType === "TO" ? "Evaluate practical technical problem solving, analytical ability, and technical comprehension." :
    "Monitor candidate progress, review psychological dossiers, and conduct professional evaluations.";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    Promise.all([api.submissions.list(), api.notifications.list()])
      .then(([subData, notifData]) => {
        if (cancelled) return;
        setSubmissions(subData);
        setNotifications(notifData);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to fetch assessor data:", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const pendingCount = submissions.filter((s) => s.status !== "COMPLETED" && s.status !== "REPORT_RELEASED").length;
  const completedCount = submissions.filter((s) => s.status === "COMPLETED" || s.status === "REPORT_RELEASED").length;

  const filteredSubmissions = search.trim()
    ? submissions.filter((s) => {
        const q = search.trim().toLowerCase();
        return (
          s.student?.name?.toLowerCase().includes(q) ||
          s.student?.email?.toLowerCase().includes(q) ||
          s.student?.chestNo?.toLowerCase?.().includes(q)
        );
      })
    : submissions;

  if (loading) return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-16 w-32" />
        <Skeleton className="h-16 w-32" />
        <Skeleton className="h-16 w-36" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Platform Suite / Candidates"
        title={headerTitle}
        description={headerDesc}
        actions={
          <>
            {showRoleToggle && (
              <SegmentedControl
                value={activeAssessorType}
                onChange={setActiveAssessorType}
                options={[
                  { value: "Psych", label: "Psych" },
                  { value: "GTO", label: "GTO" },
                  { value: "IO", label: "IO" },
                  { value: "TO", label: "TO" },
                ]}
              />
            )}

            <div className="relative shrink-0">
              <IconButton
                icon={Bell}
                active={showNotifications}
                onClick={() => {
                  const isOpening = !showNotifications;
                  setShowNotifications(isOpening);
                  if (isOpening && unreadCount > 0) {
                    api.notifications.markAllAsRead().then(() => {
                      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                    }).catch(console.error);
                  }
                }}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-app-bg">
                  {unreadCount}
                </span>
              )}

              {showNotifications && (
                <Card className="absolute top-full mt-2 right-0 w-80 shadow-2xl z-50 overflow-hidden py-0">
                  <div className="p-3.5 border-b border-app-border flex justify-between items-center">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-app-text-bright">Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-app-text-muted text-xs">No notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={cn("p-3.5 border-b border-app-border last:border-0 hover:bg-app-card transition-colors", !n.isRead && "bg-app-accent/12")}>
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h4 className={cn("text-[11px] font-bold", !n.isRead ? "text-app-text-bright" : "text-app-text-muted")}>{n.title}</h4>
                            {!n.isRead && (
                              <button onClick={() => handleMarkAsRead(n.id)} className="text-app-accent hover:text-app-accent-light shrink-0 cursor-pointer" title="Mark as read">
                                <Check size={13} />
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-app-text-muted leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-app-text-muted/60 mt-1.5 block">{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              )}
            </div>
          </>
        }
      />

      {/* Caseload stats */}
      <Reveal delay={0.05} className="flex flex-wrap gap-3">
        <StatTile label="Pending" value={pendingCount} tone="warning" icon={Clock3} />
        <StatTile label="Completed" value={completedCount} tone="success" icon={CheckCircle2} />
        <StatTile label="Total Assigned" value={submissions.length} icon={ClipboardList} />
      </Reveal>

      {/* Search & filter */}
      <Reveal delay={0.1} className="flex gap-3 items-center">
        <SearchInput placeholder="Search by name, email, or chest number" value={search} onChange={(e) => setSearch(e.target.value)} />
        <IconButton icon={Filter} title="Filters" />
      </Reveal>

      {/* Candidate grid */}
      {filteredSubmissions.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={search ? "No matching candidates" : "No dossiers detected"}
            description={search ? "Try a different name, email, or chest number." : "No candidates have been assigned to your evaluation queue yet."}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredSubmissions.map((sub, index) => {
            const isAwaiting = sub.status === "PENDING" && activeAssessorType !== "GTO" && activeAssessorType !== "IO";
            const accent = STATUS_ACCENT[sub.status] || DEFAULT_ACCENT;
            const courseLabel = (() => {
              const stage = sub.student?.clinicalStage || "";
              const parts = stage.split(",").map((s: string) => s.trim()).filter(Boolean);
              if (parts.length === 0) return "Full Course";
              return parts.map((part: string) => {
                switch (part) {
                  case "full_course": return "Full Course";
                  case "ssb_ppdt": return "Intro & PPDT";
                  case "psych": return "Psychology";
                  case "interview": return "Interview";
                  case "group_testing": return "GTO Tasks";
                  default: return part.toUpperCase();
                }
              }).join(", ");
            })();

            const roles: { key: string; assigned: unknown; label: string }[] = [
              { key: "Psych", assigned: sub.student?.assignedPsych, label: "Psych" },
              { key: "GTO", assigned: sub.student?.assignedGTO, label: "GTO" },
              { key: "IO", assigned: sub.student?.assignedIO, label: "IO" },
              { key: "TO", assigned: sub.student?.assignedTO, label: "TO" },
            ].filter((r) => r.assigned);

            return (
              <GlassCard key={sub.id} className="overflow-hidden flex flex-col">
                <Reveal delay={staggerDelay(index)} className="flex flex-col flex-1">
                <div className={cn("h-1", accent.bar)} />
                <div className="p-5 flex flex-col gap-4 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={sub.student?.profileImage}
                        alt={sub.student?.name || "Candidate"}
                        fallbackIcon={UserIcon}
                        size={48}
                        className={cn("ring-2", accent.ring)}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-app-text-bright truncate">{sub.student?.name || "Unknown Candidate"}</div>
                        <div className="text-[11px] text-app-text-muted truncate">{sub.student?.email || "N/A"}</div>
                      </div>
                    </div>
                    <Badge tone={STATUS_TONE[sub.status] || "neutral"} className="shrink-0">{sub.status.replace(/_/g, " ")}</Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-1 rounded-md bg-app-card border border-app-border text-[10px] font-bold text-app-text-muted">
                      Batch {sub.student?.batch || "--"}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-app-card border border-app-border text-[10px] font-bold text-app-text-muted">
                      Chest {sub.student?.chestNo || "--"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-500/25 border border-indigo-400/40 text-[10px] font-bold text-indigo-200">
                      <GraduationCap size={11} /> {courseLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {roles.length === 0 ? (
                      <span className="text-[11px] text-app-text-muted">No assessors allotted</span>
                    ) : (
                      roles.map((r) => (
                        <span key={r.key} className={cn("px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider", ROLE_BADGE[r.key])}>
                          {r.label}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-app-border">
                    {isAwaiting ? (
                      <span className="flex items-center justify-center py-2.5 text-[11px] font-bold text-app-text-muted/70" title="Candidate has not started their assessment yet">
                        Awaiting Action
                      </span>
                    ) : (
                      <Link
                        href={`/psych-battery/review/${sub.id}`}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all",
                          sub.status === "REPORT_RELEASED"
                            ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-app-on-accent"
                            : "bg-app-accent/25 text-app-accent-light hover:bg-app-accent hover:text-app-on-accent"
                        )}
                        title={sub.status === "REPORT_RELEASED" ? "View Finalized Report" : "Initialize Review"}
                      >
                        {sub.status === "REPORT_RELEASED" ? <FileCheck size={14} /> : <Eye size={14} />}
                        {sub.status === "REPORT_RELEASED" ? "View Report" : "Review Candidate"}
                      </Link>
                    )}
                  </div>
                </div>
                </Reveal>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
