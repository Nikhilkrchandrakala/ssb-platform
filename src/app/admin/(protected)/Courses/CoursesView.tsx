"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  PlusCircle,
  Globe,
  Pencil,
  Unlock,
  Save,
  ChevronLeft,
  ChevronRight,
  CalendarX2,
  Plus,
  Sun,
  Moon,
  Users,
  UserCheck,
  Tag,
  Ban,
  Check,
  UserPlus,
  Trash2,
  BookOpen,
  CheckCircle2,
  MapPin,
  Building2,
  GitMerge,
} from "lucide-react";
import { isBookingClosed, formatTimeRemaining } from "@/lib/batchTiming";
import "@/app/admin/styles/legacy-courses.css";

const ICON_STYLE = { verticalAlign: -2 };

interface Slot {
  _id: string;
  title: string;
  batchNo?: string;
  batchType?: string;
  startTime?: string;
  endTime?: string;
  maxStudents?: number;
  bookedStudents?: string[];
  price?: number;
  isFullCourse?: boolean;
  mode?: string;
  location?: string;
  isCancelled?: boolean;
  cancelledAt?: string | null;
  mergedInto?: string | null;
}

const OFFLINE_REGISTRATION_FEE = 5000;

interface Course {
  _id: string;
  courseId?: string;
  title?: string;
  price?: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MODULES = [
  { id: "ssb_ppdt", labelBase: "Intro to SSB & PPDT", defaultPrice: 1999 },
  { id: "psych", labelBase: "Psychology Prep Program", defaultPrice: 3499 },
  { id: "interview", labelBase: "Interview & Mock Course", defaultPrice: 2499 },
  { id: "group_testing", labelBase: "GTO Course on VTX", defaultPrice: 7999 },
];

const MANUAL_MODULES = [
  { id: "full_course", labelBase: "Full 12-day SSB Hackathon", defaultPrice: 14999 },
  ...MODULES,
];

const PRICING_KEYS = ["ssb_ppdt", "psych", "interview", "group_testing", "full_course"];
const PRICING_LABELS: Record<string, string> = {
  ssb_ppdt: "Stage 1 (SSB & PPDT)",
  psych: "Psychology Prep",
  interview: "Interview Course",
  group_testing: "GTO Course (VTX)",
  full_course: "Full Bundle Course",
};
const PRICING_PLACEHOLDERS: Record<string, number> = {
  ssb_ppdt: 1999,
  psych: 3499,
  interview: 2499,
  group_testing: 7999,
  full_course: 12499,
};

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function CoursesView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allBatches, setAllBatches] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  // Ticks once a minute so every "time left to book" badge on this page
  // stays live without needing a full data refetch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const [dbCourses, setDbCourses] = useState<Course[]>([]);
  const [pricingSyncing, setPricingSyncing] = useState(true);
  const [priceValues, setPriceValues] = useState<Record<string, number>>({ ...PRICING_PLACEHOLDERS });
  const [priceLocked, setPriceLocked] = useState<Record<string, boolean>>({
    ssb_ppdt: true, psych: true, interview: true, group_testing: true, full_course: true,
  });
  const [savingPricing, setSavingPricing] = useState(false);

  // Add/Edit slot modal
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editSlotId, setEditSlotId] = useState<string | null>(null);
  const [batchType, setBatchType] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [startDate, setStartDate] = useState("");
  const [maxStudents, setMaxStudents] = useState(10);
  const [price, setPrice] = useState(0);
  const [isFullCourse, setIsFullCourse] = useState(true);
  const [moduleChecks, setModuleChecks] = useState<Record<string, boolean>>({
    ssb_ppdt: false, psych: false, interview: false, group_testing: false,
  });
  const [savingSlot, setSavingSlot] = useState(false);

  // Add/Edit OFFLINE slot modal — separate from the online one above since
  // offline batches have no batchType/morning-evening or module concept, but
  // do have a Location field the online form doesn't.
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [editOfflineSlotId, setEditOfflineSlotId] = useState<string | null>(null);
  const [offlineTitle, setOfflineTitle] = useState("");
  const [offlineBatchNo, setOfflineBatchNo] = useState("");
  const [offlineStartDate, setOfflineStartDate] = useState("");
  const [offlineLocation, setOfflineLocation] = useState("");
  const [offlineMaxStudents, setOfflineMaxStudents] = useState(20);
  // Editable for testing (2026-09-17 request) — was a fixed, non-editable
  // ₹5,000 constant everywhere. Defaults to that same figure but admin can
  // now set a different registration fee per batch.
  const [offlinePrice, setOfflinePrice] = useState(OFFLINE_REGISTRATION_FEE);
  const [savingOfflineSlot, setSavingOfflineSlot] = useState(false);

  // Manual booking modal
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [manualUserId, setManualUserId] = useState("");
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({
    full_course: false, ssb_ppdt: false, psych: false, interview: false, group_testing: false,
  });
  const [confirmingBooking, setConfirmingBooking] = useState(false);
  const [manualDiscountType, setManualDiscountType] = useState<"flat" | "percent">("flat");
  const [manualDiscountValue, setManualDiscountValue] = useState<number>(0);

  // Consolidate Modal State
  const [consolidateModalOpen, setConsolidateModalOpen] = useState(false);
  const [consolidateTargetId, setConsolidateTargetId] = useState("");
  const [consolidateNewDate, setConsolidateNewDate] = useState("");
  const [consolidateSourceIds, setConsolidateSourceIds] = useState<string[]>([]);
  const [consolidateCapacity, setConsolidateCapacity] = useState(50);
  const [consolidateNotify, setConsolidateNotify] = useState(true);
  const [savingConsolidate, setSavingConsolidate] = useState(false);
  const [consolidateBatches, setConsolidateBatches] = useState<Slot[]>([]);

  const getCoursePrice = (courseId: string, defaultPrice: number) => {
    const course = dbCourses.find((c) => c.courseId === courseId);
    return course && typeof course.price === "number" ? course.price : defaultPrice;
  };

  // --- Data loading ---
  useEffect(() => {
    let cancelled = false;
    fetch("/api/allSlots")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch batches");
        return res.json();
      })
      .then((data: Slot[]) => {
        if (!cancelled) setAllBatches(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          window.Swal?.fire({
            icon: "error",
            title: "Fetch Failed",
            text: err instanceof Error ? err.message : "Error",
            background: "#1a1a1a",
            color: "#fff",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/allCourses")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch courses");
        return res.json();
      })
      .then((data: Course[]) => {
        if (cancelled) return;
        setDbCourses(Array.isArray(data) ? data : []);
        const next: Record<string, number> = { ...PRICING_PLACEHOLDERS };
        (data || []).forEach((c) => {
          if (c.courseId && typeof c.price === "number") next[c.courseId] = c.price;
        });
        setPriceValues(next);
      })
      .catch((err) => {
        console.error("Error loading global pricing:", err);
      })
      .finally(() => {
        if (!cancelled) setPricingSyncing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadBatches = () => {
    setLoading(true);
    fetch("/api/allSlots")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch batches");
        return res.json();
      })
      .then((data: Slot[]) => {
        setAllBatches(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        window.Swal?.fire({
          icon: "error",
          title: "Fetch Failed",
          text: err instanceof Error ? err.message : "Error",
          background: "#1a1a1a",
          color: "#fff",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const reloadPricing = async () => {
    try {
      setPricingSyncing(true);
      const res = await fetch("/api/allCourses");
      if (!res.ok) throw new Error("Failed to fetch courses");
      const data: Course[] = await res.json();
      setDbCourses(Array.isArray(data) ? data : []);
      const next: Record<string, number> = { ...PRICING_PLACEHOLDERS };
      (data || []).forEach((c) => {
        if (c.courseId && typeof c.price === "number") next[c.courseId] = c.price;
      });
      setPriceValues(next);
      setPriceLocked({ ssb_ppdt: true, psych: true, interview: true, group_testing: true, full_course: true });
    } catch (err) {
      console.error("Error loading global pricing:", err);
    } finally {
      setPricingSyncing(false);
    }
  };

  // --- Month view derivation ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthBatches = allBatches.filter((b) => {
    if (b.mode === "offline") return false;
    if (!b.startTime) return false;
    const d = new Date(b.startTime);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const totalCapacity = monthBatches.reduce((sum, b) => sum + (b.maxStudents || 0), 0);
  const totalBooked = monthBatches.reduce((sum, b) => sum + (b.bookedStudents ? b.bookedStudents.length : 0), 0);

  const offlineBatches = allBatches
    .filter((b) => b.mode === "offline")
    .sort((a, b) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime());

  // --- Add/Edit slot modal ---
  const toggleFullCourseUI = (nextIsFull: boolean, initialPopulate = false) => {
    setIsFullCourse(nextIsFull);
    if (nextIsFull) {
      setPrice(getCoursePrice("full_course", 12499));
    } else if (!initialPopulate) {
      setModuleChecks({ ssb_ppdt: false, psych: false, interview: false, group_testing: false });
      setPrice(0);
    }
  };

  const openAddModal = () => {
    setEditSlotId(null);
    setBatchType("");
    setBatchNo("");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(toDateInputValue(tomorrow));
    setMaxStudents(10);
    setModuleChecks({ ssb_ppdt: false, psych: false, interview: false, group_testing: false });
    setIsFullCourse(true);
    setPrice(getCoursePrice("full_course", 12499));
    setSlotModalOpen(true);
  };

  const openEditModal = async (id: string) => {
    try {
      const resp = await fetch(`/api/slotDetail/${id}`);
      if (!resp.ok) throw new Error("Batch not found");
      const slot: Slot = await resp.json();

      setEditSlotId(id);
      setBatchType((slot.batchType || "").toLowerCase());
      setBatchNo(slot.batchNo || "");
      if (slot.startTime) setStartDate(toDateInputValue(new Date(slot.startTime)));
      setMaxStudents(slot.maxStudents || 10);
      setPrice(slot.price || 0);
      setModuleChecks({ ssb_ppdt: false, psych: false, interview: false, group_testing: false });
      setIsFullCourse(Boolean(slot.isFullCourse));
      setSlotModalOpen(true);
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Error",
        text: err instanceof Error ? err.message : "Error",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  };

  const onModuleCheckChange = (moduleId: string, checked: boolean) => {
    const next = { ...moduleChecks, [moduleId]: checked };
    setModuleChecks(next);
    let sum = 0;
    MODULES.forEach((m) => {
      if (next[m.id]) sum += getCoursePrice(m.id, m.defaultPrice);
    });
    setPrice(sum);
  };

  const saveSlot = async () => {
    if (!batchType || !startDate) {
      window.Swal?.fire({
        icon: "warning",
        text: "Please complete all required fields.",
        background: "#1a1a1a",
        color: "#fff",
      });
      return;
    }

    const payload = {
      title: batchType === "morning" ? "Morning Batch" : "Evening Batch",
      batchNo,
      batchType,
      startTime: new Date(startDate).toISOString(),
      endTime: new Date(new Date(startDate).getTime() + 86400000).toISOString(),
      maxStudents: Number(maxStudents) || 0,
      price: Number(price) || 0,
      isFullCourse,
    };

    try {
      setSavingSlot(true);
      const url = editSlotId ? `/api/updateSlot/${editSlotId}` : "/api/addSlot";
      const method = editSlotId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to save batch");

      window.Swal?.fire({
        icon: "success",
        title: "Success",
        text: "Batch has been saved.",
        background: "#1a1a1a",
        color: "#fff",
      });
      setSlotModalOpen(false);
      reloadBatches();
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Save Failed",
        text: err instanceof Error ? err.message : "Error",
        background: "#1a1a1a",
        color: "#fff",
      });
    } finally {
      setSavingSlot(false);
    }
  };

  const openAddOfflineModal = () => {
    setEditOfflineSlotId(null);
    setOfflineTitle("");
    setOfflineBatchNo("");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setOfflineStartDate(toDateInputValue(tomorrow));
    setOfflineLocation("");
    setOfflineMaxStudents(20);
    setOfflinePrice(OFFLINE_REGISTRATION_FEE);
    setOfflineModalOpen(true);
  };

  const openEditOfflineModal = async (id: string) => {
    try {
      const resp = await fetch(`/api/slotDetail/${id}`);
      if (!resp.ok) throw new Error("Batch not found");
      const slot: Slot = await resp.json();

      setEditOfflineSlotId(id);
      setOfflineTitle(slot.title || "");
      setOfflineBatchNo(slot.batchNo || "");
      if (slot.startTime) setOfflineStartDate(toDateInputValue(new Date(slot.startTime)));
      setOfflineLocation(slot.location || "");
      setOfflineMaxStudents(slot.maxStudents || 20);
      setOfflinePrice(slot.price || OFFLINE_REGISTRATION_FEE);
      setOfflineModalOpen(true);
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Error",
        text: err instanceof Error ? err.message : "Error",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  };

  const saveOfflineSlot = async () => {
    if (!offlineTitle.trim() || !offlineStartDate || !offlineLocation.trim()) {
      window.Swal?.fire({
        icon: "warning",
        text: "Title, Start Date, and Location are required.",
        background: "#1a1a1a",
        color: "#fff",
      });
      return;
    }

    const payload = {
      title: offlineTitle.trim(),
      batchNo: offlineBatchNo,
      startTime: new Date(offlineStartDate).toISOString(),
      endTime: new Date(new Date(offlineStartDate).getTime() + 86400000).toISOString(),
      maxStudents: Number(offlineMaxStudents) || 0,
      price: Number(offlinePrice) || OFFLINE_REGISTRATION_FEE,
      isFullCourse: false,
      mode: "offline",
      location: offlineLocation.trim(),
    };

    try {
      setSavingOfflineSlot(true);
      const url = editOfflineSlotId ? `/api/updateSlot/${editOfflineSlotId}` : "/api/addSlot";
      const method = editOfflineSlotId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to save offline batch");

      window.Swal?.fire({
        icon: "success",
        title: "Success",
        text: "Offline batch has been saved.",
        background: "#1a1a1a",
        color: "#fff",
      });
      setOfflineModalOpen(false);
      reloadBatches();
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Save Failed",
        text: err instanceof Error ? err.message : "Error",
        background: "#1a1a1a",
        color: "#fff",
      });
    } finally {
      setSavingOfflineSlot(false);
    }
  };

  const showDeleteConfirm = async (id: string) => {
    const result = await window.Swal?.fire({
      title: "Delete Batch?",
      text: "This will remove the batch permanently. Confirmed students will lose their slot reference.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff6b6b",
      cancelButtonColor: "rgba(255,255,255,0.1)",
      confirmButtonText: "Yes, Delete",
      background: "#1a1a1a",
      color: "#fff",
    });
    if (!result?.isConfirmed) return;

    try {
      const resp = await fetch(`/api/deleteSlot/${id}`, { method: "DELETE" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Delete failed");
      window.Swal?.fire({
        icon: "success",
        title: data.softDeleted ? "Batch Cancelled & Preserved" : "Deleted",
        text: data.message || "Batch processed successfully.",
        background: "#1a1a1a",
        color: "#fff",
      });
      reloadBatches();
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        text: err instanceof Error ? err.message : "Error",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  };

  // --- Manual booking modal ---
  const bookingSlot = allBatches.find((b) => b._id === bookingSlotId) || null;

  const openManualBookingModal = (id: string) => {
    setBookingSlotId(id);
    setManualUserId("");
    setManualChecks({ full_course: false, ssb_ppdt: false, psych: false, interview: false, group_testing: false });
    setManualDiscountType("flat");
    setManualDiscountValue(0);
    setBookModalOpen(true);
  };

  const toggleManualModule = (changedId: string, checked: boolean) => {
    setManualChecks((prev) => {
      const next = { ...prev, [changedId]: checked };
      if (changedId === "full_course") {
        if (checked) {
          MODULES.forEach((m) => {
            next[m.id] = false;
          });
        }
      } else {
        const anyOtherChecked = MODULES.some((m) => next[m.id]);
        if (anyOtherChecked) next.full_course = false;
      }
      return next;
    });
  };

  const manualAnyOtherChecked = MODULES.some((m) => manualChecks[m.id]);

  const calcManualPrice = () => {
    if (!bookingSlot) return { base: 0, discount: 0, netBase: 0, gst: 0, total: 0 };
    let basePrice = 0;
    if (bookingSlot.isFullCourse) {
      const checkedOthers = MODULES.filter((m) => manualChecks[m.id]);
      if (manualChecks.full_course) {
        basePrice = getCoursePrice("full_course", 14999);
      } else if (checkedOthers.length === 4) {
        basePrice = getCoursePrice("full_course", 14999);
      } else {
        checkedOthers.forEach((m) => {
          basePrice += getCoursePrice(m.id, m.defaultPrice);
        });
      }
    } else {
      basePrice = bookingSlot.price || 0;
    }
    const rawDiscount = manualDiscountType === "percent" ? (basePrice * manualDiscountValue) / 100 : manualDiscountValue;
    const discount = Math.min(Math.max(rawDiscount, 0), basePrice);
    const netBase = basePrice - discount;
    const gst = netBase * 0.18;
    return { base: basePrice, discount, netBase, gst, total: netBase + gst };
  };

  const manualPricing = calcManualPrice();
  const fmtInr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const confirmManualBook = async () => {
    if (!bookingSlotId) return;
    const identifier = manualUserId.trim();
    if (!identifier) {
      window.Swal?.fire({ icon: "warning", text: "Please enter a student email or ID.", background: "#1a1a1a", color: "#fff" });
      return;
    }

    const selectedModules: string[] = [];
    if (bookingSlot && bookingSlot.isFullCourse) {
      if (manualChecks.full_course) {
        selectedModules.push("full_course");
      } else {
        MODULES.forEach((m) => {
          if (manualChecks[m.id]) selectedModules.push(m.id);
        });
      }
    }

    if (bookingSlot && bookingSlot.isFullCourse && selectedModules.length === 0) {
      window.Swal?.fire({ icon: "warning", text: "Please select at least one course/module.", background: "#1a1a1a", color: "#fff" });
      return;
    }

    try {
      setConfirmingBooking(true);
      const response = await fetch(`/api/manualBookSlot/${bookingSlotId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: identifier,
          selectedModules,
          discountType: manualDiscountValue > 0 ? manualDiscountType : undefined,
          discountValue: manualDiscountValue > 0 ? manualDiscountValue : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Booking failed");
      }

      window.Swal?.fire({
        icon: "success",
        title: "Booked!",
        text: "Student has been added to this batch.",
        background: "#1a1a1a",
        color: "#fff",
      });
      setBookModalOpen(false);
      reloadBatches();
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Booking Error",
        text: err instanceof Error ? err.message : "Error",
        background: "#1a1a1a",
        color: "#fff",
      });
    } finally {
      setConfirmingBooking(false);
    }
  };

  // --- Global pricing ---
  const togglePriceLock = (key: string) => {
    setPriceLocked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveGlobalPrices = async (e: React.FormEvent) => {
    e.preventDefault();

    const updates: { key: string; val: number }[] = [];
    PRICING_KEYS.forEach((key) => {
      if (!priceLocked[key]) updates.push({ key, val: Number(priceValues[key]) });
    });

    if (updates.length === 0) {
      window.Swal?.fire({
        icon: "info",
        title: "No Changes to Save",
        text: 'Please click the "Edit" button next to any course price to unlock and edit it.',
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });
      return;
    }

    try {
      setSavingPricing(true);
      for (const update of updates) {
        const match = dbCourses.find((c) => c.courseId === update.key);
        if (!match) continue;
        if (match.price === update.val) continue;

        // NOTE: /api/updateCourse/[id] only accepts multipart FormData
        // (matching addCourse's contract), unlike legacy courses.js which
        // sent a JSON body here — adapted to FormData with just `price`.
        const formData = new FormData();
        formData.append("price", String(update.val));

        const response = await fetch(`/api/updateCourse/${match._id}`, {
          method: "PUT",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to update price for ${match.title || update.key}`);
        }
      }

      window.Swal?.fire({
        icon: "success",
        title: "Prices Updated Globally!",
        text: "Selected course module prices have been saved successfully.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });

      await reloadPricing();
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Pricing Save Failed",
        text: err instanceof Error ? err.message : "Error",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    } finally {
      setSavingPricing(false);
    }
  };

  // --- Consolidate & Reschedule Handlers ---
  const openConsolidateModal = (preselectedTargetId?: string) => {
    const target = allBatches.find((b) => b._id === preselectedTargetId && !b.isCancelled) || allBatches.find((b) => !b.isCancelled);
    if (!target) {
      window.Swal?.fire({ icon: "info", text: "No active batches available to consolidate.", background: "#1a1a1a", color: "#fff" });
      return;
    }
    setConsolidateTargetId(target._id);
    if (target.startTime) {
      setConsolidateNewDate(toDateInputValue(new Date(target.startTime)));
    } else {
      setConsolidateNewDate("");
    }
    setConsolidateSourceIds([]);
    setConsolidateCapacity(target.maxStudents || 50);
    setConsolidateNotify(true);

    // Fetch all slots including cancelled/soft-deleted ones so they can be merged!
    fetch("/api/allSlots?includeCancelled=true")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setConsolidateBatches(data);
      })
      .catch(() => {});

    setConsolidateModalOpen(true);
  };

  const onTargetBatchChange = (newTargetId: string) => {
    setConsolidateTargetId(newTargetId);
    const target = (consolidateBatches.length > 0 ? consolidateBatches : allBatches).find((b) => b._id === newTargetId);
    if (target) {
      if (target.startTime) {
        setConsolidateNewDate(toDateInputValue(new Date(target.startTime)));
      }
      setConsolidateSourceIds((prev) => prev.filter((id) => id !== newTargetId));
      setConsolidateCapacity(target.maxStudents || 50);
    }
  };

  const toggleSourceBatch = (sourceId: string) => {
    setConsolidateSourceIds((prev) =>
      prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]
    );
  };

  const consolidateTargetBatch = (consolidateBatches.length > 0 ? consolidateBatches : allBatches).find((b) => b._id === consolidateTargetId);
  const consolidateTargetBooked = consolidateTargetBatch?.bookedStudents ? consolidateTargetBatch.bookedStudents.length : 0;
  const consolidateSourceBatches = (consolidateBatches.length > 0 ? consolidateBatches : allBatches).filter((b) => consolidateSourceIds.includes(b._id));
  const consolidateCombinedTotal =
    consolidateTargetBooked +
    consolidateSourceBatches.reduce((acc, b) => acc + (b.bookedStudents?.length || 0), 0);

  const submitConsolidation = async () => {
    if (!consolidateTargetId) {
      window.Swal?.fire({ icon: "warning", text: "Please choose a target batch.", background: "#1a1a1a", color: "#fff" });
      return;
    }
    if (consolidateSourceIds.length === 0 && !consolidateNewDate) {
      window.Swal?.fire({ icon: "warning", text: "Please select source batches to absorb or choose a revised start date.", background: "#1a1a1a", color: "#fff" });
      return;
    }

    const confirmRes = await window.Swal?.fire({
      title: "Confirm Consolidation?",
      html: `
        <div style="text-align: left; font-size: 0.9rem; line-height: 1.5;">
          <p><strong>Target Batch:</strong> Batch #${consolidateTargetBatch?.batchNo || consolidateTargetBatch?.title}</p>
          ${consolidateNewDate ? `<p><strong>Revised Start Date:</strong> ${consolidateNewDate}</p>` : ""}
          ${consolidateSourceIds.length > 0 ? `<p><strong>Batches to Cancel &amp; Absorb:</strong> ${consolidateSourceBatches.map((b) => '#' + (b.batchNo || b.title)).join(", ")} (${consolidateSourceBatches.reduce((sum, b) => sum + (b.bookedStudents ? b.bookedStudents.length : 0), 0)} students)</p>` : ""}
          <p><strong>Total Enrolled Students:</strong> ${consolidateCombinedTotal}</p>
          <p class="text-warning small mt-2">Absorbed batches will be soft-deleted. Students will receive in-app dashboard alerts.</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Execute Consolidation",
      confirmButtonColor: "var(--primary-gold)",
      cancelButtonColor: "rgba(255,255,255,0.1)",
      background: "#1a1a1a",
      color: "#fff",
    });

    if (!confirmRes?.isConfirmed) return;

    setSavingConsolidate(true);
    window.Swal?.fire({
      title: "Consolidating...",
      text: "Synchronizing student orders, schedules, and notifications.",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    try {
      const res = await fetch("/api/admin/batches/consolidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSlotId: consolidateTargetId,
          newStartDate: consolidateNewDate,
          sourceSlotIds: consolidateSourceIds,
          updatedCapacity: Number(consolidateCapacity) || undefined,
          notifyStudents: consolidateNotify,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Consolidation failed");

      window.Swal?.fire({
        icon: "success",
        title: "Consolidation Complete!",
        text: data.message,
        background: "#1a1a1a",
        color: "#fff",
      });
      setConsolidateModalOpen(false);
      reloadBatches();
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Operation Failed",
        text: err instanceof Error ? err.message : "Error",
        background: "#1a1a1a",
        color: "#fff",
      });
    } finally {
      setSavingConsolidate(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <CalendarDays size={20} className="me-2" style={ICON_STYLE} /> Batch Management
          </h1>
          <p className="text-muted mb-0">Schedule courses, manage batches, and handle manual seat bookings</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            className="thm-btn"
            style={{ background: "linear-gradient(135deg, #e67e22, #d35400)", borderColor: "#e67e22" }}
            onClick={() => openConsolidateModal()}
          >
            <GitMerge size={16} style={ICON_STYLE} /> Consolidate / Reschedule
          </button>
          <button className="thm-btn" onClick={openAddModal}>
            <PlusCircle size={16} style={ICON_STYLE} /> Create New Batch
          </button>
          <button className="thm-btn secondary" onClick={openAddOfflineModal}>
            <Building2 size={16} style={ICON_STYLE} /> Create Offline Batch
          </button>
        </div>
      </div>

      {/* Global Course Pricing Card */}
      <div className="admin-card mb-5" style={{ marginTop: -10 }}>
        <div
          className="d-flex justify-content-between align-items-center mb-4 pb-2"
          style={{ borderBottom: "1px solid rgba(224, 194, 20, 0.2)" }}
        >
          <h4 style={{ color: "var(--primary-gold)", margin: 0, fontWeight: 700, letterSpacing: "0.5px", fontSize: "1.25rem" }}>
            <Globe size={18} className="me-2" style={ICON_STYLE} /> Global Course Module Pricing
          </h4>
          <span
            className="badge"
            style={{
              background: "rgba(224, 194, 20, 0.1)",
              color: "var(--primary-gold)",
              border: "var(--border-gold)",
              padding: "6px 12px",
              fontWeight: 600,
              borderRadius: 20,
            }}
          >
            {pricingSyncing && <span className="spinner-border spinner-border-sm me-1" role="status"></span>} Live Prices
          </span>
        </div>

        <form className="row g-3 align-items-end" onSubmit={saveGlobalPrices}>
          {PRICING_KEYS.map((key) => (
            <div className="col-xl col-md-4 col-sm-6" key={key}>
              <label
                className="admin-form-label"
                style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.85, marginBottom: 6 }}
              >
                {PRICING_LABELS[key]}
              </label>
              <div className="input-group">
                <span
                  className="input-group-text"
                  style={{ background: "var(--surface-light)", border: "1px solid #444", borderRight: "none", color: "var(--primary-gold)", fontWeight: "bold" }}
                >
                  &#8377;
                </span>
                <input
                  type="number"
                  className="admin-input"
                  style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: "none" }}
                  min={0}
                  required
                  placeholder={String(PRICING_PLACEHOLDERS[key])}
                  disabled={priceLocked[key]}
                  value={priceValues[key] ?? ""}
                  onChange={(e) => setPriceValues((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                />
                <button
                  className="btn"
                  type="button"
                  style={{
                    background: priceLocked[key] ? "var(--surface-light)" : "rgba(224, 194, 20, 0.15)",
                    border: `1px solid ${priceLocked[key] ? "#444" : "var(--primary-gold)"}`,
                    color: "var(--primary-gold)",
                    borderTopRightRadius: 8,
                    borderBottomRightRadius: 8,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    padding: "0 10px",
                  }}
                  onClick={() => togglePriceLock(key)}
                >
                  {priceLocked[key] ? (
                    <Pencil size={14} className="me-1" style={ICON_STYLE} />
                  ) : (
                    <Unlock size={14} className="me-1" style={ICON_STYLE} />
                  )}{" "}
                  {priceLocked[key] ? "Edit" : "Unlock"}
                </button>
              </div>
            </div>
          ))}
          <div className="col-xl-auto col-md-12 text-end">
            <button type="submit" className="thm-btn w-100" disabled={savingPricing}>
              <Save size={16} style={ICON_STYLE} /> {savingPricing ? "Saving..." : "Save Global Prices"}
            </button>
          </div>
        </form>
      </div>

      {/* Month Navigation */}
      <div className="month-nav-container">
        <button className="month-nav-btn" onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
          <ChevronLeft size={14} />
        </button>
        <div className="month-display-box">
          <div className="month-name">{`${MONTH_NAMES[month]} ${year}`}</div>
          <div className="month-stats">
            {loading ? (
              "Loading statistics..."
            ) : (
              <>
                <span className="me-3">{monthBatches.length} BATCHES</span>{" "}
                <span className="me-3">CAPACITY: {totalCapacity}</span> <span>BOOKED: {totalBooked}</span>
              </>
            )}
          </div>
        </div>
        <button className="month-nav-btn" onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
          <ChevronRight size={14} />
        </button>
      </div>

      {loading && (
        <div className="loading-spinner text-center" style={{ padding: 60 }}>
          <div className="spinner-border text-warning" role="status"></div>
          <p className="mt-3">Syncing batches data...</p>
        </div>
      )}

      {!loading && monthBatches.length === 0 && (
        <div className="empty-state text-center" style={{ padding: "100px 20px" }}>
          <div className="empty-icon mb-4" style={{ color: "var(--primary-gold)", opacity: 0.3 }}>
            <CalendarX2 size={64} />
          </div>
          <h3>No batches scheduled for {`${MONTH_NAMES[month]} ${year}`}</h3>
          <p className="text-muted">You haven&apos;t created any course batches for this period yet.</p>
          <button className="thm-btn mt-3" onClick={openAddModal}>
            <Plus size={16} style={ICON_STYLE} /> Schedule First Batch
          </button>
        </div>
      )}

      {!loading && monthBatches.length > 0 && (
        <div className="row g-4">
          {monthBatches.map((slot) => {
            const startDateStr = slot.startTime
              ? new Date(slot.startTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
              : "N/A";
            let finalPriceVal = slot.price;
            if (slot.isFullCourse) finalPriceVal = getCoursePrice("full_course", slot.price || 12499);
            const priceStr = finalPriceVal ? `₹${Number(finalPriceVal).toLocaleString("en-IN")}` : "FREE";
            const max = slot.maxStudents || 0;
            const booked = slot.bookedStudents ? slot.bookedStudents.length : 0;
            const available = max - booked;
            const isFull = max > 0 && booked >= max;
            const isMorning = slot.batchType === "morning" || (slot.title || "").toLowerCase().includes("morning");
            const typeClass = isMorning ? "morning-type" : "evening-type";
            const bookingClosed = isBookingClosed(slot, now);

            return (
              <div className="col-lg-4 col-md-6" key={slot._id}>
                <div className="batch-card">
                  <div className="batch-header">
                    <span className={`type-badge ${typeClass}`}>
                      {isMorning ? (
                        <Sun size={14} className="me-2" style={ICON_STYLE} />
                      ) : (
                        <Moon size={14} className="me-2" style={ICON_STYLE} />
                      )}
                      {slot.title || (isMorning ? "Morning" : "Evening")}
                    </span>
                    <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>ID: {slot.batchNo || "—"}</span>
                  </div>
                  <div className="batch-body">
                    <div className="stat-item">
                      <span className="stat-label">
                        <CalendarDays size={14} className="me-2" style={ICON_STYLE} />Start Date
                      </span>
                      <span className="stat-value">{startDateStr}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">
                        <Users size={14} className="me-2" style={ICON_STYLE} />Capacity
                      </span>
                      <span className="stat-value">{max} Seats</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">
                        <UserCheck size={14} className="me-2" style={ICON_STYLE} />Booked
                      </span>
                      <span className="stat-value">{booked} Students</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">
                        <Tag size={14} className="me-2" style={ICON_STYLE} />Price
                      </span>
                      <span className="price-badge">{priceStr}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">
                        <CalendarDays size={14} className="me-2" style={ICON_STYLE} />Public Booking
                      </span>
                      <span className="stat-value" style={{ color: bookingClosed ? "#ff6b6b" : undefined }}>
                        {bookingClosed ? "Closed" : formatTimeRemaining(slot, now)}
                      </span>
                    </div>
                    <div className="mt-3 text-center">
                      {isFull ? (
                        <span className="badge bg-danger w-100 p-2" style={{ borderRadius: 8 }}>
                          <Ban size={14} className="me-2" style={ICON_STYLE} />BATCH FULL
                        </span>
                      ) : (
                        <span
                          className="badge bg-success w-100 p-2"
                          style={{
                            background: "rgba(46, 204, 113, 0.1)",
                            color: "#2ecc71",
                            border: "1px solid rgba(46, 204, 113, 0.3)",
                            borderRadius: 8,
                          }}
                        >
                          <Check size={14} className="me-2" style={ICON_STYLE} />{available} SPOTS AVAILABLE
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="batch-footer">
                    <button className="action-btn edit-btn" style={{ flex: 1 }} title="Edit" onClick={() => openEditModal(slot._id)}>
                      <Pencil size={14} />
                    </button>
                    <button
                      className="action-btn"
                      style={{ flex: 1, color: "#e67e22", borderColor: "rgba(230, 126, 34, 0.3)" }}
                      title="Consolidate / Reschedule Batch"
                      onClick={() => openConsolidateModal(slot._id)}
                    >
                      <GitMerge size={14} />
                    </button>
                    <button
                      className="action-btn manual-btn"
                      style={{ flex: 2, background: "rgba(39, 174, 96, 0.1)", borderColor: "rgba(39, 174, 96, 0.3)", color: "#2ecc71" }}
                      disabled={isFull}
                      onClick={() => openManualBookingModal(slot._id)}
                    >
                      <UserPlus size={14} className="me-1" style={ICON_STYLE} /> Book
                    </button>
                    <button
                      className="action-btn delete-btn"
                      style={{ flex: 1, color: "#ff6b6b" }}
                      onClick={() => showDeleteConfirm(slot._id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Offline Batches */}
      <div className="admin-page-header" style={{ marginTop: 40 }}>
        <div className="header-left">
          <h1 className="admin-page-title">
            <Building2 size={20} className="me-2" style={ICON_STYLE} /> Offline Batches
          </h1>
          <p className="text-muted mb-0">In-person batches — students pay a ₹{OFFLINE_REGISTRATION_FEE.toLocaleString("en-IN")} registration fee online, balance at the center</p>
        </div>
      </div>

      {!loading && offlineBatches.length === 0 && (
        <div className="empty-state text-center" style={{ padding: "60px 20px" }}>
          <div className="empty-icon mb-4" style={{ color: "var(--primary-gold)", opacity: 0.3 }}>
            <Building2 size={56} />
          </div>
          <h3>No offline batches yet</h3>
          <p className="text-muted">Create one to start accepting in-person registrations.</p>
          <button className="thm-btn mt-3" onClick={openAddOfflineModal}>
            <Plus size={16} style={ICON_STYLE} /> Create Offline Batch
          </button>
        </div>
      )}

      {!loading && offlineBatches.length > 0 && (
        <div className="row g-4">
          {offlineBatches.map((slot) => {
            const startDateStr = slot.startTime
              ? new Date(slot.startTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
              : "N/A";
            const max = slot.maxStudents || 0;
            const booked = slot.bookedStudents ? slot.bookedStudents.length : 0;
            const available = max - booked;
            const isFull = max > 0 && booked >= max;

            return (
              <div className="col-lg-4 col-md-6" key={slot._id}>
                <div className="batch-card">
                  <div className="batch-header">
                    <span className="type-badge evening-type">
                      <Building2 size={14} className="me-2" style={ICON_STYLE} />
                      {slot.title}
                    </span>
                    <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>ID: {slot.batchNo || "—"}</span>
                  </div>
                  <div className="batch-body">
                    <div className="stat-item">
                      <span className="stat-label">
                        <CalendarDays size={14} className="me-2" style={ICON_STYLE} />Start Date
                      </span>
                      <span className="stat-value">{startDateStr}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">
                        <MapPin size={14} className="me-2" style={ICON_STYLE} />Location
                      </span>
                      <span className="stat-value">{slot.location || "—"}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">
                        <Users size={14} className="me-2" style={ICON_STYLE} />Capacity
                      </span>
                      <span className="stat-value">{max} Seats</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">
                        <UserCheck size={14} className="me-2" style={ICON_STYLE} />Booked
                      </span>
                      <span className="stat-value">{booked} Students</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">
                        <Tag size={14} className="me-2" style={ICON_STYLE} />Registration Fee
                      </span>
                      <span className="price-badge">₹{(slot.price ?? OFFLINE_REGISTRATION_FEE).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="mt-3 text-center">
                      {isFull ? (
                        <span className="badge bg-danger w-100 p-2" style={{ borderRadius: 8 }}>
                          <Ban size={14} className="me-2" style={ICON_STYLE} />BATCH FULL
                        </span>
                      ) : (
                        <span
                          className="badge bg-success w-100 p-2"
                          style={{
                            background: "rgba(46, 204, 113, 0.1)",
                            color: "#2ecc71",
                            border: "1px solid rgba(46, 204, 113, 0.3)",
                            borderRadius: 8,
                          }}
                        >
                          <Check size={14} className="me-2" style={ICON_STYLE} />{available} SPOTS AVAILABLE
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="batch-footer">
                    <button className="action-btn edit-btn" style={{ flex: 1 }} title="Edit" onClick={() => openEditOfflineModal(slot._id)}>
                      <Pencil size={14} />
                    </button>
                    <button
                      className="action-btn"
                      style={{ flex: 1, color: "#e67e22", borderColor: "rgba(230, 126, 34, 0.3)" }}
                      title="Consolidate / Reschedule Batch"
                      onClick={() => openConsolidateModal(slot._id)}
                    >
                      <GitMerge size={14} />
                    </button>
                    <button
                      className="action-btn manual-btn"
                      style={{ flex: 2, background: "rgba(39, 174, 96, 0.1)", borderColor: "rgba(39, 174, 96, 0.3)", color: "#2ecc71" }}
                      disabled={isFull}
                      onClick={() => openManualBookingModal(slot._id)}
                    >
                      <UserPlus size={14} className="me-1" style={ICON_STYLE} /> Book
                    </button>
                    <button
                      className="action-btn delete-btn"
                      style={{ flex: 1, color: "#ff6b6b" }}
                      onClick={() => showDeleteConfirm(slot._id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Offline Batch Modal */}
      {offlineModalOpen && (
        <div className="admin-modal-overlay" style={{ display: "flex" }}>
          <div className="admin-modal" style={{ maxWidth: 600, width: "95%", margin: "20px auto" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                <Building2 size={18} className="me-2" style={ICON_STYLE} />
                {editOfflineSlotId ? "Edit Offline Batch" : "Create Offline Batch"}
              </h3>
              <button type="button" className="btn-close btn-close-white" onClick={() => setOfflineModalOpen(false)}></button>
            </div>

            <div className="mb-3">
              <label className="admin-form-label">Batch Title*</label>
              <input
                type="text"
                className="admin-input"
                placeholder="e.g. Offline Batch — Delhi Center"
                value={offlineTitle}
                onChange={(e) => setOfflineTitle(e.target.value)}
              />
            </div>

            <div className="row mb-3">
              <div className="col-6">
                <label className="admin-form-label">Batch ID / Number</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. OFF-2026-01"
                  value={offlineBatchNo}
                  onChange={(e) => setOfflineBatchNo(e.target.value)}
                />
              </div>
              <div className="col-6">
                <label className="admin-form-label">Start Date*</label>
                <input type="date" className="admin-input" value={offlineStartDate} onChange={(e) => setOfflineStartDate(e.target.value)} />
              </div>
            </div>

            <div className="mb-3">
              <label className="admin-form-label">
                <MapPin size={14} className="me-1" style={ICON_STYLE} /> Location / Venue*
              </label>
              <input
                type="text"
                className="admin-input"
                placeholder="e.g. ISV Training Center, Sector 21, Delhi"
                value={offlineLocation}
                onChange={(e) => setOfflineLocation(e.target.value)}
              />
            </div>

            <div className="row mb-3">
              <div className="col-6">
                <label className="admin-form-label">Max Capacity</label>
                <input
                  type="number"
                  className="admin-input"
                  min={1}
                  value={offlineMaxStudents}
                  onChange={(e) => setOfflineMaxStudents(Number(e.target.value))}
                />
              </div>
              <div className="col-6">
                <label className="admin-form-label">Registration Fee (₹)</label>
                <input
                  type="number"
                  className="admin-input"
                  min={0}
                  value={offlinePrice}
                  onChange={(e) => setOfflinePrice(Number(e.target.value))}
                />
                <small className="text-muted" style={{ fontSize: "0.72rem" }}>
                  Editable for testing — normally kept at ₹{OFFLINE_REGISTRATION_FEE.toLocaleString("en-IN")}.
                </small>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary">
              <button type="button" className="thm-btn cancel-btn" onClick={() => setOfflineModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="thm-btn" onClick={saveOfflineSlot} disabled={savingOfflineSlot}>
                <Save size={14} className="me-1" style={ICON_STYLE} /> {savingOfflineSlot ? "Saving..." : "Save Batch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Batch Modal */}
      {slotModalOpen && (
        <div className="admin-modal-overlay" style={{ display: "flex" }} onClick={() => setSlotModalOpen(false)}>
          <div className="admin-modal" style={{ maxWidth: 550, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h5 className="admin-modal-title">
                {editSlotId ? (
                  <Pencil size={18} className="me-2" style={ICON_STYLE} />
                ) : (
                  <PlusCircle size={18} className="me-2" style={ICON_STYLE} />
                )}{" "}
                {editSlotId ? "Edit Batch Details" : "Create New Batch"}
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setSlotModalOpen(false)} aria-label="Close"></button>
            </div>
            <div>
              <div className="mb-3">
                <label className="admin-form-label">Batch Type *</label>
                <select className="admin-input" required value={batchType} onChange={(e) => setBatchType(e.target.value)}>
                  <option value="">Select Session</option>
                  <option value="morning">Morning Batch</option>
                  <option value="evening">Evening Batch</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="admin-form-label">Batch ID / Number</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. 2026-MAR-01"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="admin-form-label">Course Start Date *</label>
                <input
                  type="date"
                  className="admin-input"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="admin-form-label">Max Capacity</label>
                  <input
                    type="number"
                    className="admin-input"
                    min={1}
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(Number(e.target.value))}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="admin-form-label">Course Price (&#8377;)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="admin-input"
                    value={price}
                    disabled={isFullCourse}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="mb-3 form-check" style={{ paddingLeft: "2em" }}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="isFullCourse"
                  checked={isFullCourse}
                  onChange={(e) => toggleFullCourseUI(e.target.checked)}
                />
                <label className="form-check-label admin-form-label" htmlFor="isFullCourse" style={{ marginBottom: 0 }}>
                  Is this the Full Course? (Allows Coupons & Bundled UI)
                </label>
              </div>
              {!isFullCourse && (
                <div
                  className="mb-3"
                  style={{ paddingLeft: "2em", borderLeft: "3px solid var(--primary-gold)", marginTop: 15 }}
                >
                  <label className="admin-form-label mb-2">
                    <BookOpen size={14} className="me-1" style={{ ...ICON_STYLE, color: "var(--primary-gold)" }} /> Select Included
                    Modules
                  </label>
                  {MODULES.map((m) => (
                    <div className="form-check mb-2" key={m.id}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`mod_${m.id}`}
                        checked={moduleChecks[m.id]}
                        onChange={(e) => onModuleCheckChange(m.id, e.target.checked)}
                      />
                      <label className="form-check-label text-white" style={{ fontSize: "0.85rem" }} htmlFor={`mod_${m.id}`}>
                        {m.labelBase} (
                        <span className="text-warning font-weight-bold">
                          &#8377;{getCoursePrice(m.id, m.defaultPrice).toLocaleString("en-IN")}
                        </span>
                        )
                      </label>
                    </div>
                  ))}
                </div>
              )}
              <div className="modal-footer px-0 pb-0 pt-3">
                <button
                  type="button"
                  className="thm-btn cancel-btn"
                  onClick={() => setSlotModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="button" className="thm-btn" onClick={saveSlot} disabled={savingSlot}>
                  {savingSlot ? "Saving..." : "Save Batch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Booking Modal */}
      {bookModalOpen && (
        <div className="admin-modal-overlay" style={{ display: "flex" }} onClick={() => setBookModalOpen(false)}>
          <div className="admin-modal" style={{ maxWidth: 550, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h5 className="admin-modal-title">
                <UserPlus size={18} className="me-2" style={ICON_STYLE} /> Manual Seat Booking
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setBookModalOpen(false)} aria-label="Close"></button>
            </div>
            <div>
              <div className="mb-3">
                <label className="admin-form-label">Student Email / User ID</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Enter student identifier"
                  required
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                />
                <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                  Enter the registered student&apos;s email or system ID to book manually.
                </small>
              </div>

              {bookingSlot?.isFullCourse && (
                <div
                  className="mb-3"
                  style={{ borderLeft: "3px solid var(--primary-gold)", paddingLeft: 15, marginTop: 15 }}
                >
                  <label className="admin-form-label mb-2">
                    <BookOpen size={14} className="me-1" style={{ ...ICON_STYLE, color: "var(--primary-gold)" }} /> Choose Course /
                    Modules
                  </label>
                  {MANUAL_MODULES.map((m) => (
                    <div className="form-check mb-2" style={{ paddingLeft: "1.5em" }} key={m.id}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`manual_mod_${m.id}`}
                        checked={manualChecks[m.id]}
                        disabled={m.id === "full_course" ? manualAnyOtherChecked : manualChecks.full_course}
                        onChange={(e) => toggleManualModule(m.id, e.target.checked)}
                      />
                      <label className="form-check-label text-white" style={{ fontSize: "0.85rem" }} htmlFor={`manual_mod_${m.id}`}>
                        {m.labelBase} (
                        <span className="text-warning font-weight-bold">
                          &#8377;{getCoursePrice(m.id, m.defaultPrice).toLocaleString("en-IN")}
                        </span>
                        )
                      </label>
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-3" style={{ borderLeft: "3px solid var(--primary-gold)", paddingLeft: 15 }}>
                <label className="admin-form-label mb-2">Discount (optional)</label>
                <div className="d-flex gap-2">
                  <select
                    className="admin-input"
                    style={{ maxWidth: 110 }}
                    value={manualDiscountType}
                    onChange={(e) => setManualDiscountType(e.target.value as "flat" | "percent")}
                  >
                    <option value="flat">₹ Flat</option>
                    <option value="percent">% Percent</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={manualDiscountType === "percent" ? 100 : undefined}
                    className="admin-input"
                    placeholder="0"
                    value={manualDiscountValue || ""}
                    onChange={(e) => setManualDiscountValue(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
              </div>

              <div
                className="price-summary-box mt-3 p-3"
                style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 8 }}
              >
                <div className="d-flex justify-content-between mb-1" style={{ fontSize: "0.8rem", opacity: 0.8, color: "#fff" }}>
                  <span>Base Price:</span>
                  <span>{fmtInr(manualPricing.base)}</span>
                </div>
                {manualPricing.discount > 0 && (
                  <div className="d-flex justify-content-between mb-1" style={{ fontSize: "0.8rem", color: "#2ecc71" }}>
                    <span>Discount:</span>
                    <span>− {fmtInr(manualPricing.discount)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between mb-1" style={{ fontSize: "0.8rem", opacity: 0.8, color: "#fff" }}>
                  <span>GST (18%):</span>
                  <span>{fmtInr(manualPricing.gst)}</span>
                </div>
                <div
                  className="d-flex justify-content-between pt-2 border-top"
                  style={{ fontSize: "0.9rem", fontWeight: "bold", color: "var(--primary-gold)", borderColor: "rgba(255, 255, 255, 0.1)" }}
                >
                  <span>Total Amount:</span>
                  <span>{fmtInr(manualPricing.total)}</span>
                </div>
              </div>

              <div className="modal-footer px-0 pb-0 pt-3">
                <button
                  type="button"
                  className="thm-btn cancel-btn"
                  onClick={() => setBookModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="thm-btn"
                  style={{ background: "#27ae60", borderColor: "#2ecc71" }}
                  onClick={confirmManualBook}
                  disabled={confirmingBooking}
                >
                  <CheckCircle2 size={14} className="me-1" style={ICON_STYLE} /> {confirmingBooking ? "Processing..." : "Confirm Booking"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Consolidate & Reschedule Modal */}
      {consolidateModalOpen && (
        <div className="admin-modal-overlay" style={{ display: "flex" }}>
          <div className="admin-modal" style={{ maxWidth: 680, width: "95%", margin: "20px auto" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                <GitMerge size={18} className="me-2" style={ICON_STYLE} /> Consolidate &amp; Reschedule Batches
              </h3>
              <button type="button" className="btn-close btn-close-white" onClick={() => setConsolidateModalOpen(false)}></button>
            </div>

            <div className="admin-modal-body" style={{ maxHeight: "75vh", overflowY: "auto", padding: "20px 24px" }}>
              <p className="text-muted small mb-3">
                Cancel source batches, merge their enrolled candidates into a destination batch, and optionally shift commencement dates. All changes propagate atomically to candidate dashboards with zero data loss.
              </p>

              {/* 1. Target Destination Batch */}
              <div className="mb-3">
                <label className="admin-form-label d-block mb-1" style={{ fontWeight: 600 }}>
                  1. Target Batch to Keep (Destination)
                </label>
                <select
                  className="admin-select w-100 p-2"
                  style={{ background: "var(--surface-light)", border: "1px solid rgba(224, 194, 20, 0.4)", borderRadius: 6, color: "#fff" }}
                  value={consolidateTargetId}
                  onChange={(e) => onTargetBatchChange(e.target.value)}
                >
                  {(consolidateBatches.length > 0 ? consolidateBatches : allBatches)
                    .filter((b) => !b.isCancelled)
                    .map((b) => (
                      <option key={b._id} value={b._id}>
                        Batch #{b.batchNo || b.title} ({b.mode === "offline" ? "Offline" : "Online"}) · {b.startTime ? new Date(b.startTime).toLocaleDateString("en-IN") : "No date"} ({b.bookedStudents?.length || 0}/{b.maxStudents || 50} enrolled)
                      </option>
                    ))}
                </select>
              </div>

              {/* 2. Reschedule Start Date */}
              <div className="mb-3">
                <label className="admin-form-label d-block mb-1" style={{ fontWeight: 600 }}>
                  2. Revised Commencement Date (Optional)
                </label>
                <input
                  type="date"
                  className="admin-input w-100 p-2"
                  style={{ background: "var(--surface-light)", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: 6, color: "#fff" }}
                  value={consolidateNewDate}
                  onChange={(e) => setConsolidateNewDate(e.target.value)}
                />
                <small className="text-muted">
                  Update the start date for Batch #{consolidateTargetBatch?.batchNo || consolidateTargetBatch?.title}. Both existing students and absorbed students will see this date on their dashboard.
                </small>
              </div>

              {/* 3. Source Batches to Cancel & Merge */}
              <div className="mb-3">
                <label className="admin-form-label d-block mb-1" style={{ fontWeight: 600 }}>
                  3. Source Batches to Cancel &amp; Absorb
                </label>
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 8,
                    padding: 12,
                    maxHeight: 180,
                    overflowY: "auto",
                  }}
                >
                  {(consolidateBatches.length > 0 ? consolidateBatches : allBatches)
                    .filter((b) => b._id !== consolidateTargetId && (b.mode || "online") === (consolidateTargetBatch?.mode || "online"))
                    .map((b) => (
                      <label
                        key={b._id}
                        className="d-flex align-items-center justify-content-between p-2 rounded mb-2"
                        style={{
                          background: consolidateSourceIds.includes(b._id) ? "rgba(230, 126, 34, 0.12)" : "rgba(255, 255, 255, 0.03)",
                          border: consolidateSourceIds.includes(b._id) ? "1px solid rgba(230, 126, 34, 0.4)" : "1px solid rgba(255, 255, 255, 0.05)",
                          cursor: "pointer",
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={consolidateSourceIds.includes(b._id)}
                            onChange={() => toggleSourceBatch(b._id)}
                          />
                          <span style={{ fontSize: "0.85rem" }}>
                            Batch #{b.batchNo || b.title}
                            {b.isCancelled && (
                              <span className="badge bg-danger ms-2" style={{ fontSize: "0.68rem" }}>
                                Cancelled
                              </span>
                            )}
                            <span className="text-muted ms-2">
                              · {b.startTime ? new Date(b.startTime).toLocaleDateString("en-IN") : "No date"}
                            </span>
                          </span>
                        </div>
                        <span className="badge bg-secondary" style={{ fontSize: "0.75rem" }}>
                          {b.bookedStudents?.length || 0} students
                        </span>
                      </label>
                    ))}
                  {(consolidateBatches.length > 0 ? consolidateBatches : allBatches).filter((b) => b._id !== consolidateTargetId && (b.mode || "online") === (consolidateTargetBatch?.mode || "online")).length === 0 && (
                    <p className="text-muted small mb-0 p-2">No other compatible batches available to absorb.</p>
                  )}
                </div>
                <small className="text-muted">Checked batches will be cancelled (soft-deleted) and their paid orders transferred to Batch #{consolidateTargetBatch?.batchNo || consolidateTargetBatch?.title}.</small>
              </div>

              {/* 4. Target Capacity */}
              <div className="mb-3">
                <label className="admin-form-label d-block mb-1" style={{ fontWeight: 600 }}>
                  4. Destination Batch Seat Capacity
                </label>
                <input
                  type="number"
                  min={consolidateCombinedTotal}
                  className="admin-input w-100 p-2"
                  style={{ background: "var(--surface-light)", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: 6, color: "#fff" }}
                  value={consolidateCapacity}
                  onChange={(e) => setConsolidateCapacity(Number(e.target.value))}
                />
                <small className="text-muted">Must be at least {consolidateCombinedTotal} to fit all consolidated students.</small>
              </div>

              {/* 5. In-App Notification Toggle */}
              <div className="form-check mb-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="consolidateNotifyToggle"
                  checked={consolidateNotify}
                  onChange={(e) => setConsolidateNotify(e.target.checked)}
                />
                <label className="form-check-label text-white small" htmlFor="consolidateNotifyToggle">
                  Notify all affected candidates on their dashboard with an in-app alert banner
                </label>
              </div>

              {/* 6. Summary Card */}
              <div
                className="p-3 rounded mb-2"
                style={{ background: "rgba(224, 194, 20, 0.08)", border: "1px solid rgba(224, 194, 20, 0.3)" }}
              >
                <div className="d-flex justify-content-between mb-1" style={{ fontSize: "0.85rem" }}>
                  <span className="text-muted">Target Batch:</span>
                  <span className="fw-bold text-warning">Batch #{consolidateTargetBatch?.batchNo || consolidateTargetBatch?.title}</span>
                </div>
                {consolidateNewDate && (
                  <div className="d-flex justify-content-between mb-1" style={{ fontSize: "0.85rem" }}>
                    <span className="text-muted">Revised Start Date:</span>
                    <span className="fw-bold text-white">{new Date(consolidateNewDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between mb-1" style={{ fontSize: "0.85rem" }}>
                  <span className="text-muted">Batches Absorbed:</span>
                  <span>{consolidateSourceBatches.length > 0 ? consolidateSourceBatches.map((b) => `#${b.batchNo || b.title}`).join(", ") : "None"}</span>
                </div>
                <div className="d-flex justify-content-between pt-2 border-top border-secondary" style={{ fontSize: "0.9rem" }}>
                  <span className="fw-bold text-white">Total Combined Candidates:</span>
                  <span className="fw-bold text-warning">{consolidateCombinedTotal} students</span>
                </div>
              </div>
            </div>

            <div className="modal-footer px-4 pb-4 pt-2">
              <button type="button" className="thm-btn cancel-btn" onClick={() => setConsolidateModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="thm-btn"
                style={{ background: "linear-gradient(135deg, #e67e22, #d35400)", borderColor: "#e67e22" }}
                onClick={submitConsolidation}
                disabled={savingConsolidate}
              >
                <GitMerge size={16} className="me-1" style={ICON_STYLE} /> {savingConsolidate ? "Consolidating..." : "Execute Consolidation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
