"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  FaTimes,
  FaClock,
  FaArrowRight,
  FaCheckCircle,
  FaUsers,
  FaBookOpen,
  FaTicketAlt,
  FaTrash,
  FaPercent,
  FaCalendarAlt,
  FaSun,
  FaMoon,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaArrowLeft,
  FaStar,
} from "react-icons/fa";
import { useSiteUser } from "@/components/site/SiteUserProvider";
import { postJSON, ApiError } from "@/lib/authApi";
import type { RazorpayOptions } from "@/global";
import { isBookingClosed, formatTimeRemaining, formatRealStartTime } from "@/lib/batchTiming";
import styles from "@/style/BatchPage.module.css";

interface Slot {
  _id: string;
  title: string;
  batchNo?: string;
  startTime: string;
  endTime: string;
  maxStudents?: number;
  bookedStudents?: string[];
  price: number;
  isFullCourse: boolean;
}

interface DbCourseInfo {
  courseId: string;
  price: number;
  title?: string;
}

interface CourseModule {
  id: string;
  name: string;
  price: number;
}

interface AppliedCoupon {
  code: string;
  discount: number;
  finalAmount: number;
}

const DEFAULT_MODULES: CourseModule[] = [
  { id: "ssb_ppdt", name: "Introduction to SSB & PPDT, Stage 1 Process", price: 1999 },
  { id: "psych", name: "Psychology Test Preparation Program", price: 3499 },
  { id: "interview", name: "Interview Theory Course and Mock Interview", price: 2499 },
  { id: "group_testing", name: "Group Testing Course on VTX", price: 7999 },
  { id: "full_course", name: "10 days Services Selection Board Hackathon (Full Course)", price: 12499 },
];

// Razorpay's public key_id is not a secret (mirrors the server-side RAZORPAY_KEY_ID env var
// used by /api/createOrder) — kept as the same literal the legacy site used.
const RAZORPAY_KEY_ID = "rzp_live_SdgMS7X9M3RZSi";

