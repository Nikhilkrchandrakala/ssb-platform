"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  UserPlus,
  AlertTriangle,
  Database,
  FileText,
  Eye,
  IdCard,
  Receipt,
  Info,
  ExternalLink,
  Save,
  Plus,
  User,
  Trash2,
  ArrowRightLeft,
  type LucideIcon,
} from "lucide-react";
import SearchCombobox from "@/components/admin/SearchCombobox";
import { latestDistinctValues } from "@/lib/latestValues";
import { ENROLLMENT_MODE_OPTIONS, resolveEnrollmentMode } from "@/lib/enrollmentMode";
import EnrollmentModeBadge from "@/components/admin/EnrollmentModeBadge";
import "@/app/admin/styles/legacy-student-roster.css";

const ICON_STYLE = { verticalAlign: -2 };

/**
 * Candidate / Student Roster.
 * Ported from admin-ssbwithisv/StudentRoster.html + assets/js/student-roster.js.
 *
 * Legacy bugs found while porting (flagged, not silently changed):
 *  - The "Add New Candidate Trainee" modal (`addStudentModalOverlay`) and its
 *    `openAddStudentModal()` trigger existed fully wired in the legacy JS/API,
 *    but NOTHING in StudentRoster.html ever called `openAddStudentModal()` —
 *    no button anywhere referenced it. The feature was completely unreachable
 *    in the legacy UI. Added a header "Add Candidate" button here so the
 *    (otherwise fully functional) feature is actually usable.
 *  - `window.changeStudentStage` was defined in the legacy JS (an inline
 *    course-stage changer with its own toast/error handling) but the table
 *    render code only ever emitted static `<span>` badges for the course
 *    column, never a `<select>` wired to that handler — dead code, no
 *    interactive stage editor ever actually rendered. Ported the table as it
 *    actually behaved (static read-only course badges); no inline stage
 *    editor added.
 *  - The detail modal's course-badge renderer used CSS classes
 *    (`stage-screening`, `stage-conference`, `stage-psychology`,
 *    `stage-interview`, `stage-gto`) that are not defined in ANY legacy
 *    stylesheet (checked admin-global.css/admin-header.css and the page's own
 *    inline `<style>`) — those badges rendered with zero color/background in
 *    production. Fixed here by reusing the `stage-val-*` classes (which do
 *    have real styling for these exact 5 stages) for the modal badges too.
 */

interface AssessorRef {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  batch?: string;
  chestNo?: string;
  clinicalStage?: string;
  enrollmentMode?: string;
  createdAt: string;
  profileImage?: string;
  isManuallyCreated?: boolean;
  assignedGTO?: AssessorRef | null;
  assignedTO?: AssessorRef | null;
  assignedPsych?: AssessorRef | null;
  assignedIO?: AssessorRef | null;
  assignedAssessments?: string[];
  orders?: OrderItem[];
}

interface OrderItem {
  _id: string;
  orderId?: string;
  paymentId?: string;
  price?: number;
  createdAt: string;
  referralCode?: string;
  selectedModules?: string[];
  slotId?: { _id?: string; title?: string; batchNo?: string; mode?: string; isFullCourse?: boolean } | null;
  assignedGTO?: AssessorRef | null;
  assignedTO?: AssessorRef | null;
  assignedPsych?: AssessorRef | null;
  assignedIO?: AssessorRef | null;
  assignedAssessments?: string[];
}

// One row = one paid batch enrollment when the student has any, matching
// the Allotment page's presentation — repeats the candidate once per batch
// instead of collapsing to a single row whose columns only ever reflected
// their most recent purchase.
interface RosterRow {
  student: Student;
  order: OrderItem | null;
}

function stagesOfRow(order: OrderItem | null, clinicalStage?: string): string[] {
  if (order) {
    // Never fall back to the student's global clinicalStage here — that
    // field belongs to whichever order most recently set it, and would leak
    // one batch's course onto a DIFFERENT batch's row (e.g. an offline
    // registration, which never gets a course/module, showing whatever
    // course the student's other, online batch happens to be for).
    const modules = order.selectedModules || [];
    if (modules.length > 0) return modules;
    return order.slotId?.isFullCourse ? ["full_course"] : [];
  }
  return stagesOf(clinicalStage);
}

interface SubmissionItem {
  piqFiles?: string[];
  uploadedFiles?: string[];
}

interface DeletedUserLogItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  batch?: string;
  chestNo?: string;
  deletedByName?: string;
  createdAt: string;
  purged?: {
    orders: number;
    submissions: number;
    installmentPlans: number;
    notifications: number;
    salesAuditLogs: number;
    slotSeatsFreed: number;
  };
}

interface AddFormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  batch: string;
  chestNo: string;
  clinicalStage: string;
  enrollmentMode: string;
}

const ALL_MODULES = ["full_course", "ssb_ppdt", "psych", "interview", "group_testing"];

const STAGE_TITLES: Record<string, string> = {
  full_course: "Full Course",
  ssb_ppdt: "Intro & PPDT",
  psych: "Psychology",
  interview: "Interview",
  group_testing: "GTO Tasks",
};

const STAGE_CLASS: Record<string, string> = {
  full_course: "stage-val-full_course",
  ssb_ppdt: "stage-val-ssb_ppdt",
  psych: "stage-val-psych",
  interview: "stage-val-interview",
  group_testing: "stage-val-group_testing",
};

const MODULE_LABELS: Record<string, string> = {
  full_course: "Full 12-day SSB Hackathon",
  ssb_ppdt: "Intro to SSB & PPDT (Screening)",
  psych: "Psychology Prep Program",
  interview: "Interview & Mock Course",
  group_testing: "GTO Course on VTX",
};

