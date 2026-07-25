"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BiArrowBack, BiPackage, BiDetail } from "react-icons/bi";
import { FaBox, FaCheckCircle, FaClock, FaCreditCard, FaExclamationCircle } from "react-icons/fa";
import CustomButton from "@/components/site/CustomButton";
import "@/style/custom-theme.css";
import styles from "@/style/OrderHistory.module.css";

interface OrderSlot {
  _id: string;
  title?: string;
  price?: number;
  startTime?: string;
  endTime?: string;
  batchNo?: string;
  isFullCourse?: boolean;
}

export interface OrderHistoryOrder {
  _id: string;
  slotId?: OrderSlot | null;
  price?: number;
  orderId?: string;
  paymentId?: string;
  couponCode?: string;
  referralCode?: string;
  bookingMethod?: string;
  selectedModules?: string[];
  status?: "pending" | "paid" | "failed";
  createdAt?: string;
}

const moduleNames: Record<string, string> = {
  full_course: "10 Days SSB Hackathon (Full Course)",
  ssb_ppdt: "Intro & PPDT (Stage 1 Process)",
  psych: "Psychology Test Preparation Program",
  interview: "Interview Theory Course and Mock Interview",
  group_testing: "Group Testing Course on VTX",
};

function formatDate(dateString?: string) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function getStatusIcon(status?: string) {
  switch (status) {
    case "paid":
      return <FaCheckCircle />;
    case "pending":
      return <FaClock />;
    case "failed":
      return <FaExclamationCircle />;
    default:
      return <FaBox />;
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
  if (!status) return "Unknown";
  if (status === "paid") return "Paid";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Ported from legacy pages/OrderHistory.jsx, rewritten against real Order
// documents (userId/slotId/selectedModules/status) instead of the legacy
// page's hardcoded e-commerce sample data (products/shippingAddress/tracking
// numbers, none of which exist on the actual Order model).
export default function OrderHistoryClient({ orders }: { orders: OrderHistoryOrder[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "paid" | "pending" | "failed">("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderHistoryOrder | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const filteredOrders = activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab);

  function handleViewDetails(order: OrderHistoryOrder) {
    setSelectedOrder(order);
    setShowDetails(true);
  }

  return (
    <div className="thm-content-layer">
      <div className="thm-content-bg"></div>
      <div onClick={() => router.back()} className="arrow_button">
        <BiArrowBack />
      </div>

      <div className="container position-relative">
        <h1 className="thm-big-title">Order History</h1>

        <div className={styles.statusTabs}>
          {(["all", "paid", "pending", "failed"] as const).map((tab) => (
            <button key={tab} className={`${styles.tabBtn} ${activeTab === tab ? styles.active : ""}`} onClick={() => setActiveTab(tab)} type="button">
              {tab === "all" ? "All Orders" : getStatusLabel(tab)}
            </button>
          ))}
        </div>

        <div className="position-relative" style={{ zIndex: 55555 }}>
          <div className="row col-xl-10 g-4 g-md-2 col-lg-11 mx-auto justify-content-between">
            {filteredOrders.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <BiPackage />
                </div>
                <h3>No orders found</h3>
                <p>You haven&apos;t placed any {activeTab !== "all" ? getStatusLabel(activeTab).toLowerCase() : ""} orders yet</p>
                <CustomButton text="Browse Batches" onClick={() => router.push("/Batches")} />
              </div>
            ) : (
              !showDetails &&
              filteredOrders.map((order) => (
                <div key={order._id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <div className={styles.orderId}>
                      <span>Order ID:</span>
                      <strong>{order.orderId || order._id}</strong>
                    </div>
                    <div className={styles.orderDate}>
                      <FaClock />
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>

                  <div className={styles.orderBody}>
                    <div className={styles.orderInfo}>
                      <div>
                        <span
                          className={styles.statusBadge}
                          style={{ backgroundColor: `${getStatusColor(order.status)}20`, color: getStatusColor(order.status) }}
                        >
                          {getStatusIcon(order.status)}
                          {getStatusLabel(order.status)}
                        </span>
                      </div>

                      <div className={styles.orderStats}>
                        <div className={styles.stat}>
                          <span>Batch:</span>
                          <strong>{order.slotId?.title || "Batch Session"}</strong>
                        </div>
                        <div className={styles.stat}>
                          <span>Total:</span>
                          <strong>₹ {Number(order.price || 0).toFixed(2)}</strong>
                        </div>
                        <div className={styles.stat}>
                          <span>Payment:</span>
                          <strong>{order.bookingMethod ? order.bookingMethod : "Standard Payment"}</strong>
                        </div>
                      </div>
                    </div>

                    <div className={styles.productsPreview}>
                      {order.selectedModules && order.selectedModules.length > 0 ? (
                        order.selectedModules.map((mod) => (
                          <div key={mod} className={styles.productTag}>
                            {moduleNames[mod] || mod}
                          </div>
                        ))
                      ) : (
                        <div className={styles.productTag}>{order.slotId?.isFullCourse ? "Full Course" : "General Batch Access"}</div>
                      )}
                    </div>
                  </div>

                  <div className={styles.orderFooter}>
                    <button className={styles.actionBtn} onClick={() => handleViewDetails(order)} type="button">
                      <BiDetail /> View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showDetails && selectedOrder && (
          <div className={styles.modalOverlay} onClick={() => setShowDetails(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <button className={styles.modalClose} onClick={() => setShowDetails(false)} type="button">
                ×
              </button>

              <h2 className={styles.modalTitle}>
                <BiDetail /> Order Details
              </h2>

              <div className={styles.modalContent}>
                <div className={styles.detailSection}>
                  <h3>Order Summary</h3>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailRow}>
                      <span>Order ID:</span>
                      <strong>{selectedOrder.orderId || selectedOrder._id}</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Order Date:</span>
                      <strong>{formatDate(selectedOrder.createdAt)}</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Status:</span>
                      <span
                        className={styles.statusBadge}
                        style={{ backgroundColor: `${getStatusColor(selectedOrder.status)}20`, color: getStatusColor(selectedOrder.status) }}
                      >
                        {getStatusIcon(selectedOrder.status)}
                        {getStatusLabel(selectedOrder.status)}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Payment Method:</span>
                      <strong>{selectedOrder.bookingMethod || "Standard Payment"}</strong>
                    </div>
                    {selectedOrder.paymentId && (
                      <div className={styles.detailRow}>
                        <span>Payment ID:</span>
                        <strong>{selectedOrder.paymentId}</strong>
                      </div>
                    )}
                    <div className={styles.detailRow}>
                      <span>Total Amount:</span>
                      <strong className={styles.totalAmount}> ₹ {Number(selectedOrder.price || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h3>Batch / Modules</h3>
                  <div className={styles.productsList}>
                    <div className={styles.productItem}>
                      <span className={styles.productName}>{selectedOrder.slotId?.title || "Batch Session"}</span>
                      {selectedOrder.slotId?.batchNo && <span className={styles.productQty}>#{selectedOrder.slotId.batchNo}</span>}
                    </div>
                    {(selectedOrder.selectedModules && selectedOrder.selectedModules.length > 0
                      ? selectedOrder.selectedModules
                      : [selectedOrder.slotId?.isFullCourse ? "full_course" : ""]
                    )
                      .filter(Boolean)
                      .map((mod) => (
                        <div key={mod} className={styles.productItem}>
                          <span className={styles.productName}>{moduleNames[mod as string] || mod}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {selectedOrder.slotId?.startTime && (
                  <div className={styles.detailSection}>
                    <h3>
                      <FaCreditCard /> Batch Schedule
                    </h3>
                    <p className={styles.address}>
                      {formatDate(selectedOrder.slotId.startTime)} — {formatDate(selectedOrder.slotId.endTime)}
                    </p>
                  </div>
                )}

                {selectedOrder.couponCode && (
                  <div className={styles.detailSection}>
                    <h3>Coupon / Referral</h3>
                    <p className={styles.address}>
                      {selectedOrder.couponCode && <>Coupon: {selectedOrder.couponCode}</>}
                      {selectedOrder.referralCode && <> · Referral: {selectedOrder.referralCode}</>}
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
