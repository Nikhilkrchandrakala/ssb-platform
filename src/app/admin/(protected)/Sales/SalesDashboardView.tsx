"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Briefcase,
  Search,
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  Receipt,
  Key,
  BookOpen,
  UserPen,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAdminUser } from "@/components/admin/AdminUserProvider";
import { isBookingClosed, formatTimeRemaining } from "@/lib/batchTiming";
import { redistributeRemaining } from "@/lib/redistributeInstallments";
import "@/app/admin/styles/legacy-sales-dashboard.css";

const ICON_STYLE = { verticalAlign: -2 };

interface SlotItem {
  _id: string;
  title?: string;
  batchNo?: string;
  startTime?: string;
  endTime?: string;
  price?: number;
  isFullCourse?: boolean;
  maxStudents?: number;
  bookedStudents?: string[];
}

interface Installment {
  seq: number;
  amount: number;
  dueDate?: string;
  status: "pending" | "paid" | "overdue" | "failed";
  paymentLinkUrl?: string | null;
  paymentId?: string | null;
  paidAt?: string | null;
  paymentMethod?: "razorpay" | "manual" | null;
  paymentReference?: string | null;
}

interface InstallmentPlanPopulated {
  _id: string;
  status: "active" | "completed" | "defaulted" | "cancelled";
  totalAmount?: number;
  initialAmount?: number;
  installments: Installment[];
}

interface SalesOrderItem {
  _id: string;
  price?: number;
  originalAmount?: number;
  discount?: number;
  couponCode?: string | null;
  selectedModules?: string[];
  status?: string;
  accessRevoked?: boolean;
  createdAt?: string;
  userId?: { name?: string; email?: string } | null;
  slotId?: { title?: string; batchNo?: string; startTime?: string; isFullCourse?: boolean } | null;
  salesPersonId?: { name?: string; email?: string } | null;
  installmentPlanId?: InstallmentPlanPopulated | null;
}

interface StudentCredentials {
  email: string;
  password: string;
  emailDelivered?: boolean;
}

interface ReportAccount {
  _id: string;
  name?: string;
  email: string;
  phone?: string;
  salesRole?: "executive" | "head" | null;
  reportsTo?: string | null;
}

interface SuggestedInstallment {
  seq: number;
  amount: number;
  dueDate: string;
}

interface CourseItem {
  _id: string;
  courseId?: string;
  price?: number;
}

// Mirrors CoursesView.tsx's own MODULES/MANUAL_MODULES + DEFAULT_PRICES —
// module selection here follows the exact same rule as the existing admin
// "manual booking" flow: only a full-course batch can be booked for a
// subset of modules; a module batch always charges its own fixed price.
const MODULES = [
  { id: "ssb_ppdt", label: "Intro to SSB & PPDT", defaultPrice: 1999 },
  { id: "psych", label: "Psychology Prep Program", defaultPrice: 3499 },
  { id: "interview", label: "Interview & Mock Course", defaultPrice: 2499 },
  { id: "group_testing", label: "GTO Course on VTX", defaultPrice: 7999 },
];
const FULL_COURSE_MODULE = { id: "full_course", label: "Full 10-day SSB Hackathon", defaultPrice: 12499 };

interface AuditLogEntry {
  _id: string;
  actorId?: { name?: string; email?: string } | null;
  action: "LINK_GENERATED" | "INSTALLMENT_MARKED_PAID_MANUAL" | "PLAN_EDITED" | "REMINDER_SENT";
  orderId?: string | null;
  installmentPlanId?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt?: string;
}

type Section = "enroll" | "myStudents" | "team" | "myTeam" | "auditLog";

function formatDate(dateString?: string) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function toDateInputValue(dateString: string) {
  return new Date(dateString).toISOString().slice(0, 10);
}

function nextPendingInstallment(order: SalesOrderItem): Installment | null {
  const list = order.installmentPlanId?.installments || [];
  const pending = list.filter((i) => i.status !== "paid").sort((a, b) => a.seq - b.seq);
  return pending[0] || null;
}

function planStatusChip(order: SalesOrderItem) {
  const status = order.installmentPlanId?.status;
  const map: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: "ACTIVE", color: "#3498db", bg: "rgba(52,152,219,0.15)" },
    completed: { label: "COMPLETED", color: "#2ecc71", bg: "rgba(46,204,113,0.15)" },
    defaulted: { label: "DEFAULTED", color: "#e74c3c", bg: "rgba(231,76,60,0.15)" },
    cancelled: { label: "CANCELLED", color: "#7f8c8d", bg: "rgba(127,140,141,0.15)" },
  };
  const chip = map[status || "active"] || map.active;
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 4,
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.5px",
        color: chip.color,
        background: chip.bg,
        border: `1px solid ${chip.color}44`,
      }}
    >
      {chip.label}
    </span>
  );
}

function swalToast(icon: "success" | "error", title: string) {
  window.Swal?.fire({
    icon,
    title,
    background: "#1a1a1a",
    color: "#fff",
    confirmButtonColor: icon === "error" ? "#ff6b6b" : "#e0c214",
    timer: icon === "success" ? 1800 : undefined,
    showConfirmButton: icon !== "success",
  });
}

// Interim fallback while the app's outbound SMTP is unreliable (see the
// server-side credentials-email comments): shown any time a student's
// credentials become available on the client — right after a payment is
// confirmed, or from an explicit reset — so a sales person can hand them to
// the student directly if the email itself doesn't land.
function showCredentialsSwal(cred: StudentCredentials) {
  const emailFailed = cred.emailDelivered === false;
  window.Swal?.fire({
    title: "Student Login Credentials",
    html: `
      <div style="text-align:left;">
        <div style="
          display:flex; align-items:center; gap:8px;
          padding:10px 12px; border-radius:8px; margin-bottom:16px; font-size:0.82rem;
          background:${emailFailed ? "rgba(231,76,60,0.12)" : "rgba(46,204,113,0.12)"};
          border:1px solid ${emailFailed ? "rgba(231,76,60,0.35)" : "rgba(46,204,113,0.35)"};
          color:${emailFailed ? "#ff8a80" : "#2ecc71"};
        ">
          <i class="fas ${emailFailed ? "fa-triangle-exclamation" : "fa-circle-check"}"></i>
          <span>${emailFailed ? "Email delivery failed — share these with the student manually." : "Also emailed to the student."}</span>
        </div>

        <div style="background:rgba(255,255,255,0.03); border:1px solid #333; border-radius:10px; padding:14px 16px;">
          <div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px; color:rgba(255,255,255,0.45); margin-bottom:2px;">Email</div>
          <div style="font-size:0.92rem; font-weight:600; margin-bottom:14px; word-break:break-all;">${cred.email}</div>

          <div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px; color:rgba(255,255,255,0.45); margin-bottom:6px;">Password</div>
          <div style="display:flex; align-items:center; gap:8px;">
            <code id="swal-cred-password" style="
              flex:1; background:#141414; border:1px solid #333; padding:8px 12px; border-radius:6px;
              font-size:1rem; letter-spacing:0.5px; color:#e0c214;
            ">${cred.password}</code>
            <button id="swal-cred-copy" type="button" style="
              background:#2c2c2c; border:1px solid #444; color:#fff; border-radius:6px;
              padding:8px 12px; font-size:0.8rem; cursor:pointer; white-space:nowrap;
            ">
              <i class="fas fa-copy"></i> Copy
            </button>
          </div>
        </div>
      </div>
    `,
    background: "#1a1a1a",
    color: "#fff",
    confirmButtonColor: "#e0c214",
    confirmButtonText: "Done",
    width: 440,
    didOpen: () => {
      const copyBtn = document.getElementById("swal-cred-copy");
      copyBtn?.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(cred.password);
          copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied';
          setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
          }, 1500);
        } catch {
          // Clipboard API unavailable (e.g. non-HTTPS context) — password is
          // still selectable text in the box above, no further action needed.
        }
      });
    },
  });
}

