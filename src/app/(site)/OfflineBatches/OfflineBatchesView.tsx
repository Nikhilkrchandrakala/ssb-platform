"use client";

import { useEffect, useMemo, useState } from "react";
import { RAZORPAY_KEY_ID } from "@/lib/razorpayKey";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaUsers,
  FaCheckCircle,
  FaTicketAlt,
  FaBan,
  FaSearch,
  FaChalkboardTeacher,
  FaHandshake,
  FaAward,
  FaShieldAlt,
  FaLock,
} from "react-icons/fa";
import { useSiteUser } from "@/components/site/SiteUserProvider";
import OfflineJoinPanel from "@/components/site/OfflineJoinPanel";
import { postJSON, ApiError } from "@/lib/authApi";
import type { RazorpayOptions } from "@/global";
import styles from "@/style/OfflineBatchPage.module.css";

interface OfflineSlot {
  _id: string;
  title: string;
  batchNo?: string;
  startTime: string;
  maxStudents?: number;
  bookedStudents?: string[];
  location?: string;
  price?: number;
}

// Fallback only — every offline Slot has its own `price`, set (and editable
// for testing) on the admin "Create Offline Batch" form; that's what's
// actually charged (see /api/createOfflineOrder), no GST. TOTAL_COURSE_FEE
// is shown for transparency only, so a student can see what they're
// committing to before paying the registration fee; the balance is settled
// at the center, not through this checkout. ₹21,000 is already the
// all-inclusive total, not a base amount GST gets added to.
const REGISTRATION_FEE = 5000;
const TOTAL_COURSE_FEE = 21000;

const regFee = (slot: OfflineSlot) => slot.price || REGISTRATION_FEE;
const balanceFor = (fee: number) => Math.max(TOTAL_COURSE_FEE - fee, 0);


const INR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const TRUST_ITEMS = [
  { icon: FaChalkboardTeacher, label: "In-Person Training" },
  { icon: FaHandshake, label: "Expert Mentorship" },
  { icon: FaAward, label: "Hands-on Practice" },
  { icon: FaShieldAlt, label: "Secure Online Payment" },
];

const INCLUDES = ["In-person training at the center", "Direct mentor guidance", "Practical, hands-on sessions"];

const CARDS_PER_PAGE = 3;

function isPast(slot: OfflineSlot) {
  return new Date(slot.startTime).getTime() < Date.now();
}

function seatsInfo(slot: OfflineSlot) {
  const max = slot.maxStudents || 0;
  const booked = slot.bookedStudents?.length || 0;
  const available = Math.max(max - booked, 0);
  const full = max > 0 && booked >= max;
  const pctFilled = max > 0 ? Math.min(100, Math.round((booked / max) * 100)) : 0;
  return { max, booked, available, full, pctFilled };
}

