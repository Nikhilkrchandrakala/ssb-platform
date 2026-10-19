"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { api } from "@/app/psych-battery/lib/api";
import { AssessmentSubmission, UserProfile } from "@/app/psych-battery/types";
import { usePsychUser } from "@/components/psych/PsychUserProvider";
import { Users, User as UserIcon, Bell, Check, Eye, FileCheck, GraduationCap, Clock3, CheckCircle2, ClipboardList, RotateCcw, X, ChevronDown, Search } from "lucide-react";
import { cn } from "@/app/psych-battery/lib/utils";
import { assessorLabel } from "@/lib/assessorLabels";
import {
  PageHeader, StatTile, Badge, Avatar, IconButton, SegmentedControl,
  EmptyState, Card, GlassCard, Reveal, Skeleton, staggerDelay, TableShell, Th, Td, Tr,
} from "@/app/psych-battery/components/ui/Primitives";
import SearchCombobox from "@/app/psych-battery/components/ui/SearchCombobox";
import { latestDistinctValues } from "@/lib/latestValues";

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
  REVIEW_PENDING: "warning",
  UNDER_REVIEW: "warning",
  PENDING: "neutral",
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
  REVIEW_PENDING: { bar: "bg-amber-400", ring: "ring-amber-400/40" },
  UNDER_REVIEW: { bar: "bg-amber-400", ring: "ring-amber-400/40" },
};
const DEFAULT_ACCENT = { bar: "bg-app-border", ring: "ring-app-border" };

const FILTERS_STORAGE_KEY = "ssb_assessor_dashboard_filters";

function formatBatchLabel(batch: string) {
  const trimmed = batch.trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase().startsWith("batch")) return trimmed;
  return `Batch ${trimmed}`;
}

