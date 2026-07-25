"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BiArrowBack, BiCreditCard, BiDetail } from "react-icons/bi";
import { FaCreditCard, FaCheckCircle, FaTimesCircle, FaClock, FaExclamationCircle, FaCalendarAlt } from "react-icons/fa";
import { MdPending, MdReceipt } from "react-icons/md";
import CustomButton from "@/components/site/CustomButton";
import "@/style/custom-theme.css";
import styles from "@/style/PaymentHistory.module.css";

interface OrderSlot {
  _id: string;
  title?: string;
  batchNo?: string;
  isFullCourse?: boolean;
}

export interface PaymentHistoryOrder {
  _id: string;
  slotId?: OrderSlot | null;
  price?: number;
  orderId?: string;
  paymentId?: string;
  couponCode?: string;
  bookingMethod?: string;
  status?: "pending" | "paid" | "failed";
  createdAt?: string;
}

type FilterStatus = "all" | "paid" | "pending" | "failed";

function formatDate(dateString?: string) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(dateString?: string) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function getStatusIcon(status?: string) {
  switch (status) {
    case "paid":
      return <FaCheckCircle />;
    case "pending":
      return <MdPending />;
    case "failed":
      return <FaTimesCircle />;
    default:
      return <FaClock />;
  }
}

function getStatusColor(status?: string) {
  switch (status) {
    case "paid":
      return "#10b981";
    case "pending":
      return "#f59e0b";
    case "failed":
      return "#ef4444";
    default:
      return "#64748b";
  }
}