export default function OfflineBatchesView() {
  const router = useRouter();
  const { user } = useSiteUser();

  const [slots, setSlots] = useState<OfflineSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"soonest" | "seats">("soonest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedBatch, setSelectedBatch] = useState<OfflineSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; finalAmount: number } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [visibleCount, setVisibleCount] = useState(CARDS_PER_PAGE);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/allSlots?mode=offline")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load batches");
        return res.json();
      })
      .then((data: OfflineSlot[]) => {
        if (!cancelled) setSlots(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setIsError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isModalOpen]);

  const visibleSlots = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = slots.filter((s) => !isPast(s));
    if (q) {
      result = result.filter(
        (s) => s.title.toLowerCase().includes(q) || (s.location || "").toLowerCase().includes(q) || (s.batchNo || "").toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((s) => new Date(s.startTime) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((s) => new Date(s.startTime) <= to);
    }
    result = [...result].sort((a, b) => {
      if (sortBy === "seats") return seatsInfo(b).available - seatsInfo(a).available;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
    return result;
  }, [slots, search, sortBy, dateFrom, dateTo]);

  const cardsShown = visibleSlots.slice(0, visibleCount);
  const hasMore = visibleCount < visibleSlots.length;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setVisibleCount(CARDS_PER_PAGE);
  };

  const handleSortChange = (value: "soonest" | "seats") => {
    setSortBy(value);
    setVisibleCount(CARDS_PER_PAGE);
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setVisibleCount(CARDS_PER_PAGE);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setVisibleCount(CARDS_PER_PAGE);
  };

  const clearDateRange = () => {
    setDateFrom("");
    setDateTo("");
    setVisibleCount(CARDS_PER_PAGE);
  };

  const openModal = (slot: OfflineSlot) => {
    const { full } = seatsInfo(slot);
    if (isPast(slot) || full) return;
    setSelectedBatch(slot);
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponError("");
    setShowAuthPanel(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBatch(null);
    setShowAuthPanel(false);
  };

  const handleAuthenticated = () => {
    setShowAuthPanel(false);
    router.refresh();
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || isApplyingCoupon || !selectedBatch) return;
    // Coupon validity is checked per-account (has this user already used it),
    // so it needs a session — a guest hasn't registered yet at this point in
    // the modal (that only happens when they hit Pay). Route them into
    // registration instead of a confusing 401 from the API.
    if (!user) {
      setShowAuthPanel(true);
      return;
    }
    setIsApplyingCoupon(true);
    setCouponError("");
    try {
      const result = await postJSON<{ discount: number; finalAmount: number; couponCode: string }>("/api/previewOfflineCoupon", {
        couponCode: couponCode.trim(),
        slotId: selectedBatch._id,
      });
      setAppliedCoupon({ code: result.couponCode, discount: result.discount, finalAmount: result.finalAmount });
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof ApiError ? err.message : "Could not apply coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const handlePayment = async () => {
    if (!user) {
      setShowAuthPanel(true);
      return;
    }
    if (!selectedBatch || isPaying) return;
    setIsPaying(true);

    try {
      if (typeof window === "undefined" || !window.Razorpay) {
        toast.error("Payment gateway is still loading. Please try again in a moment.");
        return;
      }

      const order = await postJSON<{ orderId: string; amount: number }>("/api/createOfflineOrder", {
        slotId: selectedBatch._id,
        couponCode: appliedCoupon?.code || null,
      });

      const options: RazorpayOptions = {
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        order_id: order.orderId,
        name: "SSB with ISV — Offline Batch Registration",
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
          ondismiss: () => setIsPaying(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Payment failed");
      setIsPaying(false);
    }
  };

  const selectedFee = selectedBatch ? regFee(selectedBatch) : 0;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <button className={styles.backButton} onClick={() => router.push("/JoinSSB")}>
          <FaArrowLeft /> <span>Back</span>
        </button>
        <span className={styles.heroBadge}>
          <FaMapMarkerAlt /> Offline / In-Person Training
        </span>
        <h1 className={styles.heroTitle}>Offline SSB Batches</h1>
        <p className={styles.heroSubtitle}>
          Total course fee is {INR(TOTAL_COURSE_FEE)} (all-inclusive). Pay a small registration fee online (from{" "}
          {INR(REGISTRATION_FEE)}) to secure your seat — the balance is settled directly at the training center.
        </p>
        <div className={styles.trustBar}>
          {TRUST_ITEMS.map((item) => (
            <span className={styles.trustItem} key={item.label}>
              <item.icon /> {item.label}
            </span>
          ))}
        </div>
      </div>

      {!isLoading && !isError && slots.length > 0 && (
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <FaSearch />
            <input
              className={styles.searchInput}
              placeholder="Search by batch, location..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <select className={styles.sortSelect} value={sortBy} onChange={(e) => handleSortChange(e.target.value as "soonest" | "seats")}>
            <option value="soonest">Sort: Starting Soonest</option>
            <option value="seats">Sort: Most Seats Available</option>
          </select>
          <div className={styles.dateRangeBox}>
            <input
              type="date"
              className={styles.dateInput}
              value={dateFrom}
              onChange={(e) => handleDateFromChange(e.target.value)}
              title="Starts on/after"
            />
            <span className={styles.dateRangeSep}>to</span>
            <input
              type="date"
              className={styles.dateInput}
              value={dateTo}
              onChange={(e) => handleDateToChange(e.target.value)}
              title="Starts on/before"
            />
            {(dateFrom || dateTo) && (
              <button type="button" className={styles.clearDateBtn} onClick={clearDateRange}>
                Clear
              </button>
            )}
          </div>
          <span className={styles.resultCount}>
            {visibleSlots.length} batch{visibleSlots.length === 1 ? "" : "es"} found
          </span>
        </div>
      )}

      {isLoading ? (
        <div className={styles.stateBlock}>
          <div className={styles.spinner} />
        </div>
      ) : isError ? (
        <div className={styles.stateBlock}>
          <FaBan size={40} />
          <h3>Couldn&apos;t load batches</h3>
          <p>Please try again in a moment.</p>
        </div>
      ) : visibleSlots.length === 0 ? (
        <div className={styles.stateBlock}>
          <FaCalendarAlt size={48} />
          <h3>{slots.length === 0 ? "No offline batches scheduled right now" : "No batches match your search"}</h3>
          <p>{slots.length === 0 ? "Check back soon, or browse our online batches instead." : "Try a different search term."}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {cardsShown.map((slot) => {
            const date = new Date(slot.startTime);
            const day = date.getDate();
            const monthYear = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
            const { max, available, full, pctFilled } = seatsInfo(slot);
            const lowSeats = !full && max > 0 && available <= Math.max(2, Math.round(max * 0.15));

            return (
              <div key={slot._id} className={`${styles.card} ${full ? styles.cardDisabled : ""}`}>
                <div className={styles.cardTop}>
                  <div className={styles.dateTile}>
                    <span className={styles.dateTileDay}>{day}</span>
                    <span className={styles.dateTileMonth}>{monthYear}</span>
                  </div>
                  <div className={styles.cardHeaderText}>
                    <span className={styles.offlineTag}>
                      <FaMapMarkerAlt size={9} /> Offline
                    </span>
                    <h3 className={styles.cardTitle} title={slot.title}>
                      {slot.title}
                    </h3>
                    {slot.batchNo && <span className={styles.cardBatchNo}>Batch #{slot.batchNo}</span>}
                  </div>
                </div>

                {slot.location && (
                  <div className={styles.cardLocation}>
                    <FaMapMarkerAlt /> {slot.location}
                  </div>
                )}

                <div className={styles.seatsSection}>
                  <div className={styles.seatsRow}>
                    <span>Seats filled</span>
                    <span className={full ? styles.seatsFullText : lowSeats ? styles.seatsUrgent : ""}>
                      {full ? "Batch Full" : lowSeats ? `Only ${available} left!` : `${available} of ${max} left`}
                    </span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={`${styles.progressFill} ${full ? styles.progressFillFull : lowSeats ? styles.progressFillWarn : ""}`}
                      style={{ width: `${pctFilled}%` }}
                    />
                  </div>
                </div>

                <ul className={styles.featureList}>
                  {INCLUDES.map((item) => (
                    <li key={item}>
                      <FaCheckCircle /> {item}
                    </li>
                  ))}
                </ul>

                <div className={styles.cardFooter}>
                  <div className={styles.priceLine}>
                    <div>
                      <div className={styles.priceValue}>{INR(regFee(slot))}</div>
                      <div className={styles.priceLabel}>Pay Now — Registration Fee</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{INR(TOTAL_COURSE_FEE)} total</div>
                      <div className={styles.priceLabel}>all-inclusive</div>
                    </div>
                  </div>
                  <button className={styles.cardCta} disabled={full} onClick={() => openModal(slot)}>
                    {full ? (
                      <>
                        <FaBan /> Batch Full
                      </>
                    ) : (
                      <>
                        <FaCheckCircle /> Register Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !isError && hasMore && (
        <div style={{ textAlign: "center", marginTop: 30 }}>
          <button className={styles.seeMoreBtn} onClick={() => setVisibleCount((c) => c + CARDS_PER_PAGE)}>
            See More Batches ({visibleSlots.length - visibleCount} more)
          </button>
        </div>
      )}

      {isModalOpen && selectedBatch && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeModal}>
              ×
            </button>
            <div className={styles.modalBody}>
              <div className={styles.modalEyebrow}>Offline Batch Registration</div>
              <h2 className={styles.modalTitle}>{selectedBatch.title}</h2>

              <div className={styles.modalMetaGrid}>
                <div className={styles.modalMetaCell}>
                  <div className={styles.modalMetaLabel}>
                    <FaCalendarAlt /> Start Date
                  </div>
                  <div className={styles.modalMetaValue}>
                    {new Date(selectedBatch.startTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
                <div className={styles.modalMetaCell}>
                  <div className={styles.modalMetaLabel}>
                    <FaUsers /> Seats Left
                  </div>
                  <div className={styles.modalMetaValue}>{seatsInfo(selectedBatch).available}</div>
                </div>
                {selectedBatch.location && (
                  <div className={styles.modalMetaCell} style={{ gridColumn: "1 / -1" }}>
                    <div className={styles.modalMetaLabel}>
                      <FaMapMarkerAlt /> Location
                    </div>
                    <div className={styles.modalMetaValue}>{selectedBatch.location}</div>
                  </div>
                )}
              </div>

              {showAuthPanel ? (
                <OfflineJoinPanel onAuthenticated={handleAuthenticated} onBack={() => setShowAuthPanel(false)} />
              ) : (
                <>
                  <div className={styles.modalIncludes}>
                    <div className={styles.modalIncludesTitle}>Fee Breakdown</div>
                    <div className={styles.priceRow} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
                      <span>Total Course Fee (all-inclusive)</span>
                      <strong style={{ color: "#fff" }}>{INR(TOTAL_COURSE_FEE)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
                      <span>Registration Fee (pay now)</span>
                      <strong style={{ color: "#2ecc71" }}>− {INR(selectedFee)}</strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13.5,
                        color: "rgba(255,255,255,0.85)",
                        paddingTop: 8,
                        borderTop: "1px dashed rgba(255,255,255,0.1)",
                        fontWeight: 700,
                      }}
                    >
                      <span>Balance Payable at Center</span>
                      <span>{INR(balanceFor(selectedFee))}</span>
                    </div>
                  </div>

                  {appliedCoupon ? (
                    <div className={styles.appliedCouponRow}>
                      <span>
                        <FaCheckCircle style={{ marginRight: 6, color: "#2ecc71" }} />
                        <strong>{appliedCoupon.code}</strong> applied — you save {INR(appliedCoupon.discount)}
                      </span>
                      <button type="button" className={styles.removeCouponBtn} onClick={handleRemoveCoupon}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className={styles.couponRow}>
                      <input
                        type="text"
                        className={styles.couponInput}
                        placeholder="COUPON CODE (optional)"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponError("");
                        }}
                      />
                      <button type="button" className={styles.applyCouponBtn} onClick={handleApplyCoupon} disabled={isApplyingCoupon || !couponCode.trim()}>
                        {isApplyingCoupon ? "Applying..." : "Apply"}
                      </button>
                    </div>
                  )}
                  {couponError && <p className={styles.couponErrorText}>{couponError}</p>}

                  <div className={styles.priceSummaryBox}>
                    <span className={styles.priceSummaryLabel}>
                      <FaTicketAlt style={{ marginRight: 6 }} /> Pay Now
                    </span>
                    <span style={{ textAlign: "right" }}>
                      {appliedCoupon && (
                        <span className={styles.priceStrike}>{INR(selectedFee)}</span>
                      )}
                      <span className={styles.priceSummaryValue} style={{ display: "block" }}>
                        {INR(appliedCoupon ? appliedCoupon.finalAmount : selectedFee)}
                      </span>
                    </span>
                  </div>

                  <button className={styles.confirmBtn} onClick={handlePayment} disabled={isPaying}>
                    {isPaying
                      ? "Processing..."
                      : `Pay ${INR(appliedCoupon ? appliedCoupon.finalAmount : selectedFee)} & Register`}
                  </button>
                  <p className={styles.secureNote}>
                    <FaLock /> Secured by Razorpay
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