function installmentStatusChip(status: Installment["status"]) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    paid: { label: "PAID", color: "#2ecc71", bg: "rgba(46,204,113,0.15)" },
    pending: { label: "PENDING", color: "#f39c12", bg: "rgba(243,156,18,0.15)" },
    overdue: { label: "OVERDUE", color: "#e74c3c", bg: "rgba(231,76,60,0.15)" },
    failed: { label: "FAILED", color: "#e74c3c", bg: "rgba(231,76,60,0.15)" },
  };
  const chip = map[status] || map.pending;
  return (
    <span
      style={{ padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.5px", color: chip.color, background: chip.bg }}
    >
      {chip.label}
    </span>
  );
}

function installmentsSummary(order: SalesOrderItem) {
  const installments = order.installmentPlanId?.installments || [];
  const paid = installments.filter((i) => i.status === "paid").reduce((sum, i) => sum + (i.amount || 0), 0);
  const total = installments.reduce((sum, i) => sum + (i.amount || 0), 0) || order.price || 0;
  const remaining = Math.max(0, total - paid);
  return { installments, paid, total, remaining };
}

// Mirrors LeadsView.tsx's own pagination pattern/classes exactly (same
// admin-wide "pagination-controls"/"pagination-buttons"/"per-page-select"
// look) — client-side slicing of an already-fully-fetched list, appropriate
// while these lists stay in the hundreds rather than needing a server-side
// paged API.
function getPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

function paginatedSlice<T>(items: T[], page: number, perPage: number): { safePage: number; totalPages: number; pageItems: T[] } {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pageItems = items.slice((safePage - 1) * perPage, safePage * perPage);
  return { safePage, totalPages, pageItems };
}

function PaginationControls({
  setPage,
  perPage,
  setPerPage,
  totalItems,
  totalPages,
  safePage,
  label,
}: {
  setPage: (p: number) => void;
  perPage: number;
  setPerPage: (n: number) => void;
  totalItems: number;
  totalPages: number;
  safePage: number;
  label: string;
}) {
  if (totalItems === 0) return null;
  const startIdx = (safePage - 1) * perPage;
  const endIdx = Math.min(startIdx + perPage, totalItems);
  return (
    <div className="pagination-controls" style={{ display: "flex" }}>
      <div className="pagination-info">
        <span>
          Showing {startIdx + 1}–{endIdx} of {totalItems} {label}
        </span>
        &nbsp;|&nbsp;
        <label>
          Per page:{" "}
          <select
            className="per-page-select"
            value={perPage}
            onChange={(e) => {
              setPerPage(parseInt(e.target.value, 10));
              setPage(1);
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>
      <div className="pagination-buttons">
        <button disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>
          <ChevronLeft size={14} />
        </button>
        {getPageRange(safePage, totalPages).map((p, i) =>
          p === "..." ? (
            <button key={`ellipsis-${i}`} disabled style={{ cursor: "default" }}>
              &hellip;
            </button>
          ) : (
            <button key={p} className={p === safePage ? "active" : ""} onClick={() => setPage(p)}>
              {p}
            </button>
          )
        )}
        <button disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default function SalesDashboardView() {
  const { user } = useAdminUser();
  const isOwner = user?.role === "owner";
  const isHead = user?.salesRole === "head";
  const isExecutive = user?.salesRole === "executive";
  const canSeeTeam = isOwner || isHead;

  const [section, setSection] = useState<Section>("enroll");

  // --- Enroll tab --- only "live" batches: not yet started (an invalid/past
  // startTime naturally fails this too) and not already full.
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [courses, setCourses] = useState<CourseItem[]>([]);

  // Ticks once a minute so every "time left to book" card label on this
  // page stays live without needing a full data refetch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/allSlots")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: SlotItem[]) => {
        const live = (Array.isArray(data) ? data : []).filter((slot) => {
          const isOpen = (slot.bookedStudents?.length || 0) < (slot.maxStudents || 50);
          return !isBookingClosed(slot) && isOpen;
        });
        setSlots(live);
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));

    fetch("/api/allCourses")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]));
  }, []);

  // Search/type/date-range filters over the already-live-only `slots` list.
  const [batchSearch, setBatchSearch] = useState("");
  const [batchTypeFilter, setBatchTypeFilter] = useState<"all" | "morning" | "evening">("all");
  const [batchDateFrom, setBatchDateFrom] = useState("");
  const [batchDateTo, setBatchDateTo] = useState("");

  const filteredSlots = slots.filter((slot) => {
    if (batchSearch.trim()) {
      const q = batchSearch.trim().toLowerCase();
      const matches = (slot.title || "").toLowerCase().includes(q) || (slot.batchNo || "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (batchTypeFilter !== "all") {
      const isMorning = (slot.title || "").toLowerCase().includes("morning");
      if (batchTypeFilter === "morning" && !isMorning) return false;
      if (batchTypeFilter === "evening" && isMorning) return false;
    }
    const starts = slot.startTime ? new Date(slot.startTime) : null;
    if (batchDateFrom && (!starts || starts < new Date(batchDateFrom))) return false;
    if (batchDateTo) {
      const to = new Date(batchDateTo);
      to.setHours(23, 59, 59, 999);
      if (!starts || starts > to) return false;
    }
    return true;
  });

  const clearBatchFilters = () => {
    setBatchSearch("");
    setBatchTypeFilter("all");
    setBatchDateFrom("");
    setBatchDateTo("");
  };

  const getModulePrice = (courseId: string, defaultPrice: number) => {
    const course = courses.find((c) => c.courseId === courseId);
    return typeof course?.price === "number" ? course.price : defaultPrice;
  };

  // --- My Students tab ---
  const [myOrders, setMyOrders] = useState<SalesOrderItem[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(true);
  const [myPage, setMyPage] = useState(1);
  const [myPerPage, setMyPerPage] = useState(25);
  const myPagination = paginatedSlice(myOrders, myPage, myPerPage);

  const fetchMyOrders = () => {
    fetch("/api/sales/myStudents")
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((data) => setMyOrders(data.orders || []))
      .catch(() => setMyOrders([]))
      .finally(() => setMyOrdersLoading(false));
  };

  // No synchronous setState here — myOrdersLoading already starts `true`,
  // and fetchMyOrders only ever sets state from its async .then/.catch/.finally.
  useEffect(() => {
    fetchMyOrders();
  }, []);

  const loadMyOrders = () => {
    // Safe here — called from event handlers (button clicks), never an effect body.
    setMyOrdersLoading(true);
    fetchMyOrders();
  };

  // --- Team tab --- `teamOrders === null` doubles as "not loaded yet" so the
  // loading state doesn't need its own synchronous setState-in-effect call.
  const [teamReports, setTeamReports] = useState<ReportAccount[] | null>(null);
  const [teamOrders, setTeamOrders] = useState<SalesOrderItem[] | null>(null);
  const [teamExecutiveFilter, setTeamExecutiveFilter] = useState("");
  const teamLoading = teamOrders === null;
  const [teamPage, setTeamPage] = useState(1);
  const [teamPerPage, setTeamPerPage] = useState(25);
  const teamPagination = paginatedSlice(teamOrders || [], teamPage, teamPerPage);

  const fetchTeam = (executiveId?: string) => {
    if (!canSeeTeam) return;
    const qs = executiveId ? `?executiveId=${executiveId}` : "";
    fetch(`/api/sales/teamStudents${qs}`)
      .then((res) => (res.ok ? res.json() : { reports: [], orders: [] }))
      .then((data) => {
        setTeamReports(data.reports || []);
        setTeamOrders(data.orders || []);
      })
      .catch(() => {
        setTeamReports([]);
        setTeamOrders([]);
      });
  };

  useEffect(() => {
    if ((section === "team" || section === "myTeam") && canSeeTeam && teamOrders === null) {
      fetchTeam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, canSeeTeam]);

  const loadTeam = (executiveId?: string) => {
    // Safe here — called from event handlers, never an effect body.
    setTeamOrders(null);
    fetchTeam(executiveId);
  };

  const openTeamMember = (report: ReportAccount) => {
    setTeamExecutiveFilter(report._id);
    setTeamPage(1);
    loadTeam(report._id);
  };

  const backToTeamRoster = () => {
    setTeamExecutiveFilter("");
    setTeamPage(1);
    loadTeam();
  };

  const selectedTeamMember = (teamReports ?? []).find((r) => r._id === teamExecutiveFilter) || null;

  // --- Audit Log tab (Phase 6, stretch) --- same null-sentinel pattern as Team.
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[] | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPerPage, setAuditPerPage] = useState(25);
  const auditPagination = paginatedSlice(auditEntries || [], auditPage, auditPerPage);

  const fetchAuditLog = () => {
    fetch("/api/sales/auditLog")
      .then((res) => (res.ok ? res.json() : { entries: [] }))
      .then((data) => setAuditEntries(data.entries || []))
      .catch(() => setAuditEntries([]));
  };

  useEffect(() => {
    if (section === "auditLog" && auditEntries === null) {
      fetchAuditLog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  // --- Enroll modal ---
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [initialAmount, setInitialAmount] = useState<number>(3000);
  const [numberOfInstallments, setNumberOfInstallments] = useState<number>(1);
  const [finalDueDate, setFinalDueDate] = useState("");
  const [finalPriceInclGST, setFinalPriceInclGST] = useState<number | null>(null);
  const [installmentRows, setInstallmentRows] = useState<SuggestedInstallment[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState<{ paymentLink: string } | null>(null);
  const EMPTY_MODULE_CHECKS: Record<string, boolean> = { full_course: false, ssb_ppdt: false, psych: false, interview: false, group_testing: false };
  const [moduleChecks, setModuleChecks] = useState<Record<string, boolean>>(EMPTY_MODULE_CHECKS);
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const openEnrollModal = (slot: SlotItem) => {
    setSelectedSlot(slot);
    setStudentName("");
    setStudentEmail("");
    setInitialAmount(3000);
    setNumberOfInstallments(1);
    const defaultFinal = new Date();
    defaultFinal.setDate(defaultFinal.getDate() + 30);
    setFinalDueDate(defaultFinal.toISOString().slice(0, 10));
    setFinalPriceInclGST(null);
    setInstallmentRows([]);
    setEnrollResult(null);
    setModuleChecks(EMPTY_MODULE_CHECKS);
    setCouponCode("");
    setAppliedDiscount(0);
    setAppliedCoupon(null);
    setEnrollModalOpen(true);
  };

  const closeEnrollModal = () => setEnrollModalOpen(false);

  // Same mutual-exclusion rule as CoursesView's manual-booking checkboxes:
  // checking "Full Course" clears the individual modules and vice versa.
  const toggleModule = (changedId: string, checked: boolean) => {
    setModuleChecks((prev) => {
      const next = { ...prev, [changedId]: checked };
      if (changedId === "full_course") {
        if (checked) MODULES.forEach((m) => (next[m.id] = false));
      } else if (MODULES.some((m) => next[m.id])) {
        next.full_course = false;
      }
      return next;
    });
  };

  // Only meaningful for a full-course batch — a module batch always charges
  // its own fixed price server-side regardless of what's sent here.
  const selectedModulesForRequest = (): string[] => {
    if (!selectedSlot?.isFullCourse) return [];
    if (moduleChecks.full_course) return ["full_course"];
    return MODULES.filter((m) => moduleChecks[m.id]).map((m) => m.id);
  };

  const previewSchedule = async () => {
    if (!selectedSlot) return;
    if (selectedSlot.isFullCourse && selectedModulesForRequest().length === 0) {
      swalToast("error", "Select Full Course or at least one module");
      return;
    }
    setIsPreviewing(true);
    try {
      const res = await fetch("/api/sales/suggestSchedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlot._id,
          studentEmail: studentEmail.trim(),
          initialAmount,
          numberOfInstallments,
          finalDueDate: new Date(finalDueDate).toISOString(),
          selectedModules: selectedModulesForRequest(),
          couponCode: couponCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not compute a schedule");
      setFinalPriceInclGST(data.finalPriceInclGST);
      setInstallmentRows(data.installments || []);
      setAppliedDiscount(data.discount || 0);
      setAppliedCoupon(data.couponCode || null);
    } catch (err) {
      swalToast("error", err instanceof Error ? err.message : "Could not compute a schedule");
    } finally {
      setIsPreviewing(false);
    }
  };

  const updateRow = (seq: number, field: "amount" | "dueDate", value: string) => {
    if (field === "dueDate") {
      setInstallmentRows((rows) => rows.map((r) => (r.seq === seq ? { ...r, dueDate: new Date(value).toISOString() } : r)));
      return;
    }

    // Editing one row's amount automatically re-splits the rest so they still
    // sum to the balance due after the initial payment — no hand-editing
    // every other row to compensate.
    setInstallmentRows((rows) => {
      const edited = rows.map((r) => (r.seq === seq ? { ...r, amount: Number(value) || 0 } : r));
      const remainingDue = finalPriceInclGST !== null ? Math.round((finalPriceInclGST - initialAmount) * 100) / 100 : 0;
      const redistributable = edited.map((r) => ({ seq: r.seq, amount: r.amount, status: "pending" }));
      const result = redistributeRemaining(redistributable, remainingDue, new Set([seq]));
      if (!result.ok) {
        swalToast("error", result.message);
        return edited;
      }
      return edited.map((r) => {
        const updated = redistributable.find((x) => x.seq === r.seq);
        return updated ? { ...r, amount: updated.amount } : r;
      });
    });
  };

  const submitEnroll = async () => {
    if (!selectedSlot) return;
    if (!studentName.trim() || !studentEmail.trim()) {
      swalToast("error", "Student name and email are required");
      return;
    }
    if (finalPriceInclGST === null) {
      swalToast("error", "Preview the schedule before enrolling");
      return;
    }
    setIsEnrolling(true);
    try {
      const res = await fetch("/api/sales/enrollStudent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim(),
          studentEmail: studentEmail.trim(),
          slotId: selectedSlot._id,
          initialAmount,
          installments: installmentRows.map((r) => ({ amount: r.amount, dueDate: r.dueDate })),
          selectedModules: selectedModulesForRequest(),
          couponCode: couponCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Enrollment failed");
      setEnrollResult({ paymentLink: data.paymentLink });
      loadMyOrders();
      swalToast("success", "Student enrolled — payment link generated");
    } catch (err) {
      swalToast("error", err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setIsEnrolling(false);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard?.writeText(url);
    swalToast("success", "Link copied");
  };

  // --- My Students actions ---
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<SalesOrderItem | null>(null);
  const detailsSummary = detailsOrder ? installmentsSummary(detailsOrder) : null;

  // Actions column collapses into one menu per row instead of a wall of
  // buttons (grows unreadable once there are dozens/hundreds of students) —
  // rendered via a portal to document.body since .admin-table-container is
  // overflow-x:auto, which per spec also forces overflow-y to auto and would
  // silently clip an absolutely-positioned menu instead of showing it as an
  // overlay. Position is computed from the trigger button's own rect at
  // click time rather than tracked via a ref, since only one menu is ever
  // open at once.
  const [actionsMenu, setActionsMenu] = useState<{ orderId: string; top: number; right: number } | null>(null);
  useEffect(() => {
    if (!actionsMenu) return;
    const close = () => setActionsMenu(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [actionsMenu]);
  const toggleActionsMenu = (order: SalesOrderItem, e: React.MouseEvent<HTMLButtonElement>) => {
    if (actionsMenu?.orderId === order._id) {
      setActionsMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setActionsMenu({ orderId: order._id, top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  const checkStatus = async (order: SalesOrderItem, reload: () => void) => {
    const inst = nextPendingInstallment(order);
    if (!inst || !order.installmentPlanId) return;
    setBusyOrderId(order._id);
    try {
      const res = await fetch(
        `/api/sales/checkInstallmentStatus?installmentPlanId=${order.installmentPlanId._id}&seq=${inst.seq}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not check status");
      if (data.status === "paid") {
        if (data.studentCredentials) {
          showCredentialsSwal(data.studentCredentials);
        } else {
          swalToast("success", "Payment confirmed!");
        }
      } else if (data.hasPaymentLink === false) {
        // This installment was never sales-linked — only installment 1 gets a
        // Payment Link at enrollment. Later ones are paid by the student
        // directly from their own dashboard, which updates the DB in real
        // time on its own. Still refresh below in case that already happened
        // for a *different* installment since this table last loaded.
        swalToast("error", `Installment #${inst.seq} has no sales payment link — the student pays this one from their own dashboard.`);
      } else {
        swalToast("error", `Still ${data.razorpayStatus || data.status || "pending"}`);
      }
      // Always refresh: even a "still pending" result on the installment we
      // just checked doesn't mean nothing changed — the student may have
      // paid a *different* installment from their own dashboard in the
      // meantime, and this table only otherwise reloads on mount.
      reload();
    } catch (err) {
      swalToast("error", err instanceof Error ? err.message : "Could not check status");
    } finally {
      setBusyOrderId(null);
    }
  };

  // On-demand fallback (see resetStudentCredentials's own comment for why this
  // exists): regenerates the student's password and shows it on screen, for
  // when the one-time reveal above was missed or the credentials email failed.
  const resetCredentials = async (order: SalesOrderItem) => {
    const confirmed = await window.Swal?.fire({
      title: "Reset this student's password?",
      text: "This immediately invalidates their current password and generates a new one to show here.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e0c214",
      cancelButtonColor: "#555",
      confirmButtonText: "Yes, reset",
      background: "#1a1a1a",
      color: "#fff",
    });
    if (!confirmed?.isConfirmed) return;
    setBusyOrderId(order._id);
    try {
      const res = await fetch("/api/sales/resetStudentCredentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not reset credentials");
      showCredentialsSwal(data);
    } catch (err) {
      swalToast("error", err instanceof Error ? err.message : "Could not reset credentials");
    } finally {
      setBusyOrderId(null);
    }
  };

  // Keeps the open Payment Details modal in sync immediately (rather than
  // requiring a close/reopen), and refreshes whichever list(s) this modal
  // could have been opened from — My Students always, Team only if it's
  // actually been loaded at least once.
  const refreshAfterInstallmentChange = (updatedInstallments?: Installment[] | null) => {
    if (updatedInstallments) {
      setDetailsOrder((prev) =>
        prev && prev.installmentPlanId ? { ...prev, installmentPlanId: { ...prev.installmentPlanId, installments: updatedInstallments } } : prev
      );
    }
    loadMyOrders();
    if (teamOrders !== null) loadTeam(teamExecutiveFilter || undefined);
  };

  // A student paid this installment offline (cash, UPI, bank transfer,
  // cheque...) — the sales person records it here with a reference so it's
  // always distinguishable from a real Razorpay payment, both to the sales
  // team and to the student's own dashboard.
  const markPaidOffline = async (order: SalesOrderItem, seq: number) => {
    if (!order.installmentPlanId) return;
    const { value: reference } =
      (await window.Swal?.fire({
        title: `Mark Installment #${seq} as Paid`,
        text: "Record how the student actually paid this installment offline.",
        input: "text",
        inputLabel: "Payment Reference (transaction ID, UTR, cheque no., UPI ref, etc.)",
        inputPlaceholder: "e.g. UPI/2026080312345",
        showCancelButton: true,
        confirmButtonColor: "#e0c214",
        cancelButtonColor: "#555",
        confirmButtonText: "Mark Paid",
        background: "#1a1a1a",
        color: "#fff",
        inputValidator: (value: string) => (!value?.trim() ? "A payment reference is required" : undefined),
      })) || {};
    if (!reference) return;

    setBusyOrderId(order._id);
    try {
      const res = await fetch("/api/sales/markInstallmentPaidManual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentPlanId: order.installmentPlanId._id, seq, reference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not mark installment paid");
      if (data.studentCredentials) {
        showCredentialsSwal(data.studentCredentials);
      } else {
        swalToast("success", `Installment #${seq} marked as paid`);
      }
      refreshAfterInstallmentChange(data.installments);
    } catch (err) {
      swalToast("error", err instanceof Error ? err.message : "Could not mark installment paid");
    } finally {
      setBusyOrderId(null);
    }
  };

  // Changing one installment's amount automatically re-splits the rest of
  // the not-yet-paid installments so the plan's total still adds up — the
  // sales person never has to hand-edit every other installment to compensate.
  const editInstallmentAmount = async (order: SalesOrderItem, inst: Installment) => {
    if (!order.installmentPlanId) return;
    const { value: amountStr } =
      (await window.Swal?.fire({
        title: `Edit Installment #${inst.seq} Amount`,
        text: "The remaining not-yet-paid installments will be re-split automatically so the total still adds up.",
        input: "number",
        inputLabel: "New Amount (₹)",
        inputValue: inst.amount,
        showCancelButton: true,
        confirmButtonColor: "#e0c214",
        cancelButtonColor: "#555",
        confirmButtonText: "Update Amount",
        background: "#1a1a1a",
        color: "#fff",
        inputValidator: (value: string) => (!value || Number(value) <= 0 ? "Enter a positive amount" : undefined),
      })) || {};
    if (amountStr === undefined || amountStr === "") return;

    setBusyOrderId(order._id);
    try {
      const res = await fetch("/api/sales/adjustInstallmentAmount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentPlanId: order.installmentPlanId._id, seq: inst.seq, amount: Number(amountStr) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update amount");
      swalToast("success", "Amount updated — remaining installments re-split automatically");
      refreshAfterInstallmentChange(data.installments);
    } catch (err) {
      swalToast("error", err instanceof Error ? err.message : "Could not update amount");
    } finally {
      setBusyOrderId(null);
    }
  };

  const resendLink = async (order: SalesOrderItem) => {
    const inst = nextPendingInstallment(order);
    if (!inst || !order.installmentPlanId) return;
    setBusyOrderId(order._id);
    try {
      const res = await fetch("/api/sales/shareLink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentPlanId: order.installmentPlanId._id, seq: inst.seq, channels: ["email"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not resend link");
      swalToast("success", "Link re-sent by email");
    } catch (err) {
      swalToast("error", err instanceof Error ? err.message : "Could not resend link");
    } finally {
      setBusyOrderId(null);
    }
  };

  // Phase 5 — only the plan's own owning sales person can restore a defaulted
  // plan's access (Open Decision #6); the API rejects everyone else, so this
  // button is only useful on the caller's own "My Students" rows anyway.
  const restoreAccess = async (order: SalesOrderItem, reload: () => void) => {
    if (!order.installmentPlanId) return;
    const confirmed = await window.Swal?.fire({
      title: "Restore course access?",
      text: "This clears the access-revoked flag on this student's order and un-defaults the plan.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#e0c214",
      cancelButtonColor: "#555",
      background: "#1a1a1a",
      color: "#fff",
    });
    if (!confirmed?.isConfirmed) return;
    setBusyOrderId(order._id);
    try {
      const res = await fetch("/api/sales/resolveDefaultedPlan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentPlanId: order.installmentPlanId._id,
          action: "restoreAccess",
          reason: "Restored by sales person via dashboard",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not restore access");
      swalToast("success", "Access restored");
      reload();
    } catch (err) {
      swalToast("error", err instanceof Error ? err.message : "Could not restore access");
    } finally {
      setBusyOrderId(null);
    }
  };

  // Self-service undo for a mistaken enrollment (wrong course/batch, wrong
  // amount) — only works before anything's been paid; the API refuses
  // otherwise and this button never renders once seq 1 is paid anyway (see
  // the inst?.paymentLinkUrl branch below, which stops matching once it's
  // paid — there's no next *pending* seq-1 installment to find a link on).
  const cancelEnrollment = async (order: SalesOrderItem, reload: () => void) => {
    if (!order.installmentPlanId) return;
    const { value: reason } =
      (await window.Swal?.fire({
        title: "Cancel this enrollment?",
        text: "This cancels the payment link so it can no longer be paid, and closes out the plan. Only use this before the student has paid anything.",
        icon: "warning",
        input: "text",
        inputLabel: "Reason (optional)",
        inputPlaceholder: "e.g. Wrong course selected",
        showCancelButton: true,
        confirmButtonColor: "#e0c214",
        cancelButtonColor: "#555",
        confirmButtonText: "Yes, cancel enrollment",
        background: "#1a1a1a",
        color: "#fff",
      })) || {};
    if (reason === undefined) return;

    setBusyOrderId(order._id);
    try {
      const res = await fetch("/api/sales/cancelEnrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentPlanId: order.installmentPlanId._id, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not cancel enrollment");
      swalToast("success", "Enrollment cancelled");
      reload();
    } catch (err) {
      swalToast("error", err instanceof Error ? err.message : "Could not cancel enrollment");
    } finally {
      setBusyOrderId(null);
    }
  };

  // --- My Team: add/edit executive ---
  const [teamAccountModalOpen, setTeamAccountModalOpen] = useState(false);
  const [teamAccountEditing, setTeamAccountEditing] = useState<ReportAccount | null>(null);
  const [taName, setTaName] = useState("");
  const [taEmail, setTaEmail] = useState("");
  const [taPhone, setTaPhone] = useState("");
  const [taPassword, setTaPassword] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  const openAddExecutive = () => {
    setTeamAccountEditing(null);
    setTaName("");
    setTaEmail("");
    setTaPhone("");
    setTaPassword("");
    setTeamAccountModalOpen(true);
  };

  const openEditExecutive = (report: ReportAccount) => {
    setTeamAccountEditing(report);
    setTaName(report.name || "");
    setTaEmail(report.email);
    setTaPhone(report.phone || "");
    setTaPassword("");
    setTeamAccountModalOpen(true);
  };

  const submitTeamAccount = async () => {
    if (!taName.trim() || !taEmail.trim()) {
      swalToast("error", "Name and email are required");
      return;
    }
    setIsSavingAccount(true);
    try {
      if (teamAccountEditing) {
        const body: Record<string, string> = { name: taName.trim(), phone: taPhone.trim() };
        if (taPassword.trim()) body.password = taPassword.trim();
        const res = await fetch(`/api/sales/team/${teamAccountEditing._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not update account");
        swalToast("success", "Executive updated");
      } else {
        if (!taPassword.trim() || taPassword.trim().length < 6) {
          swalToast("error", "Set an initial password (min 6 characters)");
          setIsSavingAccount(false);
          return;
        }
        const res = await fetch("/api/sales/team/createExecutive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: taName.trim(), email: taEmail.trim(), phone: taPhone.trim(), password: taPassword.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not create account");
        swalToast("success", "Executive account created");
      }
      setTeamAccountModalOpen(false);
      loadTeam(teamExecutiveFilter || undefined);
    } catch (err) {
      swalToast("error", err instanceof Error ? err.message : "Could not save account");
    } finally {
      setIsSavingAccount(false);
    }
  };

  const remaining = finalPriceInclGST !== null ? finalPriceInclGST - initialAmount : null;

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <Briefcase size={20} className="me-2" style={ICON_STYLE} /> Sales
          </h1>
          <p className="text-muted mb-0">Enroll students on an installment plan and track collections.</p>
        </div>
      </div>

      <div className="sales-tab-bar">
        <button className={`sales-tab-btn${section === "enroll" ? " active" : ""}`} onClick={() => setSection("enroll")}>
          Enroll Student
        </button>
        <button className={`sales-tab-btn${section === "myStudents" ? " active" : ""}`} onClick={() => setSection("myStudents")}>
          My Students
        </button>
        {canSeeTeam && (
          <button className={`sales-tab-btn${section === "team" ? " active" : ""}`} onClick={() => setSection("team")}>
            Team
          </button>
        )}
        {isHead && (
          <button className={`sales-tab-btn${section === "myTeam" ? " active" : ""}`} onClick={() => setSection("myTeam")}>
            My Team
          </button>
        )}
        <button className={`sales-tab-btn${section === "auditLog" ? " active" : ""}`} onClick={() => setSection("auditLog")}>
          Audit Log
        </button>
      </div>

      {section === "enroll" && (
        <div className="admin-card">
          <div className="sales-filter-bar">
            <div className="search-wrapper">
              <Search size={16} style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                className="admin-input"
                placeholder="Search batches by name or #number..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
              />
            </div>
            <select className="filter-select" value={batchTypeFilter} onChange={(e) => setBatchTypeFilter(e.target.value as "all" | "morning" | "evening")}>
              <option value="all">All Types</option>
              <option value="morning">Morning Batch</option>
              <option value="evening">Evening Batch</option>
            </select>
            <div className="sales-date-range">
              <input type="date" className="admin-input" value={batchDateFrom} onChange={(e) => setBatchDateFrom(e.target.value)} title="Starts on/after" />
              <span className="text-muted">to</span>
              <input type="date" className="admin-input" value={batchDateTo} onChange={(e) => setBatchDateTo(e.target.value)} title="Starts on/before" />
            </div>
            {(batchSearch || batchTypeFilter !== "all" || batchDateFrom || batchDateTo) && (
              <button className="thm-btn secondary" style={{ padding: "8px 16px" }} onClick={clearBatchFilters}>
                Clear
              </button>
            )}
          </div>

          {slotsLoading ? (
            <p className="text-muted">Loading batches…</p>
          ) : slots.length === 0 ? (
            <p className="text-muted">No live batches right now — create one under Courses/Allotment, or check back once a new batch opens.</p>
          ) : filteredSlots.length === 0 ? (
            <p className="text-muted">No live batches match your filters.</p>
          ) : (
            <div className="sales-slot-grid">
              {filteredSlots.map((slot) => (
                <div key={slot._id} className="sales-slot-card">
                  <div style={{ fontWeight: 700, color: "#fff" }}>
                    {slot.title || "Batch"} {slot.batchNo ? `(#${slot.batchNo})` : ""}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Starts {formatDate(slot.startTime)}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {(slot.bookedStudents || []).length}/{slot.maxStudents || 50} booked ·{" "}
                    {slot.isFullCourse ? "Full course" : "Module batch"}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--primary-gold)" }}>⏰ {formatTimeRemaining(slot, now)}</div>
                  <div style={{ fontWeight: 700, color: "var(--primary-gold)" }}>₹{Number(slot.price || 0).toFixed(2)}</div>
                  <button className="thm-btn" style={{ marginTop: 8 }} onClick={() => openEnrollModal(slot)}>
                    <UserPlus size={14} className="me-1" style={ICON_STYLE} /> Enroll Student
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {section === "myStudents" && (
        <>
        <div className="admin-card">
          {myOrdersLoading ? (
            <p className="text-muted">Loading…</p>
          ) : myOrders.length === 0 ? (
            <p className="text-muted">You haven&apos;t enrolled any students yet.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course / Batch</th>
                    <th>Initial Amount</th>
                    <th>Installments Left</th>
                    <th>Next Due</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myPagination.pageItems.map((order) => {
                    const inst = nextPendingInstallment(order);
                    const remainingCount = (order.installmentPlanId?.installments || []).filter((i) => i.status !== "paid").length;
                    return (
                      <tr key={order._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{order.userId?.name || "—"}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{order.userId?.email}</div>
                        </td>
                        <td>
                          {order.slotId?.title} {order.slotId?.batchNo ? `(#${order.slotId.batchNo})` : ""}
                        </td>
                        <td>₹{Number(order.installmentPlanId?.installments?.[0]?.amount ?? 0).toFixed(2)}</td>
                        <td>{remainingCount}</td>
                        <td>{inst ? formatDate(inst.dueDate) : "—"}</td>
                        <td>{planStatusChip(order)}</td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="thm-btn secondary"
                            style={{ padding: "4px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                            disabled={busyOrderId === order._id}
                            onClick={(e) => toggleActionsMenu(order, e)}
                          >
                            Actions <MoreVertical size={14} style={ICON_STYLE} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <PaginationControls
            setPage={setMyPage}
            perPage={myPerPage}
            setPerPage={setMyPerPage}
            totalItems={myOrders.length}
            totalPages={myPagination.totalPages}
            safePage={myPagination.safePage}
            label="students"
          />
        </div>

        {actionsMenu &&
          (() => {
            const order = myOrders.find((o) => o._id === actionsMenu.orderId);
            if (!order) return null;
            const inst = nextPendingInstallment(order);
            const runAction = (fn: () => void) => {
              setActionsMenu(null);
              fn();
            };
            const menuItemStyle: React.CSSProperties = {
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 14px",
              fontSize: "0.8rem",
              color: "#fff",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            };
            return createPortal(
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 2000 }} onClick={() => setActionsMenu(null)} />
                <div
                  style={{
                    position: "fixed",
                    top: actionsMenu.top,
                    right: actionsMenu.right,
                    zIndex: 2001,
                    background: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 6,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    minWidth: 180,
                    padding: 4,
                  }}
                >
                  <button style={menuItemStyle} onClick={() => runAction(() => setDetailsOrder(order))}>
                    Details
                  </button>
                  {inst?.paymentLinkUrl ? (
                    // Only installment 1 ever gets a sales-generated Payment Link
                    // (enrollStudent). Once that's paid, every later installment is
                    // paid by the student directly from their own dashboard — there's
                    // no link for a sales person to copy/resend/check here anymore.
                    <>
                      <button style={menuItemStyle} onClick={() => runAction(() => copyLink(inst.paymentLinkUrl!))}>
                        Copy Link
                      </button>
                      <button style={menuItemStyle} onClick={() => runAction(() => resendLink(order))}>
                        Resend
                      </button>
                      <button style={menuItemStyle} onClick={() => runAction(() => checkStatus(order, loadMyOrders))}>
                        Check Status
                      </button>
                      <button style={{ ...menuItemStyle, color: "#e74c3c" }} onClick={() => runAction(() => cancelEnrollment(order, loadMyOrders))}>
                        Cancel Enrollment
                      </button>
                    </>
                  ) : (
                    inst && <div style={{ ...menuItemStyle, color: "var(--text-muted)", cursor: "default" }}>Pays from own dashboard</div>
                  )}
                  {order.installmentPlanId?.status === "defaulted" && (
                    <button style={menuItemStyle} onClick={() => runAction(() => restoreAccess(order, loadMyOrders))}>
                      Restore Access
                    </button>
                  )}
                </div>
              </>,
              document.body
            );
          })()}
        </>
      )}

      {section === "team" && canSeeTeam && (
        <div className="admin-card">
          {!teamExecutiveFilter ? (
            // Roster first: pick a sales person, then see their data — rather
            // than one flat table of every team order mixed together.
            teamLoading || !teamReports ? (
              <p className="text-muted">Loading…</p>
            ) : teamReports.length === 0 ? (
              <p className="text-muted">No sales executives on your team yet — add one from &quot;My Team&quot;.</p>
            ) : (
              <div className="row g-3">
                {teamReports.map((r) => {
                  const theirOrders = (teamOrders || []).filter((o) => o.salesPersonId?.email === r.email);
                  const revenue = theirOrders.reduce((sum, o) => sum + installmentsSummary(o).paid, 0);
                  return (
                    <div className="col-md-4" key={r._id}>
                      <button
                        type="button"
                        onClick={() => openTeamMember(r)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid #333",
                          borderRadius: 8,
                          padding: "14px 16px",
                          cursor: "pointer",
                          color: "#fff",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{r.name || r.email}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{r.email}</div>
                          </div>
                          <span
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "2px 8px",
                              borderRadius: 4,
                              color: r.salesRole === "head" ? "#e0c214" : "#3498db",
                              background: r.salesRole === "head" ? "rgba(224,194,20,0.12)" : "rgba(52,152,219,0.15)",
                            }}
                          >
                            {r.salesRole === "head" ? "Head" : "Executive"}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: "0.8rem" }}>
                          <div>
                            <div style={{ color: "var(--text-muted)" }}>Students</div>
                            <div style={{ fontWeight: 700 }}>{theirOrders.length}</div>
                          </div>
                          <div>
                            <div style={{ color: "var(--text-muted)" }}>Collected</div>
                            <div style={{ fontWeight: 700, color: "#2ecc71" }}>₹{revenue.toFixed(2)}</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <button className="thm-btn secondary" style={{ padding: "6px 14px", fontSize: "0.8rem" }} onClick={backToTeamRoster}>
                  <ArrowLeft size={14} className="me-1" style={ICON_STYLE} /> Back to team
                </button>
                <span style={{ fontWeight: 600 }}>
                  {selectedTeamMember?.name || selectedTeamMember?.email || "Sales person"}&apos;s students
                </span>
              </div>
              {teamLoading || !teamOrders ? (
                <p className="text-muted">Loading…</p>
              ) : teamOrders.length === 0 ? (
                <p className="text-muted">No enrolled students for this sales person yet.</p>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Course / Batch</th>
                        <th>Initial Amount</th>
                        <th>Status</th>
                        <th style={{ textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamPagination.pageItems.map((order) => (
                        <tr key={order._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{order.userId?.name || "—"}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{order.userId?.email}</div>
                          </td>
                          <td>
                            {order.slotId?.title} {order.slotId?.batchNo ? `(#${order.slotId.batchNo})` : ""}
                          </td>
                          <td>₹{Number(order.installmentPlanId?.installments?.[0]?.amount ?? 0).toFixed(2)}</td>
                          <td>{planStatusChip(order)}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="thm-btn secondary"
                              style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                              onClick={() => setDetailsOrder(order)}
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <PaginationControls
                setPage={setTeamPage}
                perPage={teamPerPage}
                setPerPage={setTeamPerPage}
                totalItems={teamOrders?.length || 0}
                totalPages={teamPagination.totalPages}
                safePage={teamPagination.safePage}
                label="students"
              />
            </>
          )}
        </div>
      )}

      {section === "myTeam" && isHead && (
        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h5 className="text-warning mb-0" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase" }}>
              My Executives
            </h5>
            <button className="thm-btn" onClick={openAddExecutive}>
              <UserPlus size={14} className="me-1" style={ICON_STYLE} /> Add Executive
            </button>
          </div>
          {teamLoading || !teamReports ? (
            <p className="text-muted">Loading…</p>
          ) : teamReports.length === 0 ? (
            <p className="text-muted">No executives report to you yet.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th style={{ textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {teamReports.map((r) => (
                    <tr key={r._id}>
                      <td>{r.name || "—"}</td>
                      <td>{r.email}</td>
                      <td>{r.phone || "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        <button className="thm-btn secondary" style={{ padding: "4px 12px", fontSize: "0.75rem" }} onClick={() => openEditExecutive(r)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {section === "auditLog" && (
        <div className="admin-card">
          {auditEntries === null ? (
            <p className="text-muted">Loading…</p>
          ) : auditEntries.length === 0 ? (
            <p className="text-muted">No audit log entries yet.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditPagination.pageItems.map((entry) => (
                    <tr key={entry._id}>
                      <td style={{ whiteSpace: "nowrap" }}>{entry.createdAt ? new Date(entry.createdAt).toLocaleString("en-IN") : "—"}</td>
                      <td>{entry.actorId?.name || entry.actorId?.email || "—"}</td>
                      <td>{entry.action.replace(/_/g, " ")}</td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: 420 }}>
                        {entry.meta ? JSON.stringify(entry.meta) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <PaginationControls
            setPage={setAuditPage}
            perPage={auditPerPage}
            setPerPage={setAuditPerPage}
            totalItems={auditEntries?.length || 0}
            totalPages={auditPagination.totalPages}
            safePage={auditPagination.safePage}
            label="entries"
          />
        </div>
      )}

      {/* --- Enroll Student modal --- */}
      <AnimatePresence>
        {enrollModalOpen && selectedSlot && (
          <div className="admin-modal-overlay" style={{ display: "flex" }}>
            <motion.div
              className="admin-modal"
              style={{ maxWidth: 900, width: "95%", margin: "20px auto" }}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="admin-modal-header">
                <h3 className="admin-modal-title">
                  <UserPlus size={18} className="me-2" style={ICON_STYLE} /> Enroll Student — {selectedSlot.title}
                </h3>
                <button type="button" className="btn-close btn-close-white" onClick={closeEnrollModal}></button>
              </div>

              {enrollResult ? (
                <div style={{ padding: "10px 0" }}>
                  <p style={{ color: "#2ecc71", fontWeight: 600 }}>
                    <CheckCircle2 size={16} className="me-2" style={ICON_STYLE} /> Enrolled. Payment link generated:
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(255,255,255,0.03)", padding: 10, borderRadius: 6 }}>
                    <code style={{ flex: 1, wordBreak: "break-all", color: "#fff" }}>{enrollResult.paymentLink}</code>
                    <button className="thm-btn secondary" style={{ padding: "6px 14px" }} onClick={() => copyLink(enrollResult.paymentLink)}>
                      Copy
                    </button>
                  </div>
                  <div className="d-flex justify-content-end mt-4">
                    <button className="thm-btn" onClick={closeEnrollModal}>
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="admin-form-group">
                        <label className="admin-form-label">Student Name</label>
                        <input className="admin-input" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Full name" />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-form-label">Student Email</label>
                        <input
                          type="email"
                          className="admin-input"
                          value={studentEmail}
                          onChange={(e) => setStudentEmail(e.target.value)}
                          placeholder="student@example.com"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="admin-form-group">
                        <label className="admin-form-label">Initial Amount (₹)</label>
                        <input
                          type="number"
                          className="admin-input"
                          min={1}
                          value={initialAmount}
                          onChange={(e) => setInitialAmount(Number(e.target.value))}
                        />
                      </div>
                      <div className="row">
                        <div className="col-6">
                          <div className="admin-form-group">
                            <label className="admin-form-label">Number of Installments</label>
                            <input
                              type="number"
                              className="admin-input"
                              min={1}
                              value={numberOfInstallments}
                              onChange={(e) => setNumberOfInstallments(Number(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="admin-form-group">
                            <label className="admin-form-label">Final Due Date</label>
                            <input
                              type="date"
                              className="admin-input"
                              value={finalDueDate}
                              onChange={(e) => setFinalDueDate(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedSlot.isFullCourse && (
                    <div style={{ borderLeft: "3px solid var(--primary-gold)", paddingLeft: 15, marginBottom: 16 }}>
                      <label className="admin-form-label mb-2">
                        <BookOpen size={14} className="me-1" style={{ ...ICON_STYLE, color: "var(--primary-gold)" }} /> Choose Course / Modules
                      </label>
                      {[FULL_COURSE_MODULE, ...MODULES].map((m) => (
                        <div className="form-check mb-2" style={{ paddingLeft: "1.5em" }} key={m.id}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={`enroll_mod_${m.id}`}
                            checked={moduleChecks[m.id]}
                            disabled={m.id === "full_course" ? MODULES.some((mm) => moduleChecks[mm.id]) : moduleChecks.full_course}
                            onChange={(e) => toggleModule(m.id, e.target.checked)}
                          />
                          <label className="form-check-label text-white" style={{ fontSize: "0.85rem" }} htmlFor={`enroll_mod_${m.id}`}>
                            {m.label} (<span className="text-warning fw-bold">₹{getModulePrice(m.id, m.defaultPrice).toLocaleString("en-IN")}</span>)
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedSlot.isFullCourse && (
                    <div className="admin-form-group">
                      <label className="admin-form-label">Coupon Code (optional, Full Course only)</label>
                      <input
                        className="admin-input"
                        style={{ textTransform: "uppercase" }}
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="e.g. WELCOME10"
                      />
                    </div>
                  )}

                  <div className="d-flex justify-content-end mb-3">
                    <button className="thm-btn secondary" onClick={previewSchedule} disabled={isPreviewing}>
                      {isPreviewing ? "Calculating…" : "Preview Schedule"}
                    </button>
                  </div>

                  {finalPriceInclGST !== null && (
                    <div style={{ background: "rgba(255,255,255,0.03)", padding: 14, borderRadius: 6, marginBottom: 16 }}>
                      {appliedDiscount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.85rem" }}>
                          <span className="text-muted">Coupon ({appliedCoupon}) discount</span>
                          <strong style={{ color: "#2ecc71" }}>− ₹{appliedDiscount.toFixed(2)}</strong>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.85rem" }}>
                        <span className="text-muted">Total (incl. GST)</span>
                        <strong style={{ color: "#fff" }}>₹{finalPriceInclGST.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.85rem" }}>
                        <span className="text-muted">Initial payment (paid now — link generated on Enroll)</span>
                        <strong style={{ color: "var(--primary-gold)" }}>₹{initialAmount.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.85rem" }}>
                        <span className="text-muted">Remaining after initial payment</span>
                        <strong style={{ color: "#fff" }}>₹{(remaining ?? 0).toFixed(2)}</strong>
                      </div>
                      {installmentRows.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div className="sales-installment-row" style={{ fontWeight: 700, fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                            <span>#</span>
                            <span>Amount (₹)</span>
                            <span>Due Date</span>
                          </div>
                          {installmentRows.map((row) => (
                            <div className="sales-installment-row" key={row.seq}>
                              {/* row.seq is 2-based internally (seq 1 is the
                                  initial/registration payment, set on submit —
                                  see enrollStudent) — displayed as 1-based
                                  here since the registration amount isn't
                                  counted as "an installment" to the sales
                                  person filling this in. */}
                              <span style={{ color: "var(--text-muted)" }}>{row.seq - 1}</span>
                              <input
                                type="number"
                                className="admin-input"
                                value={row.amount}
                                onChange={(e) => updateRow(row.seq, "amount", e.target.value)}
                              />
                              <input
                                type="date"
                                className="admin-input"
                                value={toDateInputValue(row.dueDate)}
                                onChange={(e) => updateRow(row.seq, "dueDate", e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="d-flex justify-content-end gap-2 pt-3 border-top border-secondary">
                    <button type="button" className="thm-btn cancel-btn" onClick={closeEnrollModal}>
                      Cancel
                    </button>
                    <button type="button" className="thm-btn" onClick={submitEnroll} disabled={isEnrolling || finalPriceInclGST === null}>
                      {isEnrolling ? "Enrolling…" : "Enroll & Generate Link"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Add/Edit Executive modal --- */}
      <AnimatePresence>
        {teamAccountModalOpen && (
          <div className="admin-modal-overlay" style={{ display: "flex" }}>
            <motion.div
              className="admin-modal"
              style={{ maxWidth: 500, width: "95%", margin: "20px auto" }}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="admin-modal-header">
                <h3 className="admin-modal-title">
                  <UserPen size={18} className="me-2" style={ICON_STYLE} /> {teamAccountEditing ? "Edit Executive" : "Add Executive"}
                </h3>
                <button type="button" className="btn-close btn-close-white" onClick={() => setTeamAccountModalOpen(false)}></button>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Name</label>
                <input className="admin-input" value={taName} onChange={(e) => setTaName(e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Email</label>
                <input
                  type="email"
                  className="admin-input"
                  value={taEmail}
                  readOnly={!!teamAccountEditing}
                  disabled={!!teamAccountEditing}
                  style={teamAccountEditing ? { background: "#2b2b2b", borderColor: "#555", opacity: 0.8 } : undefined}
                  onChange={(e) => setTaEmail(e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Phone</label>
                <input className="admin-input" value={taPhone} onChange={(e) => setTaPhone(e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">{teamAccountEditing ? "Reset Password (optional)" : "Initial Password"}</label>
                <input
                  type="password"
                  className="admin-input"
                  value={taPassword}
                  onChange={(e) => setTaPassword(e.target.value)}
                  placeholder={teamAccountEditing ? "Leave blank to keep current password" : "Min 6 characters"}
                />
              </div>
              <div className="d-flex justify-content-end gap-2 pt-3 border-top border-secondary mt-2">
                <button type="button" className="thm-btn cancel-btn" onClick={() => setTeamAccountModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="thm-btn" onClick={submitTeamAccount} disabled={isSavingAccount}>
                  {isSavingAccount ? "Saving…" : "Save"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Payment Details modal: full installment breakdown + credentials fallback --- */}
      <AnimatePresence>
        {detailsOrder && detailsSummary && (
          <div className="admin-modal-overlay" style={{ display: "flex" }}>
            <motion.div
              className="admin-modal"
              style={{ maxWidth: 720, width: "95%", margin: "20px auto" }}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="admin-modal-header">
                <h3 className="admin-modal-title">
                  <Receipt size={18} className="me-2" style={ICON_STYLE} /> Payment Details
                </h3>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDetailsOrder(null)}></button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>{detailsOrder.userId?.name || "—"}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{detailsOrder.userId?.email}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                  {detailsOrder.slotId?.title} {detailsOrder.slotId?.batchNo ? `(#${detailsOrder.slotId.batchNo})` : ""}
                  {detailsOrder.selectedModules?.length ? ` — ${detailsOrder.selectedModules.join(", ")}` : ""}
                </div>
                {detailsOrder.couponCode && (
                  <div style={{ fontSize: "0.8rem", color: "#2ecc71", marginTop: 4 }}>
                    Coupon <strong>{detailsOrder.couponCode}</strong> applied — saved ₹{Number(detailsOrder.discount || 0).toFixed(2)}
                  </div>
                )}
              </div>

              <div className="row g-2" style={{ marginBottom: 16 }}>
                {[
                  ...(isExecutive ? [] : [{ label: "Total Amount", value: `₹${detailsSummary.total.toFixed(2)}`, color: "#fff" }]),
                  { label: "Paid So Far", value: `₹${detailsSummary.paid.toFixed(2)}`, color: "#2ecc71" },
                  { label: "Remaining", value: `₹${detailsSummary.remaining.toFixed(2)}`, color: detailsSummary.remaining > 0 ? "#f39c12" : "#2ecc71" },
                ].map((card) => (
                  <div className={isExecutive ? "col-6" : "col-4"} key={card.label}>
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #333", borderRadius: 6, padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                        {card.label}
                      </div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: card.color }}>{card.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="text-muted small">FULL INSTALLMENT SCHEDULE</span>
                {planStatusChip(detailsOrder)}
              </div>

              <div className="admin-table-container" style={{ marginBottom: 16 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Amount</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Paid On</th>
                      <th>Method</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsSummary.installments.map((inst) => (
                      <tr key={inst.seq}>
                        <td>{inst.seq}</td>
                        <td>₹{Number(inst.amount || 0).toFixed(2)}</td>
                        <td>{formatDate(inst.dueDate)}</td>
                        <td>{installmentStatusChip(inst.status)}</td>
                        <td>{inst.paidAt ? formatDate(inst.paidAt) : "—"}</td>
                        <td>
                          {inst.status === "paid" ? (
                            <div>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  color: inst.paymentMethod === "manual" ? "#9b59b6" : "#3498db",
                                  background: inst.paymentMethod === "manual" ? "rgba(155,89,182,0.15)" : "rgba(52,152,219,0.15)",
                                }}
                              >
                                {inst.paymentMethod === "manual" ? "MANUAL" : "RAZORPAY"}
                              </span>
                              {inst.paymentReference && (
                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }} title={inst.paymentReference}>
                                  {inst.paymentReference}
                                </div>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {inst.status !== "paid" && (
                            <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className="thm-btn secondary"
                                style={{ padding: "3px 8px", fontSize: "0.7rem" }}
                                disabled={busyOrderId === detailsOrder._id}
                                onClick={() => markPaidOffline(detailsOrder, inst.seq)}
                              >
                                Mark Paid
                              </button>
                              <button
                                type="button"
                                className="thm-btn secondary"
                                style={{ padding: "3px 8px", fontSize: "0.7rem" }}
                                disabled={busyOrderId === detailsOrder._id}
                                onClick={() => editInstallmentAmount(detailsOrder, inst)}
                              >
                                Edit Amount
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center pt-3 border-top border-secondary">
                <div>
                  {detailsOrder.status === "paid" && (
                    <button
                      className="thm-btn secondary"
                      style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                      disabled={busyOrderId === detailsOrder._id}
                      onClick={() => resetCredentials(detailsOrder)}
                    >
                      <Key size={14} className="me-1" style={ICON_STYLE} /> Reveal / Reset Login Credentials
                    </button>
                  )}
                </div>
                <button type="button" className="thm-btn secondary" style={{ padding: "6px 20px" }} onClick={() => setDetailsOrder(null)}>
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