function getStatusLabel(status?: string) {
  if (status === "paid") return "Completed";
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getMethodName(method?: string) {
  if (!method) return "Standard Payment";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

// Ported from legacy pages/PaymentHistory.jsx, rewritten against real Order
// documents. Legacy used entirely hardcoded sample data (cardLast4, PayPal
// emails, refund workflows) that has no backing model here — Order is the
// only payment record (via Razorpay orderId/paymentId fields), so this page
// renders that instead of fabricating payment-gateway details that don't exist.
export default function PaymentHistoryClient({ orders }: { orders: PaymentHistoryOrder[] }) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryOrder | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const filteredPayments = activeFilter === "all" ? orders : orders.filter((p) => p.status === activeFilter);

  function handleViewDetails(payment: PaymentHistoryOrder) {
    setSelectedPayment(payment);
    setShowDetails(true);
  }

  return (
    <div className="thm-content-layer">
      <div className="thm-content-bg"></div>
      <div onClick={() => router.back()} className="arrow_button">
        <BiArrowBack />
      </div>

      <div className="container position-relative">
        <h1 className="thm-big-title">Payment History</h1>

        <div className={styles.filterBar}>
          <div className={styles.filterTabs}>
            {(["all", "paid", "pending", "failed"] as const).map((status) => (
              <button
                key={status}
                className={`${styles.filterTab} ${activeFilter === status ? styles.active : ""}`}
                onClick={() => setActiveFilter(status)}
                type="button"
              >
                {status === "all" ? "All Payments" : getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="position-relative" style={{ zIndex: 55555 }}>
          <div className="row col-xl-12 g-4 g-md-2 mx-auto justify-content-between">
            {filteredPayments.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <BiCreditCard />
                </div>
                <h3>No payments found</h3>
                <p>You haven&apos;t made any {activeFilter !== "all" ? getStatusLabel(activeFilter).toLowerCase() : ""} payments yet</p>
                <CustomButton text="Browse Batches" onClick={() => router.push("/Batches")} />
              </div>
            ) : (
              !showDetails &&
              filteredPayments.map((payment) => (
                <div key={payment._id} className={styles.paymentCard}>
                  <div className={styles.paymentHeader}>
                    <div className={styles.paymentId}>
                      <span>Payment ID:</span>
                      <strong>{payment.paymentId || payment.orderId || payment._id}</strong>
                    </div>
                    <div className={styles.paymentDate}>
                      <FaCalendarAlt />
                      <span>{formatShortDate(payment.createdAt)}</span>
                    </div>
                  </div>

                  <div className={styles.paymentBody}>
                    <div className={styles.paymentInfo}>
                      <div className={styles.paymentMethod}>
                        <span className={styles.methodIcon}>
                          <FaCreditCard />
                        </span>
                        <div className={styles.methodDetails}>
                          <span className={styles.methodName}>{getMethodName(payment.bookingMethod)}</span>
                        </div>
                      </div>

                      <div className={styles.paymentAmount}>
                        <span className={styles.amountLabel}>Amount</span>
                        <strong className={styles.amountValue}>₹ {Number(payment.price || 0).toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className={styles.paymentStatus}>
                      <span className={styles.statusBadge} style={{ backgroundColor: `${getStatusColor(payment.status)}20`, color: getStatusColor(payment.status) }}>
                        {getStatusIcon(payment.status)}
                        {getStatusLabel(payment.status)}
                      </span>
                      {payment.orderId && (
                        <span className={styles.invoiceNumber}>
                          <MdReceipt /> {payment.orderId}
                        </span>
                      )}
                    </div>

                    <div className={styles.paymentDescription}>{payment.slotId?.title || "Batch Session"}</div>

                    {payment.status === "failed" && (
                      <div className={styles.failureReason}>
                        <FaExclamationCircle />
                        <span>Payment attempt was not completed successfully.</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.paymentFooter}>
                    <button className={styles.actionBtn} onClick={() => handleViewDetails(payment)} type="button">
                      <BiDetail /> View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showDetails && selectedPayment && (
          <div className={styles.modalOverlay} onClick={() => setShowDetails(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <button className={styles.modalClose} onClick={() => setShowDetails(false)} type="button">
                ×
              </button>

              <h2 className={styles.modalTitle}>
                <BiDetail /> Payment Details
              </h2>

              <div className={styles.modalContent}>
                <div className={styles.detailSection}>
                  <h3>Payment Summary</h3>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailRow}>
                      <span>Payment ID:</span>
                      <strong>{selectedPayment.paymentId || "—"}</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Date &amp; Time:</span>
                      <strong>{formatDate(selectedPayment.createdAt)}</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Status:</span>
                      <span className={styles.statusBadge} style={{ backgroundColor: `${getStatusColor(selectedPayment.status)}20`, color: getStatusColor(selectedPayment.status) }}>
                        {getStatusIcon(selectedPayment.status)}
                        {getStatusLabel(selectedPayment.status)}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Order ID:</span>
                      <strong className={styles.transactionId}>{selectedPayment.orderId || "—"}</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h3>Amount Details</h3>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailRow}>
                      <span>Amount:</span>
                      <strong className={styles.netAmount}>₹ {Number(selectedPayment.price || 0).toFixed(2)}</strong>
                    </div>
                    {selectedPayment.couponCode && (
                      <div className={styles.detailRow}>
                        <span>Coupon Applied:</span>
                        <strong>{selectedPayment.couponCode}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h3>Payment Method</h3>
                  <div className={styles.paymentMethodDetail}>
                    <span className={styles.detailIcon}>
                      <FaCreditCard />
                    </span>
                    <div>
                      <strong>{getMethodName(selectedPayment.bookingMethod)}</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h3>Description</h3>
                  <p className={styles.description}>
                    {selectedPayment.slotId?.title || "Batch Session"}
                    {selectedPayment.slotId?.batchNo ? ` (#${selectedPayment.slotId.batchNo})` : ""}
                  </p>
                </div>

                {selectedPayment.status === "failed" && (
                  <div className={styles.detailSection}>
                    <h3>Failure Information</h3>
                    <p className={styles.failureMessage}>
                      <FaExclamationCircle />
                      This payment attempt did not complete successfully. No amount was captured.
                    </p>
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <CustomButton text="Close" onClick={() => setShowDetails(false)} />
              </div>
            </div>
          </div>
        )}

        <span style={{ zIndex: 654 }} className="thm-glow"></span>
      </div>
    </div>
  );
}