const EMPTY_ADD_FORM: AddFormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  batch: "",
  chestNo: "",
  clinicalStage: "full_course",
  enrollmentMode: "online",
};

const ITEMS_PER_PAGE = 10;

function getInitials(name?: string) {
  if (!name) return "ST";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function stagesOf(clinicalStage?: string) {
  return (clinicalStage || "full_course")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function StudentRosterView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [brokenAvatars, setBrokenAvatars] = useState<Set<string>>(new Set());

  // Detail / edit modal state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [detailOrders, setDetailOrders] = useState<OrderItem[]>([]);
  const [detailSubmissions, setDetailSubmissions] = useState<SubmissionItem[]>([]);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBatch, setEditBatch] = useState("");
  const [editChestNo, setEditChestNo] = useState("");
  const [editModules, setEditModules] = useState<string[]>([]);
  const [editEnrollmentMode, setEditEnrollmentMode] = useState("online");
  const [savingProfile, setSavingProfile] = useState(false);

  // Shift Batch Modal State
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftOrderId, setShiftOrderId] = useState("");
  const [shiftCandidateName, setShiftCandidateName] = useState("");
  const [shiftCurrentBatch, setShiftCurrentBatch] = useState("");
  const [shiftCurrentSlotId, setShiftCurrentSlotId] = useState("");
  const [shiftSelectedSlotId, setShiftSelectedSlotId] = useState("");
  const [shiftAllowOvercapacity, setShiftAllowOvercapacity] = useState(false);
  const [shiftNotify, setShiftNotify] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [savingShift, setSavingShift] = useState(false);

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>(EMPTY_ADD_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Recent Deletes modal state — DELETE /api/admin/students/[id] now purges
  // the account plus every record that referenced it, so this log (backed by
  // DeletedUserLog) is the only place left to see who was removed and when.
  const [isDeletedLogOpen, setIsDeletedLogOpen] = useState(false);
  const [deletedLogLoading, setDeletedLogLoading] = useState(false);
  const [deletedLog, setDeletedLog] = useState<DeletedUserLogItem[]>([]);

  const openDeletedLog = () => {
    setIsDeletedLogOpen(true);
    setDeletedLogLoading(true);
    fetch("/api/admin/deleted-users")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to fetch deletion log"))))
      .then((data) => setDeletedLog(data.logs || []))
      .catch(() => setDeletedLog([]))
      .finally(() => setDeletedLogLoading(false));
  };
  const closeDeletedLog = () => setIsDeletedLogOpen(false);

  const loadStudents = () => {
    setLoading(true);
    setLoadError(null);
    fetch("/api/admin/students")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch candidate profiles");
        return res.json();
      })
      .then((data) => {
        setStudents(data.students || []);
        setCurrentPage(1);
      })
      .catch((error) => {
        console.error("Load Students Error:", error);
        setLoadError(error instanceof Error ? error.message : "Failed to load candidates");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/students")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch candidate profiles");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setStudents(data.students || []);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Load Students Error:", error);
        setLoadError(error instanceof Error ? error.message : "Failed to load candidates");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const batches = useMemo(() => {
    const vals = new Set<string>();
    for (const s of students) {
      if (s.orders && s.orders.length > 0) {
        for (const o of s.orders) if (o.slotId?.batchNo) vals.add(o.slotId.batchNo);
      } else if (s.batch) {
        vals.add(s.batch);
      }
    }
    return [...vals].sort();
  }, [students]);

  const rosterRows = useMemo<RosterRow[]>(
    () =>
      students.flatMap((s): RosterRow[] =>
        s.orders && s.orders.length > 0 ? s.orders.map((o) => ({ student: s, order: o })) : [{ student: s, order: null }]
      ),
    [students]
  );

  const studentNameOptions = useMemo(
    () => latestDistinctValues(students, (s) => s.name, (s) => s.createdAt),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase().trim();
    return rosterRows.filter(({ student: s, order: o }) => {
      const matchesSearch =
        !query ||
        s.name?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        (s.phone && s.phone.toLowerCase().includes(query));
      const matchesStage = stageFilter === "all" || s.clinicalStage === stageFilter;
      const matchesBatch = batchFilter === "all" || (o?.slotId?.batchNo || s.batch) === batchFilter;
      const matchesMode = modeFilter === "all" || resolveEnrollmentMode(o?.slotId?.mode || s.enrollmentMode) === modeFilter;
      return matchesSearch && matchesStage && matchesBatch && matchesMode;
    });
  }, [rosterRows, search, stageFilter, batchFilter, modeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));
  const pageSafe = Math.min(currentPage, totalPages);
  const pageSlice = filteredStudents.slice((pageSafe - 1) * ITEMS_PER_PAGE, pageSafe * ITEMS_PER_PAGE);

  const resetToPageOne = () => setCurrentPage(1);

  const openDetailModal = async (id: string) => {
    setDetailLoading(true);
    window.Swal?.fire({
      title: "Loading Profile Details...",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    try {
      const response = await fetch(`/api/admin/students/${id}`);
      if (!response.ok) throw new Error("Failed to load details from server");
      const result = await response.json();
      const { student, orders, submissions } = result;

      window.Swal?.close();

      setDetailStudent(student);
      setDetailOrders(orders || []);
      setDetailSubmissions(submissions || []);
      setEditName(student.name || "");
      setEditEmail(student.email || "");
      setEditPhone(student.phone || "");
      setEditBatch(student.batch || "");
      setEditChestNo(student.chestNo || "");
      setEditModules(stagesOf(student.clinicalStage));
      setEditEnrollmentMode(resolveEnrollmentMode(student.enrollmentMode));
      setIsDetailOpen(true);
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Failed to Fetch Details",
        text: error instanceof Error ? error.message : "Failed to load details",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setIsDetailOpen(false);
    setDetailStudent(null);
  };

  const toggleModule = (mod: string) => {
    setEditModules((prev) => {
      if (mod === "full_course") {
        return prev.includes("full_course") ? [] : ["full_course"];
      }
      const withoutFull = prev.filter((m) => m !== "full_course");
      if (withoutFull.includes(mod)) return withoutFull.filter((m) => m !== mod);
      return [...withoutFull, mod];
    });
  };

  const fullCourseDisabled = editModules.some((m) => m !== "full_course");
  const otherModulesDisabled = editModules.includes("full_course");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailStudent) return;

    const clinicalStage = editModules.length > 0 ? editModules.join(",") : "full_course";

    window.Swal?.fire({
      title: "Saving Credentials...",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    setSavingProfile(true);
    try {
      const response = await fetch(`/api/admin/students/${detailStudent._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          batch: editBatch.trim(),
          clinicalStage,
          chestNo: editChestNo.trim(),
          enrollmentMode: editEnrollmentMode,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update profile");

      window.Swal?.fire({
        icon: "success",
        title: "Profile Saved!",
        text: "Candidate profile credentials updated successfully.",
        background: "#1a1a1a",
        color: "#fff",
        timer: 1500,
        showConfirmButton: false,
      });

      closeDetailModal();
      loadStudents();
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Save Failed",
        text: error instanceof Error ? error.message : "Failed to update profile",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    window.Swal?.fire({
      title: "Are you sure?",
      text: `${name}'s candidate record and account will be removed permanently.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff6b6b",
      cancelButtonColor: "rgba(255,255,255,0.1)",
      confirmButtonText: "Yes, delete it!",
      background: "#1a1a1a",
      color: "#fff",
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        const response = await fetch(`/api/admin/students/${id}`, { method: "DELETE" });
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || "Delete failed");
        window.Swal?.fire({ icon: "success", title: "Deleted", background: "#1a1a1a", color: "#fff", timer: 1500, showConfirmButton: false });
        loadStudents();
      } catch (error) {
        window.Swal?.fire({ icon: "error", title: "Error", text: error instanceof Error ? error.message : "Delete failed", background: "#1a1a1a", color: "#fff" });
      }
    });
  };

  const openAddModal = () => {
    setAddForm(EMPTY_ADD_FORM);
    setIsAddOpen(true);
  };

  const closeAddModal = () => setIsAddOpen(false);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    window.Swal?.fire({
      title: "Creating Trainee Account...",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    setAddSubmitting(true);
    try {
      const response = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          phone: addForm.phone.trim(),
          password: addForm.password,
          batch: addForm.batch.trim(),
          clinicalStage: addForm.clinicalStage,
          chestNo: addForm.chestNo.trim(),
          enrollmentMode: addForm.enrollmentMode,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create candidate trainee");

      window.Swal?.fire({
        icon: "success",
        title: "Candidate Added!",
        text: "The trainee record has been saved successfully in the database.",
        background: "#1a1a1a",
        color: "#fff",
        timer: 2000,
        showConfirmButton: false,
      });

      closeAddModal();
      loadStudents();
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Creation Failed",
        text: error instanceof Error ? error.message : "Failed to create candidate trainee",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    } finally {
      setAddSubmitting(false);
    }
  };

  const openShiftModal = (order: OrderItem, candidateName: string) => {
    setShiftOrderId(order._id);
    setShiftCandidateName(candidateName);
    const batchLabel = order.slotId?.batchNo ? `Batch #${order.slotId.batchNo}` : order.slotId?.title || "Unknown";
    setShiftCurrentBatch(batchLabel);
    setShiftCurrentSlotId(order.slotId?._id || "");
    setShiftSelectedSlotId("");
    setShiftAllowOvercapacity(false);
    setShiftNotify(true);

    fetch("/api/allSlots")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailableSlots(data);
          const currentSlotIdStr = order.slotId?._id || "";
          const firstOther = data.find((s) => s._id !== currentSlotIdStr);
          if (firstOther) setShiftSelectedSlotId(firstOther._id);
        }
      })
      .catch(() => {});

    setShiftModalOpen(true);
  };

  const submitShiftBatch = async () => {
    if (!shiftOrderId || !shiftSelectedSlotId) {
      window.Swal?.fire({ icon: "warning", text: "Please select a destination batch.", background: "#1a1a1a", color: "#fff" });
      return;
    }

    setSavingShift(true);
    window.Swal?.fire({
      title: "Shifting Batch...",
      text: "Transferring candidate and synchronizing schedule.",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    try {
      const res = await fetch(`/api/admin/orders/${shiftOrderId}/shift-batch`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSlotId: shiftSelectedSlotId,
          allowOvercapacity: shiftAllowOvercapacity,
          notifyStudent: shiftNotify,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to shift student");

      window.Swal?.fire({
        icon: "success",
        title: "Batch Shifted!",
        text: data.message,
        background: "#1a1a1a",
        color: "#fff",
      });
      setShiftModalOpen(false);
      loadStudents();
      if (detailStudent) {
        openDetailModal(detailStudent._id);
      }
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Shift Failed",
        text: err instanceof Error ? err.message : "Error",
        background: "#1a1a1a",
        color: "#fff",
      });
    } finally {
      setSavingShift(false);
    }
  };

  const renderAvatar = (id: string, profileImage: string | undefined, name: string, size = 40) => {
    const initials = getInitials(name);
    if (profileImage && !brokenAvatars.has(id)) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profileImage}
          alt={name}
          className="avatar-circle"
          style={{ width: size, height: size, fontSize: size > 50 ? "1.35rem" : undefined }}
          onError={() => setBrokenAvatars((prev) => new Set(prev).add(id))}
        />
      );
    }
    return (
      <div className="avatar-circle" style={{ width: size, height: size, fontSize: size > 50 ? "1.35rem" : undefined }}>
        {initials}
      </div>
    );
  };

  const renderAssessorMiniLabel = (assessor: AssessorRef | null | undefined, label: string) => {
    if (!assessor) return null;
    return (
      <span className="mini-badge" style={{ fontSize: "0.7rem", marginRight: 4 }} key={label}>
        <span>{label}:</span> {assessor.name.split(" ")[0]}
      </span>
    );
  };

  // Purchase & payment details for the currently open detail modal.
  const purchaseDetails = useMemo(() => {
    if (!detailOrders || detailOrders.length === 0) {
      if (detailStudent?.isManuallyCreated) {
        return { manual: true } as const;
      }
      return { none: true } as const;
    }
    const latest = detailOrders[0];
    let method = "Razorpay";
    let badgeClass = "bg-primary text-light";
    let detailsText = "";
    if (latest.referralCode && latest.referralCode.trim() !== "") {
      method = "Franchise";
      badgeClass = "bg-warning text-dark";
      detailsText = `Referral Code: ${latest.referralCode}`;
    } else if (!latest.orderId && !latest.paymentId) {
      method = "Manual";
      badgeClass = "bg-secondary text-light";
      detailsText = "Booked manually by Admin";
    } else {
      detailsText = `Razorpay ID: ${latest.paymentId || latest.orderId || "N/A"}`;
    }
    return { method, badgeClass, detailsText, latest } as const;
  }, [detailOrders, detailStudent]);

  const documentLinks = useMemo(() => {
    const links: { icon: LucideIcon; iconColor: string; label: string; url: string }[] = [];
    if (detailStudent?.profileImage) {
      links.push({ icon: User, iconColor: "text-warning", label: "Profile Picture", url: detailStudent.profileImage });
    }
    (detailSubmissions || []).forEach((sub, subIdx) => {
      (sub.piqFiles || []).forEach((file, idx) => {
        links.push({ icon: FileText, iconColor: "text-danger", label: `PIQ Document #${idx + 1} (Sub #${subIdx + 1})`, url: file });
      });
      (sub.uploadedFiles || []).forEach((file, idx) => {
        links.push({ icon: FileText, iconColor: "text-info", label: `Answer Sheet #${idx + 1} (Sub #${subIdx + 1})`, url: file });
      });
    });
    return links;
  }, [detailStudent, detailSubmissions]);

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <GraduationCap size={20} className="me-2" style={ICON_STYLE} /> Candidates Management
          </h1>
          <p className="text-muted mb-0">View and manage trainees assigned to batches, their transactions, and documents</p>
        </div>
        <div className="d-flex gap-2">
          <button className="thm-btn cancel-btn" onClick={openDeletedLog}>
            <Trash2 size={16} style={ICON_STYLE} /> Recent Deletes
          </button>
          <button className="thm-btn" onClick={openAddModal}>
            <UserPlus size={16} style={ICON_STYLE} /> Add Candidate
          </button>
        </div>
      </div>

      <div className="admin-card">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <SearchCombobox
            options={studentNameOptions}
            placeholder="Search candidates by name, email, phone..."
            value={search}
            onChange={(v) => {
              setSearch(v);
              resetToPageOne();
            }}
          />
          <div className="d-flex gap-3 align-items-center flex-wrap">
            <div className="d-flex gap-2 align-items-center">
              <span className="text-muted small">BATCH FILTER:</span>
              <select
                className="admin-input"
                style={{ width: 160, padding: "8px 15px" }}
                value={batchFilter}
                onChange={(e) => {
                  setBatchFilter(e.target.value);
                  resetToPageOne();
                }}
              >
                <option value="all">All Batches</option>
                {batches.map((b) => (
                  <option key={b} value={b}>
                    Batch {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <span className="text-muted small">COURSE FILTER:</span>
              <select
                className="admin-input"
                style={{ width: 220, padding: "8px 15px" }}
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value);
                  resetToPageOne();
                }}
              >
                <option value="all">All Courses</option>
                {ALL_MODULES.map((mod) => (
                  <option key={mod} value={mod}>
                    {MODULE_LABELS[mod]}
                  </option>
                ))}
              </select>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <span className="text-muted small">TYPE FILTER:</span>
              <select
                className="admin-input"
                style={{ width: 160, padding: "8px 15px" }}
                value={modeFilter}
                onChange={(e) => {
                  setModeFilter(e.target.value);
                  resetToPageOne();
                }}
              >
                <option value="all">All Types</option>
                {ENROLLMENT_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table" id="studentTable">
            <thead>
              <tr>
                <th>Candidate Trainee</th>
                <th>Phone Contact</th>
                <th>Batch</th>
                <th>Chest No</th>
                <th>Type</th>
                <th>Registration Date</th>
                <th style={{ width: 220 }}>Course</th>
                <th>Assigned Assessments</th>
                <th>Assigned Officer Allotments</th>
                <th style={{ width: 100, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center p-5">
                    <div className="spinner-border text-warning" role="status"></div>
                    <p className="mt-3 mb-0 opacity-70">Fetching unified candidate records from database...</p>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={10} className="text-center p-5 text-danger">
                    <AlertTriangle size={32} className="mb-3" />
                    <p className="mb-0">Error loading database: {loadError}</p>
                  </td>
                </tr>
              ) : pageSlice.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center p-5 opacity-50">
                    <Database size={32} className="mb-3" />
                    <p className="mb-0">No candidate records found.</p>
                  </td>
                </tr>
              ) : (
                pageSlice.map(({ student: s, order: o }) => {
                  const stages = stagesOfRow(o, s.clinicalStage);
                  const rowGTO = o ? o.assignedGTO : s.assignedGTO;
                  const rowTO = o ? o.assignedTO : s.assignedTO;
                  const rowPsych = o ? o.assignedPsych : s.assignedPsych;
                  const rowIO = o ? o.assignedIO : s.assignedIO;
                  const assessorBadges = [
                    renderAssessorMiniLabel(rowGTO, "GTO"),
                    renderAssessorMiniLabel(rowTO, "TO"),
                    renderAssessorMiniLabel(rowPsych, "Psych"),
                    renderAssessorMiniLabel(rowIO, "IO"),
                  ].filter(Boolean);
                  const assignedAssessmentsCount = (o ? o.assignedAssessments : s.assignedAssessments)?.length || 0;

                  return (
                    <tr key={o ? o._id : s._id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          {renderAvatar(s._id, s.profileImage, s.name)}
                          <div>
                            <strong style={{ color: "#fff", fontSize: "0.95rem" }}>{s.name}</strong>
                            <br />
                            <span className="small opacity-50">{s.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code>{s.phone || "N/A"}</code>
                      </td>
                      <td>
                        <span className="badge bg-dark border border-secondary text-light px-2 py-1 small" style={{ fontFamily: "monospace" }}>
                          {o?.slotId?.batchNo || s.batch || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-warning border border-warning text-dark px-2 py-1 small" style={{ fontFamily: "monospace", fontWeight: 700 }}>
                          {s.chestNo || "—"}
                        </span>
                      </td>
                      <td>
                        <EnrollmentModeBadge mode={o?.slotId?.mode || s.enrollmentMode} />
                      </td>
                      <td>
                        <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>{formatDate(o?.createdAt || s.createdAt)}</span>
                      </td>
                      <td>
                        {stages.map((st) => (
                          <span
                            key={st}
                            className={`stage-select-inline ${STAGE_CLASS[st] || "stage-val-full_course"}`}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 50,
                              fontSize: 10,
                              display: "inline-block",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              cursor: "default",
                              marginRight: 4,
                              marginBottom: 4,
                            }}
                          >
                            {STAGE_TITLES[st] || st}
                          </span>
                        ))}
                      </td>
                      <td>
                        {assignedAssessmentsCount === 0 ? (
                          <span className="text-muted small">None assigned</span>
                        ) : (
                          <div className="d-flex flex-wrap gap-1">
                            <span
                              className="badge"
                              style={{
                                background: "rgba(224, 194, 20, 0.1)",
                                border: "1px solid rgba(224, 194, 20, 0.2)",
                                color: "var(--primary-gold)",
                                padding: "4px 8px",
                                borderRadius: 4,
                                fontSize: "0.72rem",
                                fontWeight: 500,
                              }}
                            >
                              <FileText size={12} className="me-1" style={ICON_STYLE} /> {assignedAssessmentsCount} Assigned
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        {assessorBadges.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">{assessorBadges}</div>
                        ) : (
                          <span className="text-muted small">No allotments configured</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className="d-flex gap-2 justify-content-center">
                          {o && (
                            <button
                              className="action-btn"
                              style={{ color: "#e67e22", borderColor: "rgba(230, 126, 34, 0.3)" }}
                              title="Shift Batch"
                              onClick={() => openShiftModal(o, s.name)}
                            >
                              <ArrowRightLeft size={14} />
                            </button>
                          )}
                          <button className="action-btn" title="View Full Profile" onClick={() => openDetailModal(s._id)} disabled={detailLoading}>
                            <Eye size={14} />
                          </button>
                          <button className="action-btn delete-btn" title="Delete" onClick={() => handleDelete(s._id, s.name)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && !loadError && filteredStudents.length > 0 && (
          <div className="d-flex justify-content-between align-items-center mt-3 px-2 pb-2">
            <span className="text-muted small" style={{ fontWeight: 500 }}>
              Showing {(pageSafe - 1) * ITEMS_PER_PAGE + 1} to {Math.min(pageSafe * ITEMS_PER_PAGE, filteredStudents.length)} of {filteredStudents.length} entries
            </span>
            <nav aria-label="Page navigation">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${pageSafe === 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                    &laquo; Prev
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === pageSafe ? "active" : ""}`}>
                    <button className="page-link" onClick={() => setCurrentPage(p)}>
                      {p}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${pageSafe === totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                    Next &raquo;
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Trainee Details & Order History Modal */}
      {isDetailOpen && detailStudent && (
        <div className="admin-modal-overlay" style={{ display: "flex" }}>
          <div className="admin-modal" style={{ maxWidth: 1200, width: "95%", margin: "20px auto" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                <IdCard size={18} className="me-2" style={ICON_STYLE} /> Complete Candidate Details
              </h3>
              <button type="button" className="btn-close btn-close-white" onClick={closeDetailModal}></button>
            </div>

            <div className="row">
              {/* Left Column: Trainee Bio */}
              <div className="col-md-4 border-end border-secondary pe-4">
                <h5 className="text-warning mb-3" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Trainee Credentials
                </h5>

                <form id="editProfileForm" onSubmit={handleSaveProfile}>
                  <div className="d-flex align-items-center gap-3 mb-4">
                    {renderAvatar(detailStudent._id, detailStudent.profileImage, detailStudent.name, 60)}
                    <div className="w-100">
                      <label className="admin-form-label mb-0" style={{ fontSize: "0.7rem" }}>
                        Name
                      </label>
                      <input
                        type="text"
                        className="admin-input py-1 px-2 mb-1"
                        style={{ fontSize: "0.95rem", fontWeight: 700 }}
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {stagesOf(detailStudent.clinicalStage).map((st) => (
                          <span key={st} className={`badge stage-select-inline ${STAGE_CLASS[st] || "stage-val-full_course"}`}>
                            {STAGE_TITLES[st] || st}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="admin-form-label">Email ID</label>
                    <input type="email" className="admin-input" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                  </div>

                  <div className="mb-3">
                    <label className="admin-form-label">Phone Contact</label>
                    <input type="text" className="admin-input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                  </div>

                  <div className="row mb-3">
                    <div className="col-6">
                      <label className="admin-form-label">Batch Info</label>
                      <input type="text" className="admin-input" placeholder="e.g. B2405" value={editBatch} onChange={(e) => setEditBatch(e.target.value)} />
                    </div>
                    <div className="col-6">
                      <label className="admin-form-label">Chest No.</label>
                      <input type="text" className="admin-input" placeholder="e.g. 12" value={editChestNo} onChange={(e) => setEditChestNo(e.target.value)} />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="admin-form-label">Type</label>
                    <select className="admin-input" value={editEnrollmentMode} onChange={(e) => setEditEnrollmentMode(e.target.value)}>
                      {ENROLLMENT_MODE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="admin-form-label d-block mb-2">Assigned Course Modules</label>
                    <div
                      className="d-flex flex-column gap-2"
                      style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 8, padding: 12 }}
                    >
                      {ALL_MODULES.map((mod) => (
                        <div className="form-check" key={mod}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`mod_${mod}`}
                            checked={editModules.includes(mod)}
                            disabled={mod === "full_course" ? fullCourseDisabled : otherModulesDisabled}
                            onChange={() => toggleModule(mod)}
                          />
                          <label className="form-check-label text-white small" htmlFor={`mod_${mod}`}>
                            {MODULE_LABELS[mod]}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
              </div>

              {/* Right Column: Courses and Evaluators Grid */}
              <div className="col-md-8 ps-4">
                <div className="row h-100">
                  <div className="col-md-7 border-end border-secondary pe-4 d-flex flex-column" style={{ minHeight: 480 }}>
                    <h5 className="text-warning mb-3" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Registered Courses & Batches
                    </h5>
                    <div style={{ maxHeight: 180, overflowY: "auto", paddingRight: 5, marginBottom: 20 }}>
                      {detailOrders.length === 0 ? (
                        <div className="text-center p-5 opacity-40">
                          <Receipt size={32} className="mb-2" />
                          <p className="small mb-0">No paid courses or batch slots found for this candidate</p>
                        </div>
                      ) : (
                        <div className="course-card-list">
                          {detailOrders.map((o) => {
                            const orderAssessorBadges = [
                              renderAssessorMiniLabel(o.assignedGTO, "GTO"),
                              renderAssessorMiniLabel(o.assignedTO, "TO"),
                              renderAssessorMiniLabel(o.assignedPsych, "Psych"),
                              renderAssessorMiniLabel(o.assignedIO, "IO"),
                            ].filter(Boolean);
                            return (
                            <div className="course-item-card" key={o._id}>
                              <div className="course-item-left">
                                <h6 className="d-flex align-items-center gap-2 flex-wrap">
                                  {o.slotId?.title || "Purchased Course Registration"}
                                  <EnrollmentModeBadge mode={o.slotId?.mode} />
                                </h6>
                                <p>
                                  <code style={{ color: "var(--primary-gold)" }}>#{(o.orderId || o._id).substring(0, 10)}</code> &nbsp;|&nbsp;{" "}
                                  {o.slotId?.batchNo ? `Batch #${o.slotId.batchNo}` : "Course Module"}
                                </p>
                                {orderAssessorBadges.length > 0 ? (
                                  <div className="d-flex flex-wrap gap-1 mt-1">{orderAssessorBadges}</div>
                                ) : (
                                  <span className="text-muted small">No allotments configured for this batch</span>
                                )}
                              </div>
                              <div className="course-item-right d-flex flex-column align-items-end">
                                <div className="price">₹{(o.price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                                <div className="date">{formatDate(o.createdAt)}</div>
                                {o.slotId && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-warning mt-2 d-inline-flex align-items-center gap-1"
                                    style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                                    onClick={() => openShiftModal(o, detailStudent?.name || "Candidate")}
                                  >
                                    <ArrowRightLeft size={12} /> Shift Batch
                                  </button>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Purchase & Payment Details */}
                    <div className="mt-3">
                      <h5 className="text-warning mb-2" style={{ fontSize: "0.95rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Purchase & Payment Details
                      </h5>
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                          borderRadius: 8,
                          padding: 12,
                          fontSize: "0.85rem",
                          lineHeight: 1.5,
                          color: "#ccc",
                        }}
                      >
                        {"none" in purchaseDetails ? (
                          <>
                            <div className="mb-1">
                              <strong>Method:</strong> Unknown
                            </div>
                            <div className="text-muted small">No payment orders found for this candidate.</div>
                          </>
                        ) : "manual" in purchaseDetails ? (
                          <>
                            <div className="mb-1">
                              <strong>Method:</strong> <span className="badge bg-secondary text-light">MANUAL</span>
                            </div>
                            <div className="mb-1">
                              <strong>Details:</strong> Trainee created manually by Admin
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="mb-2">
                              <strong>Purchase Method:</strong> <span className={`badge ${purchaseDetails.badgeClass}`}>{purchaseDetails.method}</span>
                            </div>
                            <div className="mb-2">
                              <strong>Payment Reference:</strong> {purchaseDetails.detailsText}
                            </div>
                            <div className="mb-2">
                              <strong>Amount Paid:</strong>{" "}
                              <strong className="text-success">₹{(purchaseDetails.latest.price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                            </div>
                            <div className="mb-0">
                              <strong>Transaction Date:</strong>{" "}
                              {new Date(purchaseDetails.latest.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Uploaded Documents & Images */}
                    <div className="mt-3 mb-3">
                      <h5 className="text-warning mb-2" style={{ fontSize: "0.95rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Uploaded Documents & Images
                      </h5>
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                          borderRadius: 8,
                          padding: 12,
                          fontSize: "0.85rem",
                          color: "#ccc",
                        }}
                      >
                        {documentLinks.length === 0 ? (
                          <div className="text-muted text-center py-2">
                            <Info size={14} className="me-1" style={ICON_STYLE} /> No documents uploaded yet.
                          </div>
                        ) : (
                          documentLinks.map((doc, idx) => (
                            <div
                              className="d-flex align-items-center justify-content-between mb-2 p-2"
                              style={{ background: "rgba(255,255,255,0.02)", borderRadius: 6 }}
                              key={idx}
                            >
                              <span>
                                <doc.icon size={14} className={`me-2 ${doc.iconColor}`} style={ICON_STYLE} /> {doc.label}
                              </span>
                              <a href={doc.url} target="_blank" rel="noreferrer" className="badge bg-dark border border-secondary text-light text-decoration-none">
                                <ExternalLink size={12} style={ICON_STYLE} /> View
                              </a>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Allotted Evaluators Column */}
                  <div className="col-md-5 ps-4 d-flex flex-column justify-content-between" style={{ minHeight: 480 }}>
                    <div>
                      <h5 className="text-warning mb-3" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Allotted Evaluators
                      </h5>
                      <div className="text-muted small" style={{ lineHeight: 1.6 }}>
                        <Info size={14} className="me-1" style={ICON_STYLE} /> Assessors are now allotted per batch — see each
                        registered batch card on the left for its own GTO/TO/Psych/IO allotment, or use the Allotment page to
                        change them.
                      </div>
                    </div>
                    <div>
                      <button type="submit" form="editProfileForm" className="thm-btn py-2 w-100" disabled={savingProfile}>
                        <Save size={14} className="me-2" style={ICON_STYLE} /> {savingProfile ? "Saving..." : "Save Profile"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddOpen && (
        <div className="admin-modal-overlay" style={{ display: "flex" }}>
          <div className="admin-modal" style={{ maxWidth: 500, width: "95%", margin: "20px auto" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                <UserPlus size={18} className="me-2" style={ICON_STYLE} /> Add New Candidate Trainee
              </h3>
              <button type="button" className="btn-close btn-close-white" onClick={closeAddModal}></button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="mb-3">
                <label className="admin-form-label">Full Name</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. Rahul Sharma"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label className="admin-form-label">Email Address</label>
                <input
                  type="email"
                  className="admin-input"
                  placeholder="e.g. rahul@example.com"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label className="admin-form-label">Phone Number</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. 9876543210"
                  required
                  value={addForm.phone}
                  onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label className="admin-form-label">Account Password</label>
                <input
                  type="password"
                  className="admin-input"
                  placeholder="Set initial password..."
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div className="row mb-3">
                <div className="col-4">
                  <label className="admin-form-label">Batch No.</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. B2405"
                    value={addForm.batch}
                    onChange={(e) => setAddForm((f) => ({ ...f, batch: e.target.value }))}
                  />
                </div>
                <div className="col-4">
                  <label className="admin-form-label">Chest No.</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. 12"
                    value={addForm.chestNo}
                    onChange={(e) => setAddForm((f) => ({ ...f, chestNo: e.target.value }))}
                  />
                </div>
                <div className="col-4">
                  <label className="admin-form-label">Course</label>
                  <select
                    className="admin-input"
                    value={addForm.clinicalStage}
                    onChange={(e) => setAddForm((f) => ({ ...f, clinicalStage: e.target.value }))}
                  >
                    {ALL_MODULES.map((mod) => (
                      <option key={mod} value={mod}>
                        {MODULE_LABELS[mod]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="admin-form-label">Type</label>
                <select
                  className="admin-input"
                  required
                  value={addForm.enrollmentMode}
                  onChange={(e) => setAddForm((f) => ({ ...f, enrollmentMode: e.target.value }))}
                >
                  {ENROLLMENT_MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary">
                <button type="button" className="thm-btn cancel-btn py-2 px-4" onClick={closeAddModal}>
                  Cancel
                </button>
                <button type="submit" className="thm-btn py-2 px-4" disabled={addSubmitting}>
                  <Plus size={14} className="me-1" style={ICON_STYLE} /> {addSubmitting ? "Adding..." : "Add Candidate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeletedLogOpen && (
        <div
          className="admin-modal-overlay"
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", zIndex: 1050, overflowY: "auto", padding: "40px 10px" }}
        >
          <div className="admin-modal" style={{ maxWidth: 900, width: "95%", background: "var(--surface-dark)", border: "var(--border-gold)", borderRadius: "var(--radius-md)", padding: 25, color: "var(--text-white)", margin: "auto" }}>
            <div className="admin-modal-header d-flex justify-content-between align-items-center mb-4" style={{ borderBottom: "1px solid rgba(224,194,20,0.1)", paddingBottom: 15 }}>
              <h3 className="admin-modal-title" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--primary-gold)", margin: 0 }}>
                <Trash2 size={18} className="me-2" style={ICON_STYLE} /> Recent Deletes
              </h3>
              <button type="button" className="btn-close btn-close-white" onClick={closeDeletedLog}></button>
            </div>

            <p className="text-muted small mb-3">
              Deleting a candidate permanently removes their account and every order, submission, installment plan,
              and notification tied to it. This log is the only remaining record of who was deleted, when, and how
              much it touched.
            </p>

            {deletedLogLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-warning" role="status"></div>
              </div>
            ) : deletedLog.length === 0 ? (
              <div className="text-center py-5 opacity-50">
                <Database size={32} className="mb-3" />
                <p className="mb-0">No candidates have been deleted yet.</p>
              </div>
            ) : (
              <div className="admin-table-container" style={{ maxHeight: 500, overflowY: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Role</th>
                      <th>Deleted By</th>
                      <th>Deleted At</th>
                      <th>Records Purged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedLog.map((log) => {
                      const p = log.purged;
                      const purgedParts = p
                        ? [
                            p.orders ? `${p.orders} order(s)` : null,
                            p.submissions ? `${p.submissions} submission(s)` : null,
                            p.installmentPlans ? `${p.installmentPlans} plan(s)` : null,
                            p.notifications ? `${p.notifications} notification(s)` : null,
                            p.salesAuditLogs ? `${p.salesAuditLogs} audit log(s)` : null,
                            p.slotSeatsFreed ? `${p.slotSeatsFreed} seat(s) freed` : null,
                          ].filter(Boolean)
                        : [];
                      return (
                        <tr key={log._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{log.name}</div>
                            <div className="small opacity-50">{log.email}</div>
                          </td>
                          <td>
                            <span className="badge bg-secondary text-uppercase" style={{ fontSize: "0.7rem" }}>
                              {log.role || "unknown"}
                            </span>
                          </td>
                          <td>{log.deletedByName || "—"}</td>
                          <td>
                            <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                              {new Date(log.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                            </span>
                          </td>
                          <td>
                            <span className="small opacity-70">{purgedParts.length > 0 ? purgedParts.join(", ") : "—"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shift Candidate Batch Modal */}
      {shiftModalOpen && (
        <div className="admin-modal-overlay" style={{ display: "flex", zIndex: 9999 }}>
          <div className="admin-modal" style={{ maxWidth: 540, width: "95%", margin: "40px auto" }}>
            <div className="admin-modal-header d-flex justify-content-between align-items-center mb-3">
              <h4 className="admin-modal-title mb-0 d-flex align-items-center gap-2" style={{ color: "var(--primary-gold)", fontSize: "1.1rem" }}>
                <ArrowRightLeft size={18} /> Shift Candidate Batch
              </h4>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShiftModalOpen(false)}
                disabled={savingShift}
              ></button>
            </div>

            <div className="p-3 mb-3 rounded" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Candidate:</span>
                <span className="fw-bold text-light">{shiftCandidateName}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted small">Current Batch / Slot:</span>
                <span className="badge bg-secondary">{shiftCurrentBatch}</span>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-muted small fw-semibold">Destination Batch / Slot</label>
              <select
                className="admin-input form-select"
                value={shiftSelectedSlotId}
                onChange={(e) => setShiftSelectedSlotId(e.target.value)}
                disabled={savingShift}
              >
                <option value="">-- Select Target Batch --</option>
                {availableSlots
                  .filter((s) => s._id !== shiftCurrentSlotId && !s.isCancelled)
                  .map((s) => {
                    const booked = s.bookedStudents?.length || 0;
                    const max = s.maxStudents || 0;
                    const isFull = max > 0 && booked >= max;
                    const startStr = s.startDate ? new Date(s.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
                    const modeLabel = s.mode ? `[${s.mode.toUpperCase()}]` : "";
                    const batchLabel = s.batchNo ? `Batch #${s.batchNo}` : s.title;
                    return (
                      <option key={s._id} value={s._id}>
                        {batchLabel} {modeLabel} — Starts {startStr} ({booked}/{max} enrolled{isFull ? " - FULL" : ""})
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="form-check mb-3">
              <input
                type="checkbox"
                className="form-check-input"
                id="overcapacityCheck"
                checked={shiftAllowOvercapacity}
                onChange={(e) => setShiftAllowOvercapacity(e.target.checked)}
                disabled={savingShift}
              />
              <label className="form-check-label small text-muted" htmlFor="overcapacityCheck">
                Allow enrollment even if target batch is at full capacity
              </label>
            </div>

            <div className="form-check mb-4">
              <input
                type="checkbox"
                className="form-check-input"
                id="notifyStudentCheck"
                checked={shiftNotify}
                onChange={(e) => setShiftNotify(e.target.checked)}
                disabled={savingShift}
              />
              <label className="form-check-label small text-muted" htmlFor="notifyStudentCheck">
                Notify candidate on their dashboard about this batch transfer
              </label>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShiftModalOpen(false)}
                disabled={savingShift}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-warning d-inline-flex align-items-center gap-1"
                onClick={submitShiftBatch}
                disabled={savingShift || !shiftSelectedSlotId}
              >
                <ArrowRightLeft size={14} /> {savingShift ? "Transferring..." : "Confirm Shift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