export default function BatchesView() {
  const router = useRouter();
  const { user } = useSiteUser();

  const [slotsData, setSlotsData] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [isSlotsError, setIsSlotsError] = useState(false);

  const [selectedBatch, setSelectedBatch] = useState<Slot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatchType, setSelectedBatchType] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Ticks once a minute so every "time left to book" label on this page
  // stays live without needing a full data refetch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Coupon states (declared here, ahead of the pending-batch-restore effect below, since
  // that effect needs to call setCouponCode).
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // Keep the body scroll lock in sync with the booking modal — an effect rather than
  // toggling it inline inside openModal/closeModal, so it stays correct however the modal
  // gets opened (including the pending-batch restore below) and is always reverted on
  // unmount.
  useEffect(() => {
    document.body.style.overflow = isModalOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isModalOpen]);

  // Restore a booking attempt that was interrupted by a redirect to /SignUp.
  useEffect(() => {
    const pendingBatchData = localStorage.getItem("pendingBatch");
    if (pendingBatchData && user) {
      try {
        const batch = JSON.parse(pendingBatchData) as Slot;
        const pendingCoupon = localStorage.getItem("pendingCoupon");

        localStorage.removeItem("pendingBatch");
        localStorage.removeItem("pendingCoupon");

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedBatch(batch);
        if (pendingCoupon) {
          setCouponCode(pendingCoupon);
        }
        setIsModalOpen(true);
      } catch (e) {
        console.error("Error parsing pending batch", e);
        localStorage.removeItem("pendingBatch");
      }
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/allSlots")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load slots");
        return res.json();
      })
      .then((data: Slot[]) => {
        if (!cancelled) {
          setSlotsData(Array.isArray(data) ? data : []);
          setIsSlotsError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsSlotsError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [courseModules, setCourseModules] = useState<CourseModule[]>(DEFAULT_MODULES);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/allCourses")
      .then((res) => (res.ok ? res.json() : []))
      .then((dbCourses: DbCourseInfo[]) => {
        if (cancelled || !Array.isArray(dbCourses)) return;
        setCourseModules((prev) =>
          prev.map((mod) => {
            const match = dbCourses.find((c) => c.courseId === mod.id);
            return match ? { ...mod, price: match.price, name: match.title || mod.name } : mod;
          })
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const fullCoursePrice = courseModules.find((m) => m.id === "full_course")?.price || 12499;
  const ssbPpdtPrice = courseModules.find((m) => m.id === "ssb_ppdt")?.price || 1999;
  const psychPrice = courseModules.find((m) => m.id === "psych")?.price || 3499;
  const interviewPrice = courseModules.find((m) => m.id === "interview")?.price || 2499;
  const groupTestingPrice = courseModules.find((m) => m.id === "group_testing")?.price || 7999;
  const individualSum = courseModules.filter((m) => m.id !== "full_course").reduce((sum, m) => sum + m.price, 0);

  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const getCalculatedPrice = () => {
    if (!selectedBatch) return 0;

    if (selectedBatch.isFullCourse) {
      if (selectedModules.includes("full_course")) {
        return fullCoursePrice;
      }

      const individualSelectedCount = selectedModules.filter((id) => id !== "full_course").length;
      if (individualSelectedCount === 4) {
        return fullCoursePrice;
      }

      let sum = 0;
      courseModules.forEach((mod) => {
        if (mod.id !== "full_course" && selectedModules.includes(mod.id)) {
          sum += mod.price;
        }
      });
      return sum;
    }
    return selectedBatch.price || 0;
  };

  const handleModuleToggle = (moduleId: string) => {
    let updated: string[];
    if (moduleId === "full_course") {
      updated = selectedModules.includes("full_course") ? [] : ["full_course"];
    } else {
      if (selectedModules.includes("full_course")) return;

      updated = selectedModules.includes(moduleId)
        ? selectedModules.filter((id) => id !== moduleId)
        : [...selectedModules, moduleId];
    }
    setSelectedModules(updated);

    const isFullCourseSelected = updated.includes("full_course") || updated.filter((id) => id !== "full_course").length === 4;
    if (!isFullCourseSelected) {
      resetCouponStateOnly();
    }
  };

  const slots = slotsData;

  const groupSlotsByMonth = (slotList: Slot[]) => {
    const grouped: Record<string, { year: number; month: number; monthName: string; slots: Slot[] }> = {};

    slotList.forEach((slot) => {
      if (!slot.startTime) return;
      const date = new Date(slot.startTime);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthKey = `${year}-${month}`;

      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          year,
          month,
          monthName: date.toLocaleString("default", { month: "long" }),
          slots: [],
        };
      }

      grouped[monthKey].slots.push(slot);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });

    return grouped;
  };

  const filteredSlots = slots?.filter((slot) => {
    const matchesBatchType = selectedBatchType === "all" || slot.title === selectedBatchType;
    const slotDate = new Date(slot.startTime);
    const matchesMonth = slotDate.getMonth() === selectedMonth && slotDate.getFullYear() === selectedYear;
    return matchesBatchType && matchesMonth;
  });

  const groupedSlots = groupSlotsByMonth(filteredSlots || []);
  const currentMonthSlots = groupedSlots[`${selectedYear}-${selectedMonth}`] || { slots: [] as Slot[] };

  const availableMonths = [
    ...new Set(
      slots
        .map((slot) => {
          if (!slot.startTime) return null;
          const date = new Date(slot.startTime);
          return `${date.getFullYear()}-${date.getMonth()}`;
        })
        .filter((v): v is string => Boolean(v))
    ),
  ].sort();

  const canGoPrev =
    availableMonths.length > 0 &&
    availableMonths.some((m) => {
      const [year, month] = m.split("-");
      return parseInt(year) < selectedYear || (parseInt(year) === selectedYear && parseInt(month) < selectedMonth);
    });

  const canGoNext =
    availableMonths.length > 0 &&
    availableMonths.some((m) => {
      const [year, month] = m.split("-");
      return parseInt(year) > selectedYear || (parseInt(year) === selectedYear && parseInt(month) > selectedMonth);
    });

  const goToPrevMonth = () => {
    const prevMonths = availableMonths.filter((m) => {
      const [year, month] = m.split("-");
      return parseInt(year) < selectedYear || (parseInt(year) === selectedYear && parseInt(month) < selectedMonth);
    });
    if (prevMonths.length > 0) {
      const lastPrev = prevMonths[prevMonths.length - 1];
      const [year, month] = lastPrev.split("-");
      setSelectedYear(parseInt(year));
      setSelectedMonth(parseInt(month));
    }
  };

  const goToNextMonth = () => {
    const nextMonths = availableMonths.filter((m) => {
      const [year, month] = m.split("-");
      return parseInt(year) > selectedYear || (parseInt(year) === selectedYear && parseInt(month) > selectedMonth);
    });
    if (nextMonths.length > 0) {
      const firstNext = nextMonths[0];
      const [year, month] = firstNext.split("-");
      setSelectedYear(parseInt(year));
      setSelectedMonth(parseInt(month));
    }
  };

  const formatDateTime = (slot: Slot) => formatRealStartTime(slot);

  const isSlotFull = (slot: Slot) => {
    if (!slot.maxStudents) return false;
    const bookedCount = slot.bookedStudents?.length || 0;
    return bookedCount >= slot.maxStudents;
  };

  const handlePayment = async () => {
    if (isPaying) return;
    setIsPaying(true);

    try {
      if (!user) {
        localStorage.setItem("pendingBatch", JSON.stringify(selectedBatch));
        if (appliedCoupon) {
          localStorage.setItem("pendingCoupon", appliedCoupon.code);
        }
        router.push("/SignUp");
        return;
      }

      if (!selectedBatch) {
        toast.error("No batch selected");
        return;
      }

      if (isSlotFull(selectedBatch)) {
        toast.error("Batch full");
        return;
      }

      if (isBookingClosed(selectedBatch)) {
        toast.error("Booking closed");
        return;
      }

      if (typeof window === "undefined" || !window.Razorpay) {
        toast.error("Payment gateway is still loading. Please try again in a moment.");
        return;
      }

      if (selectedModules.length === 0) {
        toast.error("Please select at least one module to proceed.");
        return;
      }

      const referralCode = localStorage.getItem("referralCode");

      const order = await postJSON<{ orderId: string; amount: number }>("/api/createOrder", {
        slotId: selectedBatch._id,
        referralCode: referralCode || null,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        selectedModules,
      });

      const options: RazorpayOptions = {
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        order_id: order.orderId,

        handler: async (response) => {
          try {
            await postJSON("/api/verifyPayment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            router.push("/Success");
            closeModal();
          } catch {
            toast.error("Verification failed");
          } finally {
            setIsPaying(false);
          }
        },

        modal: {
          ondismiss: () => {
            setIsPaying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof ApiError ? err.message : "Payment failed");
      setIsPaying(false);
    }
  };

  const getBatchTotalWithGST = () => {
    const price = getCalculatedPrice();
    const gst = price * 0.18;
    return price + gst;
  };

  const openModal = (slot: Slot) => {
    if (isBookingClosed(slot)) {
      toast.error("Booking is no longer available for this batch.");
      return;
    }
    setSelectedBatch(slot);
    resetCouponState();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBatch(null);
    resetCouponState();
  };

  const resetCouponStateOnly = () => {
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setFinalAmount(0);
    setCouponError("");
    setCouponSuccess("");
    setIsApplyingCoupon(false);
  };

  const resetCouponState = () => {
    resetCouponStateOnly();
    setSelectedModules([]);
  };

  const handleApplyCoupon = async () => {
    if (!user) {
      if (selectedBatch) localStorage.setItem("pendingBatch", JSON.stringify(selectedBatch));
      localStorage.setItem("pendingCoupon", couponCode.toUpperCase());
      router.push("/SignUp");
      return;
    }

    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    if (!selectedBatch) {
      setCouponError("No batch selected");
      return;
    }

    if (!selectedBatch.isFullCourse) {
      setCouponError("Coupons are only valid for the Full Course");
      return;
    }

    const originalAmount = selectedBatch.isFullCourse ? fullCoursePrice : selectedBatch.price;

    if (appliedCoupon && appliedCoupon.code === couponCode.toUpperCase()) {
      setCouponError("This coupon is already applied");
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError("");
    setCouponSuccess("");

    try {
      const response = await postJSON<{ discount: number; finalAmount: number; couponCode: string }>("/api/applyCoupon", {
        code: couponCode,
        amount: originalAmount,
        slotId: selectedBatch._id,
      });

      setAppliedCoupon({
        code: response.couponCode,
        discount: response.discount,
        finalAmount: response.finalAmount,
      });
      setCouponDiscount(response.discount);
      setFinalAmount(response.finalAmount);
      setCouponSuccess(`Coupon applied! You saved ₹${response.discount.toFixed(2)}`);
      setCouponCode("");
    } catch (error) {
      console.error("Coupon error:", error);
      setCouponError(error instanceof ApiError ? error.message : "Invalid or expired coupon");
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setFinalAmount(0);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    resetCouponState();
  };

  if (isLoadingSlots) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner}></div>
        <p>Loading batches...</p>
      </div>
    );
  }

  if (isSlotsError) {
    return (
      <div className={styles.errorContainer}>
        <i className="fas fa-exclamation-triangle"></i>
        <p>Unable to load batches. Please try again.</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => router.back()}>
          <FaArrowLeft />
        </button>
        <h1 className={styles.title}>Ongoing Online SSB Batches</h1>
      </div>

      <div className={styles.introContainer}>
        <p className={styles.introDescription}>
          Our flagship SSB preparation program is a <span className={styles.introHighlight}>10-day online SSB Hackathon</span> (Intro
          to SSB & Stage 1+ Psych Test Prep + Mock Psych Test & feedback + Interview Prep + Mock Interview & feedback + GTO Course on
          VTX<sup>TM</sup> & feedback).
          <br />
          You can sign up for the full 10-day online SSB Hackathon batch or individual modules in a particular batch.
        </p>
        <div className={styles.modulesGrid}>
          <div className={styles.moduleCard}>
            <div className={styles.moduleNumber}>1</div>
            <div className={styles.moduleName}>Full 10-day SSB Hackathon</div>
            <div className={styles.modulePrice}>
              <span>₹{fullCoursePrice.toLocaleString("en-IN")}</span>
              <span className={styles.gstText}>+ 18% GST</span>
            </div>
          </div>
          <div className={styles.moduleCard}>
            <div className={styles.moduleNumber}>2</div>
            <div className={styles.moduleName}>Intro to SSB, PPDT & Stage 1 Process</div>
            <div className={styles.modulePrice}>
              <span>₹{ssbPpdtPrice.toLocaleString("en-IN")}</span>
              <span className={styles.gstText}>+ 18% GST</span>
            </div>
          </div>
          <div className={styles.moduleCard}>
            <div className={styles.moduleNumber}>3</div>
            <div className={styles.moduleName}>Psych Test Prep Program</div>
            <div className={styles.modulePrice}>
              <span>₹{psychPrice.toLocaleString("en-IN")}</span>
              <span className={styles.gstText}>+ 18% GST</span>
            </div>
          </div>
          <div className={styles.moduleCard}>
            <div className={styles.moduleNumber}>4</div>
            <div className={styles.moduleName}>Interview theory course and Mock Interview</div>
            <div className={styles.modulePrice}>
              <span>₹{interviewPrice.toLocaleString("en-IN")}</span>
              <span className={styles.gstText}>+ 18% GST</span>
            </div>
          </div>
          <div className={styles.moduleCard}>
            <div className={styles.moduleNumber}>5</div>
            <div className={styles.moduleName}>
              GTO course on VTX<sup>TM</sup>
            </div>
            <div className={styles.modulePrice}>
              <span>₹{groupTestingPrice.toLocaleString("en-IN")}</span>
              <span className={styles.gstText}>+ 18% GST</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.filterBar}>
        <h2 className={styles.currentMonth}>
          {new Date(selectedYear, selectedMonth).toLocaleString("default", { month: "long" })} {selectedYear}
        </h2>

        <div className={styles.filterRight}>
          <div className={styles.batchTypeFilter}>
            <FaFilter className={styles.filterIcon} />
            <select
              value={selectedBatchType}
              onChange={(e) => setSelectedBatchType(e.target.value)}
              className={styles.batchTypeSelect}
            >
              <option value="all">All Batches</option>
              <option value="Morning Batch">Morning Batch</option>
              <option value="Evening Batch">Evening Batch</option>
            </select>
          </div>

          <div className={styles.monthNavButtons}>
            <button onClick={goToPrevMonth} disabled={!canGoPrev} className={styles.iconNavBtn} title="Previous Month">
              <FaChevronLeft />
            </button>
            <button onClick={goToNextMonth} disabled={!canGoNext} className={styles.iconNavBtn} title="Next Month">
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      {currentMonthSlots.slots.length > 0 ? (
        <div className={styles.batchesGrid}>
          {currentMonthSlots.slots.map((batch) => {
            const isFull = isSlotFull(batch);
            const isMorning = batch.title?.toLowerCase().includes("morning");
            const batchIcon = isMorning ? <FaSun /> : <FaMoon />;
            const batchClass = isMorning ? styles.morningBatch : styles.eveningBatch;

            const isClosed = isBookingClosed(batch, now);
            const disableBooking = isFull || isClosed;

            const timeRemaining = !isClosed ? formatTimeRemaining(batch, now) : null;
            const seatsLeft = (batch.maxStudents || 0) - (batch.bookedStudents?.length || 0);

            return (
              <div
                key={batch._id}
                className={`${styles.batchCard} ${isFull ? styles.batchFull : ""}`}
                onClick={() => !isFull && !isClosed && openModal(batch)}
              >
                <div className={styles.batchHeader}>
                  <div className={styles.batchTime}>
                    <FaClock />
                    <span>{formatDateTime(batch)}</span>
                  </div>

                  <p className={`${styles.batchTitle} ${batchClass}`}>
                    {batchIcon} {batch.title} {batch.batchNo ? `(#${batch.batchNo})` : ""}
                  </p>
                </div>

                {!isClosed && !isFull && timeRemaining && <div className={styles.cutoffMessageUrgent}>⏰ {timeRemaining}</div>}

                {isClosed && <div className={styles.cutoffMessageClosed}>❌ Booking Closed</div>}

                {!isClosed && !isFull && (
                  <div className={styles.batchStats}>
                    <div className={styles.stat}>
                      <FaUsers />
                      <span>{seatsLeft > 0 ? `${seatsLeft} Seats Left` : "Limited Seats Available"}</span>
                    </div>
                  </div>
                )}

                <button
                  className={`${styles.bookBtn} ${disableBooking ? styles.disabled : ""}`}
                  disabled={disableBooking}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disableBooking) openModal(batch);
                  }}
                >
                  {isFull ? "Batch Full" : isClosed ? "Booking Closed" : "Book Now"} <FaArrowRight />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.noBatches}>
          <FaCalendarAlt className={styles.noBatchesIcon} />
          <h3>No batches available</h3>
          <p>
            No batches found for {new Date(selectedYear, selectedMonth).toLocaleString("default", { month: "long" })} {selectedYear}
          </p>
        </div>
      )}

      {isModalOpen && selectedBatch && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeModal}>
              <FaTimes />
            </button>

            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>{selectedBatch.title}</h2>
                <div className={styles.modalMeta}>
                  <div className={styles.metaItem}>
                    <FaCalendarAlt />
                    <span>Start: {formatDateTime(selectedBatch)}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <FaClock />
                    <span>
                      {isBookingClosed(selectedBatch, now) ? "❌ Booking Closed" : `⏰ ${formatTimeRemaining(selectedBatch, now)}`}
                    </span>
                  </div>
                  {selectedBatch.batchNo && (
                    <div className={styles.metaItem}>
                      <FaBookOpen />
                      <span>Batch No: #{selectedBatch.batchNo}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalAvailability}>
                <h4>
                  <FaUsers /> Seat Availability
                </h4>
                <div className={styles.availabilityStats}>
                  <div className={`${styles.statRow} ${styles.highlight}`}>
                    <span>Status:</span>
                    <strong className={styles.availableCount}>Limited Seats Available</strong>
                  </div>
                </div>
              </div>

              {selectedBatch.isFullCourse && (
                <div className={styles.modalModules}>
                  <h4 style={{ marginBottom: "15px" }}>
                    <FaBookOpen /> Choose your Course
                  </h4>
                  <ul className={styles.moduleList} style={{ listStyle: "none", padding: 0 }}>
                    {courseModules.map((mod) => {
                      const isGreyedOut = mod.id !== "full_course" && selectedModules.includes("full_course");
                      return (
                        <li
                          key={mod.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "10px",
                            background: "rgba(255,255,255,0.03)",
                            padding: "10px 15px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255,255,255,0.05)",
                            opacity: isGreyedOut ? 0.4 : 1,
                            transition: "opacity 0.2s ease-in-out",
                          }}
                        >
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              cursor: isGreyedOut ? "not-allowed" : "pointer",
                              margin: 0,
                              color: "#fff",
                              fontSize: "14px",
                              width: "100%",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedModules.includes(mod.id)}
                              onChange={() => handleModuleToggle(mod.id)}
                              disabled={isGreyedOut}
                              style={{
                                marginRight: "12px",
                                width: "18px",
                                height: "18px",
                                accentColor: "#C5A028",
                                cursor: isGreyedOut ? "not-allowed" : "pointer",
                              }}
                            />
                            {mod.id === "group_testing" ? (
                              <span>
                                Group Testing Course on VTX<sup>TM</sup>
                              </span>
                            ) : (
                              mod.name
                            )}
                          </label>
                          <span style={{ color: "#C5A028", fontWeight: "bold", fontSize: "14px", whiteSpace: "nowrap", marginLeft: "10px" }}>
                            ₹{mod.price.toLocaleString("en-IN")}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {selectedModules.filter((id) => id !== "full_course").length === 4 && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "rgba(255,255,255,0.5)",
                        background: "rgba(197, 160, 40, 0.1)",
                        border: "1px solid rgba(197, 160, 40, 0.2)",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        marginTop: "10px",
                      }}
                    >
                      🎉 <strong>Full Bundle Discount Applied!</strong> Price reduced from ₹{individualSum.toLocaleString("en-IN")} to ₹
                      {fullCoursePrice.toLocaleString("en-IN")}.
                    </div>
                  )}
                </div>
              )}

              {selectedBatch.isFullCourse &&
              (selectedModules.includes("full_course") || selectedModules.filter((id) => id !== "full_course").length === 4) ? (
                <div className={styles.modalCoupon}>
                  <h4>
                    <FaTicketAlt /> Apply Coupon
                  </h4>
                  <div className={styles.couponInputGroup}>
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      disabled={!!appliedCoupon}
                      className={styles.couponInput}
                    />
                    {!appliedCoupon ? (
                      <button onClick={handleApplyCoupon} disabled={isApplyingCoupon || !couponCode.trim()} className={styles.applyCouponBtn}>
                        {isApplyingCoupon ? "Applying..." : "Apply"}
                      </button>
                    ) : (
                      <button onClick={handleRemoveCoupon} className={styles.removeCouponBtn}>
                        <FaTrash /> Remove
                      </button>
                    )}
                  </div>

                  {couponError && (
                    <div className={styles.couponError}>
                      <FaTimes />
                      <span>{couponError}</span>
                    </div>
                  )}

                  {couponSuccess && (
                    <div className={styles.couponSuccess}>
                      <FaCheckCircle />
                      <span>{couponSuccess}</span>
                    </div>
                  )}

                  {appliedCoupon && (
                    <div className={styles.appliedCoupon}>
                      <div className={styles.couponBadge}>
                        <FaPercent />
                        <span>
                          Coupon <strong>{appliedCoupon.code}</strong> applied
                        </span>
                      </div>
                      <div className={styles.savedAmount}>
                        You saved <strong>₹{appliedCoupon.discount.toFixed(2)}</strong>!
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.modalCouponDisabled}>
                  <p style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "14px", margin: 0 }}>
                    <FaTicketAlt style={{ marginRight: "8px" }} />
                    Coupons are only valid for the Full Course bundle.
                  </p>
                </div>
              )}

              <div className={styles.modalFooter}>
                <div className={styles.priceSummary}>
                  <div className={styles.priceRow}>
                    <span>Base Price:</span>
                    <span>₹{getCalculatedPrice().toFixed(2)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className={`${styles.priceRow} ${styles.discount}`}>
                      <span>Discount:</span>
                      <span className={styles.discountAmount}>- ₹{couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={styles.priceRow}>
                    <span>GST (18%):</span>
                    <span>₹{((getCalculatedPrice() - (appliedCoupon ? couponDiscount : 0)) * 0.18).toFixed(2)}</span>
                  </div>
                  <div className={`${styles.priceRow} ${styles.total}`}>
                    <span>Total Amount</span>
                    <strong>₹{(appliedCoupon ? finalAmount : getBatchTotalWithGST()).toFixed(2)}</strong>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  className={styles.confirmBookBtn}
                  disabled={isPaying || isSlotFull(selectedBatch) || isBookingClosed(selectedBatch, now)}
                >
                  {isSlotFull(selectedBatch)
                    ? "Batch Full"
                    : isBookingClosed(selectedBatch, now)
                      ? "Booking Closed"
                      : "Proceed to Checkout"}{" "}
                  <FaArrowRight />
                </button>

                <div className={styles.modalNote}>
                  <span>
                    <FaStar /> Proceeding to checkout will prompt you to create an account. Account creation is mandatory to see your
                    course progress, access Psych Test and VTX<sup>TM</sup>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