export default function AssessorDashboardView() {
  const { user } = usePsychUser();
  const [submissions, setSubmissions] = useState<(AssessmentSubmission & { student?: UserProfile; isOffline?: boolean })[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAssessorType, setActiveAssessorType] = useState<"Psych" | "GTO" | "TO" | "IO">("Psych");
  const [showNotifications, setShowNotifications] = useState(false);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [isCustomBatch, setIsCustomBatch] = useState(false);
  const customBatchInputRef = useRef<HTMLInputElement>(null);
  const [chestNoFilter, setChestNoFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");
  // Fix #5: default to grid view — on mobile the table requires horizontal
  // scrolling with no visual affordance; grid is always more usable on small
  // screens. The user can still switch to list if they prefer.
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (user?.assessorType) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveAssessorType(user.assessorType);
    }
  }, [user]);

  const showRoleToggle = !user?.assessorType;

  // Restore saved filters from URL query parameters (primary) or sessionStorage (fallback) on mount
  useEffect(() => {
    try {
      let restoredSearch = "";
      let restoredBatch = "";
      let restoredIsCustom = false;
      let restoredChest = "";
      let restoredStatus: "ALL" | "PENDING" | "COMPLETED" = "ALL";
      let restoredView: "grid" | "list" = "grid";
      let restoredRole: "Psych" | "GTO" | "IO" | "TO" | null = null;
      let hasUrlFilters = false;

      // 1. Check URL query parameters
      if (typeof window !== "undefined" && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        if (params.has("search")) {
          restoredSearch = params.get("search") || "";
          hasUrlFilters = true;
        }
        if (params.has("batch")) {
          restoredBatch = params.get("batch") || "";
          hasUrlFilters = true;
        }
        if (params.get("customBatch") === "1") {
          restoredIsCustom = true;
          hasUrlFilters = true;
        }
        if (params.has("chest")) {
          restoredChest = params.get("chest") || "";
          hasUrlFilters = true;
        }
        const s = params.get("status");
        if (s === "ALL" || s === "PENDING" || s === "COMPLETED") {
          restoredStatus = s;
          hasUrlFilters = true;
        }
        const v = params.get("view");
        if (v === "grid" || v === "list") {
          restoredView = v;
          hasUrlFilters = true;
        }
      }

      // 2. Fall back to sessionStorage if URL has no filter params
      if (!hasUrlFilters) {
        const saved = sessionStorage.getItem(FILTERS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.search === "string") restoredSearch = parsed.search;
          if (typeof parsed.batchFilter === "string") restoredBatch = parsed.batchFilter;
          if (typeof parsed.isCustomBatch === "boolean") restoredIsCustom = parsed.isCustomBatch;
          if (typeof parsed.chestNoFilter === "string") restoredChest = parsed.chestNoFilter;
          if (parsed.statusFilter === "ALL" || parsed.statusFilter === "PENDING" || parsed.statusFilter === "COMPLETED") {
            restoredStatus = parsed.statusFilter;
          }
          if (parsed.viewMode === "grid" || parsed.viewMode === "list") {
            restoredView = parsed.viewMode;
          }
          if (showRoleToggle && (parsed.activeAssessorType === "Psych" || parsed.activeAssessorType === "GTO" || parsed.activeAssessorType === "IO" || parsed.activeAssessorType === "TO")) {
            restoredRole = parsed.activeAssessorType;
          }
        }
      }

      if (restoredSearch) setSearch(restoredSearch);
      if (restoredBatch) setBatchFilter(restoredBatch);
      if (restoredIsCustom) setIsCustomBatch(restoredIsCustom);
      if (restoredChest) setChestNoFilter(restoredChest);
      if (restoredStatus !== "ALL") setStatusFilter(restoredStatus);
      if (restoredView !== "grid") setViewMode(restoredView);
      if (restoredRole) setActiveAssessorType(restoredRole);
    } catch {}

    // Mark hydration complete so subsequent state renders can safely persist
    setIsHydrated(true);
  }, [showRoleToggle]);

  // Persist filter changes into sessionStorage and URL query parameters once hydrated
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const stateToSave = {
        search,
        batchFilter,
        isCustomBatch,
        chestNoFilter,
        statusFilter,
        viewMode,
        activeAssessorType,
      };
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(stateToSave));

      // Synchronize to URL search parameters with replaceState (no router refresh or flicker)
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (batchFilter.trim()) params.set("batch", batchFilter.trim());
      if (isCustomBatch) params.set("customBatch", "1");
      if (chestNoFilter.trim()) params.set("chest", chestNoFilter.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (viewMode !== "grid") params.set("view", viewMode);

      const qs = params.toString();
      const targetUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, "", targetUrl);
    } catch {}
  }, [isHydrated, search, batchFilter, isCustomBatch, chestNoFilter, statusFilter, viewMode, activeAssessorType]);

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

  const isReviewCompleted = (
    sub: AssessmentSubmission & { psychStatus?: string; gtoStatus?: string; ioStatus?: string; toStatus?: string }
  ) => {
    if (sub.status === "COMPLETED" || sub.status === "REPORT_RELEASED") return true;
    if (activeAssessorType === "Psych" && sub.psychStatus === "COMPLETED") return true;
    if (activeAssessorType === "GTO" && sub.gtoStatus === "COMPLETED") return true;
    if (activeAssessorType === "IO" && sub.ioStatus === "COMPLETED") return true;
    if (activeAssessorType === "TO" && sub.toStatus === "COMPLETED") return true;
    return false;
  };

  const bellRef = useRef<HTMLButtonElement>(null);

  // Close on outside click / touch
  useEffect(() => {
    if (!showNotifications) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (bellRef.current?.contains(target)) return;
      if ((target as Element).closest("[data-notif-panel]")) return;
      setShowNotifications(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const completedCount = useMemo(
    () => submissions.filter((s) => isReviewCompleted(s)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submissions, activeAssessorType]
  );
  const pendingCount = submissions.length - completedCount;

  const filteredSubmissions = submissions.filter((s) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const matches =
        s.student?.name?.toLowerCase().includes(q) ||
        s.student?.email?.toLowerCase().includes(q) ||
        s.student?.chestNo?.toLowerCase?.().includes(q);
      if (!matches) return false;
    }
    if (batchFilter.trim()) {
      const studentBatch = (s.student?.batch || "").trim().toLowerCase();
      const filter = batchFilter.trim().toLowerCase();
      if (isCustomBatch) {
        if (!studentBatch.includes(filter)) return false;
      } else {
        const normStudent = studentBatch.replace(/^batch\s*/, "");
        const normFilter = filter.replace(/^batch\s*/, "");
        if (normStudent !== normFilter && studentBatch !== filter) return false;
      }
    }
    if (chestNoFilter.trim() && !(s.student?.chestNo || "").toLowerCase().includes(chestNoFilter.trim().toLowerCase())) return false;
    if (statusFilter === "PENDING" && isReviewCompleted(s)) return false;
    if (statusFilter === "COMPLETED" && !isReviewCompleted(s)) return false;
    return true;
  });
  const hasActiveFilter = Boolean(search.trim() || batchFilter.trim() || chestNoFilter.trim() || statusFilter !== "ALL" || isCustomBatch);

  const resetFilters = () => {
    setSearch("");
    setBatchFilter("");
    setChestNoFilter("");
    setStatusFilter("ALL");
    setIsCustomBatch(false);
    try {
      sessionStorage.removeItem(FILTERS_STORAGE_KEY);
      window.history.replaceState(null, "", window.location.pathname);
    } catch {}
  };

  const candidateNameOptions = useMemo(
    () => latestDistinctValues(submissions, (s) => s.student?.name, (s) => s.student?.createdAt as string | undefined),
    [submissions]
  );
  const batchOptions = useMemo(
    () => latestDistinctValues(submissions, (s) => s.student?.batch, (s) => s.student?.createdAt as string | undefined),
    [submissions]
  );
  const sortedBatchOptions = useMemo(() => {
    return [...batchOptions].sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [batchOptions]);
  const chestNoOptions = useMemo(
    () => latestDistinctValues(submissions, (s) => s.student?.chestNo, (s) => s.student?.createdAt as string | undefined),
    [submissions]
  );

  if (loading) return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
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
                ref={bellRef}
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
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-app-bg pointer-events-none">
                  {unreadCount}
                </span>
              )}
            </div>

            {/* ── Notification panel ──────────────────────────────────────────
                Two layouts driven purely by CSS — no JS measurement needed:

                MOBILE  (< sm, i.e. < 640 px)
                  A full-screen backdrop + bottom sheet that slides up from the
                  bottom of the viewport. The sheet takes up to 70 vh so there
                  is always space to tap the backdrop above to dismiss.
                  Safe-area-inset-bottom padding ensures content is never hidden
                  behind the iPhone home bar.

                DESKTOP (≥ sm)
                  A dropdown anchored to the right edge of the bell button via
                  `absolute right-0 top-full`. The parent wrapper is
                  `relative` and sits outside any overflow-hidden ancestor,
                  so nothing clips the panel.
            ─────────────────────────────────────────────────────────────── */}
            {showNotifications && typeof document !== "undefined" && createPortal(
              <>
                {/* ── Mobile: full-screen backdrop + bottom sheet ── */}
                <div className="sm:hidden fixed inset-0 z-[9998] flex flex-col justify-end">
                  {/* Backdrop — tap to close */}
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowNotifications(false)}
                  />
                  {/* Sheet */}
                  <div
                    data-notif-panel
                    className="relative z-10 w-full bg-app-sidebar border-t border-app-border rounded-t-3xl flex flex-col shadow-2xl"
                    style={{ maxHeight: "70dvh" }}
                  >
                    {/* Drag handle hint */}
                    <div className="flex justify-center pt-3 pb-1 shrink-0">
                      <div className="w-10 h-1 rounded-full bg-app-border" />
                    </div>
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-app-border shrink-0">
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-app-text-bright">Notifications</h3>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1.5 rounded-lg text-app-text-muted hover:text-app-text-bright hover:bg-white/5 transition-colors cursor-pointer"
                        aria-label="Close notifications"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {/* List */}
                    <div
                      className="overflow-y-auto custom-scrollbar flex-1"
                      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
                    >
                      {notifications.length === 0 ? (
                        <div className="py-12 text-center text-app-text-muted text-sm">No notifications</div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={cn(
                              "px-5 py-4 border-b border-app-border last:border-0 hover:bg-app-card transition-colors",
                              !n.isRead && "bg-app-accent/10"
                            )}
                          >
                            <div className="flex justify-between items-start gap-3 mb-1">
                              <h4 className={cn("text-xs font-bold leading-snug", !n.isRead ? "text-app-text-bright" : "text-app-text-muted")}>
                                {n.title}
                              </h4>
                              {!n.isRead && (
                                <button onClick={() => handleMarkAsRead(n.id)} className="shrink-0 text-app-accent hover:text-app-accent-light cursor-pointer" title="Mark as read">
                                  <Check size={14} />
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-app-text-muted leading-relaxed">{n.message}</p>
                            <span className="text-[11px] text-app-text-muted/60 mt-2 block">{new Date(n.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Desktop: dropdown anchored under the bell ── */}
                <div
                  data-notif-panel
                  className="hidden sm:flex fixed z-[9998] flex-col bg-app-sidebar border border-app-border rounded-2xl shadow-2xl overflow-hidden"
                  style={{
                    width: 320,
                    maxHeight: "min(480px, 70dvh)",
                    // Position is set via inline style using the bell button ref
                    top: bellRef.current ? bellRef.current.getBoundingClientRect().bottom + 8 : 64,
                    right: bellRef.current
                      ? Math.max(12, window.innerWidth - bellRef.current.getBoundingClientRect().right)
                      : 16,
                  }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-app-border shrink-0">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-app-text-bright">Notifications</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded-lg text-app-text-muted hover:text-app-text-bright hover:bg-white/5 transition-colors cursor-pointer"
                      aria-label="Close notifications"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="overflow-y-auto custom-scrollbar flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-app-text-muted text-xs">No notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={cn(
                            "px-4 py-3.5 border-b border-app-border last:border-0 hover:bg-app-card transition-colors",
                            !n.isRead && "bg-app-accent/10"
                          )}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h4 className={cn("text-[11px] font-bold leading-snug", !n.isRead ? "text-app-text-bright" : "text-app-text-muted")}>
                              {n.title}
                            </h4>
                            {!n.isRead && (
                              <button onClick={() => handleMarkAsRead(n.id)} className="shrink-0 text-app-accent hover:text-app-accent-light cursor-pointer" title="Mark as read">
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
                </div>
              </>,
              document.body
            )}
          </>
        }
      />

      {/* Caseload stats —
          On mobile (< sm): tiles stack in a 1×3 column, each full-width,
          icon on the left, number+label on the right — no squeezing.
          On sm+: tiles sit side-by-side in a row and auto-size to content. */}
      <Reveal delay={0.05} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile
          label="Review Pending"
          value={pendingCount}
          tone="warning"
          icon={Clock3}
          onClick={() => setStatusFilter((prev) => (prev === "PENDING" ? "ALL" : "PENDING"))}
          active={statusFilter === "PENDING"}
        />
        <StatTile
          label="Review Completed"
          value={completedCount}
          tone="success"
          icon={CheckCircle2}
          onClick={() => setStatusFilter((prev) => (prev === "COMPLETED" ? "ALL" : "COMPLETED"))}
          active={statusFilter === "COMPLETED"}
        />
        <StatTile
          label="Total Assigned"
          value={submissions.length}
          icon={ClipboardList}
          onClick={() => setStatusFilter("ALL")}
          active={statusFilter === "ALL"}
        />
      </Reveal>

      {/* Search & filter */}
      <Reveal delay={0.1} className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <SearchCombobox placeholder="Search by name, email, or chest number" value={search} onChange={setSearch} options={candidateNameOptions} />

          {/* Batch Dropdown with Custom option */}
          {!isCustomBatch ? (
            <div className="relative sm:w-[200px] flex-none">
              <select
                aria-label="Filter by batch number"
                value={batchFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__custom__") {
                    setIsCustomBatch(true);
                    setBatchFilter("");
                    setTimeout(() => customBatchInputRef.current?.focus(), 50);
                  } else {
                    setBatchFilter(val);
                  }
                }}
                className={cn(
                  "w-full bg-app-card border border-app-border rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-medium text-app-text-bright cursor-pointer",
                  "focus:outline-none focus:border-app-accent/50 focus:ring-2 focus:ring-app-accent/15 transition-all appearance-none",
                  batchFilter && "border-app-accent/40 text-app-accent-light font-semibold"
                )}
                style={{ colorScheme: "dark" }}
              >
                <option value="" className="bg-[#18181b] text-app-text-bright">
                  All Batches
                </option>
                {/* Ensure selected batch is always present even while submissions are loading */}
                {batchFilter && !sortedBatchOptions.includes(batchFilter) && (
                  <option value={batchFilter} className="bg-[#18181b] text-app-text-bright">
                    {formatBatchLabel(batchFilter)}
                  </option>
                )}
                {sortedBatchOptions.map((b) => (
                  <option key={b} value={b} className="bg-[#18181b] text-app-text-bright">
                    {formatBatchLabel(b)}
                  </option>
                ))}
                <option value="__custom__" className="bg-[#18181b] text-app-accent-light font-bold">
                  + Custom Batch...
                </option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted pointer-events-none"
              />
            </div>
          ) : (
            <div className="relative sm:w-[220px] flex-none">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted pointer-events-none"
              />
              <input
                ref={customBatchInputRef}
                type="text"
                autoFocus
                placeholder="Enter custom batch..."
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsCustomBatch(false);
                    setBatchFilter("");
                  }
                }}
                className="w-full bg-app-card border border-app-accent/50 rounded-xl py-2.5 pl-8 pr-14 text-xs font-medium text-app-text-bright placeholder-app-text-muted focus:outline-none focus:ring-2 focus:ring-app-accent/20 transition-all"
              />
              <button
                type="button"
                onClick={() => {
                  setIsCustomBatch(false);
                  setBatchFilter("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md text-[10px] font-bold text-app-accent-light hover:text-white bg-app-accent/15 hover:bg-app-accent/25 border border-app-accent/30 transition-all cursor-pointer"
                title="Switch back to batch dropdown"
              >
                List
              </button>
            </div>
          )}

          <SearchCombobox placeholder="Filter by chest no" value={chestNoFilter} onChange={setChestNoFilter} options={chestNoOptions} containerClassName="sm:max-w-[200px] flex-none" />
        </div>
        {/* Fix #4: split into two rows on mobile so the long status labels and the
            grid/list toggle don't compete for the same narrow line. On sm+ screens
            the original justify-between single row is preserved.
            The SegmentedControl status options use abbreviated labels on mobile
            (<span className="sm:hidden">) and full labels on larger screens
            (<span className="hidden sm:inline">) to stay legible at any width. */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-app-text-muted">Status:</span>
            <SegmentedControl
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                {
                  value: "ALL",
                  label: `All (${submissions.length})`,
                },
                {
                  value: "PENDING",
                  label: `Pending (${pendingCount})`,
                },
                {
                  value: "COMPLETED",
                  label: `Done (${completedCount})`,
                },
              ]}
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <SegmentedControl
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: "grid", label: "Grid" },
                { value: "list", label: "List" },
              ]}
            />
            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-app-text-muted hover:text-app-text-bright hover:bg-app-card border border-transparent hover:border-app-border transition-all cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </Reveal>

      {/* Candidate grid / list */}
      {filteredSubmissions.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={hasActiveFilter ? "No matching candidates" : "No dossiers detected"}
            description={hasActiveFilter ? "Try adjusting your search query, status, batch, or chest filters." : "No candidates have been assigned to your evaluation queue yet."}
          />
          {hasActiveFilter && (
            <div className="flex justify-center pb-6">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-app-accent/15 border border-app-accent/30 text-app-accent-light text-xs font-bold hover:bg-app-accent/25 transition-all cursor-pointer"
              >
                <RotateCcw size={13} />
                Clear all filters
              </button>
            </div>
          )}
        </Card>
      ) : viewMode === "list" ? (
        <TableShell minWidth={900}>
          <thead>
            <tr>
              <Th>Candidate</Th>
              <Th>Batch No</Th>
              <Th>Chest No</Th>
              <Th>Course</Th>
              <Th>Assessors</Th>
              <Th align="center">Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.map((sub) => {
              // Offline candidates never "start" a test — there's no PIQ/timed-test
              // step to wait on — so a PENDING offline submission is still
              // reviewable immediately, unlike an online one.
              const isAwaiting = sub.status === "PENDING" && activeAssessorType !== "GTO" && activeAssessorType !== "IO" && !sub.isOffline;
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
                <Tr key={sub.id}>
                  <Td>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={sub.student?.profileImage} alt={sub.student?.name || "Candidate"} fallbackIcon={UserIcon} size={32} />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-app-text-bright truncate">{sub.student?.name || "Unknown Candidate"}</div>
                        <div className="text-[11px] text-app-text-muted truncate">{sub.student?.email || "N/A"}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="px-1.5 py-0.5 rounded bg-app-card border border-app-border text-[10px] font-bold text-app-text-muted whitespace-nowrap">
                      {sub.student?.batch || "--"}
                    </span>
                  </Td>
                  <Td>
                    <span className="px-1.5 py-0.5 rounded bg-app-card border border-app-border text-[10px] font-bold text-app-text-muted whitespace-nowrap">
                      {sub.student?.chestNo || "--"}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-500/25 border border-indigo-400/40 text-[10px] font-bold text-indigo-200 whitespace-nowrap">
                        <GraduationCap size={11} /> {courseLabel}
                      </span>
                      {sub.isOffline && (
                        <span
                          className="inline-flex items-center px-2 py-1 rounded-md bg-orange-500/20 border border-orange-400/40 text-[10px] font-bold text-orange-200 whitespace-nowrap uppercase tracking-wider"
                          title="In-person batch — only the Assessment tab applies, no PIQ/dossier"
                        >
                          Offline
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      {roles.length === 0 ? (
                        <span className="text-[11px] text-app-text-muted">--</span>
                      ) : (
                        roles.map((r) => (
                          <span key={r.key} className={cn("px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider", ROLE_BADGE[r.key])}>
                            {r.label}
                          </span>
                        ))
                      )}
                    </div>
                  </Td>
                  <Td align="center">
                    <Badge tone={isReviewCompleted(sub) ? "success" : (STATUS_TONE[sub.status] || "neutral")}>
                      {isReviewCompleted(sub) && sub.status !== "REPORT_RELEASED" && sub.status !== "COMPLETED"
                        ? "Review Completed"
                        : sub.status.replace(/_/g, " ")}
                    </Badge>
                  </Td>
                  <Td align="right">
                    {isAwaiting ? (
                      <span className="text-[11px] font-bold text-app-text-muted/70" title="Candidate has not started their assessment yet">
                        Awaiting
                      </span>
                    ) : (
                      <Link
                        href={`/psych-battery/review/${sub.id}`}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                          sub.status === "REPORT_RELEASED"
                            ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-app-on-accent"
                            : "bg-app-accent/25 text-app-accent-light hover:bg-app-accent hover:text-app-on-accent"
                        )}
                        title={sub.status === "REPORT_RELEASED" ? "View Finalized Report" : "Initialize Review"}
                      >
                        {sub.status === "REPORT_RELEASED" ? <FileCheck size={13} /> : <Eye size={13} />}
                        {sub.status === "REPORT_RELEASED" ? "View Report" : "Review"}
                      </Link>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableShell>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredSubmissions.map((sub, index) => {
            const hasUploadedDossier = !!(sub.uploadedFiles && sub.uploadedFiles.length > 0);
            const isAwaiting = sub.status === "PENDING" && !hasUploadedDossier && activeAssessorType !== "GTO" && activeAssessorType !== "IO" && !sub.isOffline;
            const isCompletedForAssessor = isReviewCompleted(sub);
            const accent = isCompletedForAssessor ? STATUS_ACCENT.COMPLETED : (STATUS_ACCENT[sub.status] || DEFAULT_ACCENT);
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
                  <div className="flex items-start justify-between gap-2">
                    {/* Fix #10: on 1-column mobile layout the badge is shrink-0
                        whitespace-nowrap, so give the name/email side explicit
                        min-w-0 so truncate has room to activate before the
                        badge pushes content off-screen. */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar
                        src={sub.student?.profileImage}
                        alt={sub.student?.name || "Candidate"}
                        fallbackIcon={UserIcon}
                        size={44}
                        className={cn("ring-2 shrink-0", accent.ring)}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-app-text-bright truncate">{sub.student?.name || "Unknown Candidate"}</div>
                        <div className="text-[11px] text-app-text-muted truncate">{sub.student?.email || "N/A"}</div>
                      </div>
                    </div>
                    <Badge tone={isCompletedForAssessor ? "success" : (STATUS_TONE[sub.status] || "neutral")} className="shrink-0 mt-0.5">
                      {isCompletedForAssessor && sub.status !== "REPORT_RELEASED" && sub.status !== "COMPLETED"
                        ? "Done"
                        : sub.status.replace(/_/g, " ")}
                    </Badge>
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
                    {sub.isOffline && (
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-md bg-orange-500/20 border border-orange-400/40 text-[10px] font-bold text-orange-200 uppercase tracking-wider"
                        title="In-person batch — only the Assessment tab applies, no PIQ/dossier"
                      >
                        Offline
                      </span>
                    )}
                    {sub.testConductedVia && sub.testConductedVia !== "WEBSITE_TIMED" && (
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-bold text-cyan-200 uppercase tracking-wider"
                        title={sub.testConductedVia === "LIVE_CALL" ? "Test conducted in live meeting/call (not website timed battery)" : "Dossier uploaded directly"}
                      >
                        {sub.testConductedVia === "LIVE_CALL" ? "Live Call Test" : "Direct Upload"}
                      </span>
                    )}
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
