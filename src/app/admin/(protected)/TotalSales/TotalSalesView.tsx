"use client";

import { useEffect, useMemo, useState } from "react";
import "@/app/admin/styles/legacy-total-sales.css";

/**
 * Ported from admin-ssbwithisv/TotalSales.html + assets/js/total-sales.js.
 * Legacy read a localStorage JWT and attached Authorization headers manually;
 * here the httpOnly session cookie attaches automatically to same-origin
 * fetch calls against /api/allOrders, /api/allFranchise, and
 * /api/admin/orders/:id/batch.
 */

interface PopulatedUser {
  name?: string;
  email?: string;
}

interface PopulatedSlot {
  _id?: string;
  title?: string;
  batchNo?: string;
  startTime?: string;
}

interface OrderItem {
  _id: string;
  orderId?: string;
  userId?: PopulatedUser | string;
  customerName?: string;
  email?: string;
  slotId?: PopulatedSlot;
  courseTitle?: string;
  courseId?: { title?: string };
  price?: number;
  originalAmount?: number;
  discount?: number;
  couponCode?: string;
  referralCode?: string;
  paymentId?: string;
  bookingMethod?: "manual" | "standard" | "franchise" | "sales" | null;
  salesPersonId?: PopulatedUser | string | null;
  installmentPlanId?: { status?: string; installments?: { status?: string; amount?: number }[] } | null;
  status?: string;
  createdAt: string;
}

// For a sales order with an installment plan, `price` is the FULL contracted
// total — most of which may not be collected yet. Revenue/"Final Amount"
// should reflect money actually in hand, not the order's eventual value.
// Non-installment orders (manual/standard/franchise) are paid in full at
// checkout, so `price` already IS the collected amount for those.
function collectedAmount(o: OrderItem): number {
  if (o.bookingMethod === "sales" && o.installmentPlanId?.installments) {
    return o.installmentPlanId.installments
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + (i.amount || 0), 0);
  }
  return parseFloat(String(o.price)) || 0;
}

interface FranchisePartner {
  _id: string;
  name: string;
  referralCode?: string;
}

type BookingMethod = "manual" | "standard" | "franchise" | "sales";

function resolveBookingMethod(o: OrderItem): BookingMethod {
  if (o.bookingMethod) return o.bookingMethod;
  const hasPayment = !!(o.paymentId && o.paymentId.trim() !== "");
  const hasReferral = !!(o.referralCode && o.referralCode.trim() !== "");
  if (!hasPayment) return "manual";
  if (hasPayment && hasReferral) return "franchise";
  return "standard";
}

const METHOD_BADGE: Record<BookingMethod, { icon: string; color: string; bg: string; border: string; label: (o: OrderItem) => string }> = {
  manual: { icon: "fa-tools", color: "#e67e22", bg: "rgba(230,126,34,0.15)", border: "rgba(230,126,34,0.3)", label: () => "Manual" },
  standard: { icon: "fa-credit-card", color: "#3498db", bg: "rgba(52,152,219,0.15)", border: "rgba(52,152,219,0.3)", label: () => "Standard" },
  franchise: {
    icon: "fa-store",
    color: "#e0c214",
    bg: "rgba(224,194,20,0.12)",
    border: "rgba(224,194,20,0.3)",
    label: (o) => (o.referralCode ? `Franchise · ${o.referralCode}` : "Franchise"),
  },
  sales: {
    icon: "fa-headset",
    color: "#2ecc71",
    bg: "rgba(46,204,113,0.15)",
    border: "rgba(46,204,113,0.3)",
    label: (o) => {
      const person = typeof o.salesPersonId === "object" ? o.salesPersonId : null;
      return person?.name || person?.email ? `Sales · ${person.name || person.email}` : "Sales";
    },
  },
};

function BookingMethodBadge({ order }: { order: OrderItem }) {
  const method = resolveBookingMethod(order);
  const b = METHOD_BADGE[method];
  return (
    <div className="franchise-info">
      <span
        style={{
          padding: "3px 8px",
          borderRadius: 4,
          fontSize: "0.72rem",
          fontWeight: 800,
          textTransform: "uppercase",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: b.bg,
          color: b.color,
          border: `1px solid ${b.border}`,
        }}
      >
        <i className={`fas ${b.icon}`} style={{ fontSize: "0.7rem" }}></i>
        {b.label(order)}
      </span>
    </div>
  );
}

const METHOD_DISPLAY_LABELS: Record<BookingMethod, (o: OrderItem) => string> = {
  manual: () => "🛠 Manual (Admin Booked)",
  standard: () => "💳 Standard (Payment Gateway)",
  franchise: (o) => `🏪 Franchise — Partner: ${o.referralCode || "N/A"}`,
  sales: (o) => {
    const person = typeof o.salesPersonId === "object" ? o.salesPersonId : null;
    return `🎧 Sales — ${person?.name || person?.email || "N/A"}`;
  },
};

export default function TotalSalesView() {
  const [allOrders, setAllOrders] = useState<OrderItem[]>([]);
  const [franchises, setFranchises] = useState<FranchisePartner[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [franchiseFilterVal, setFranchiseFilterVal] = useState("all");
  const [batchNoFilter, setBatchNoFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [batchInputValue, setBatchInputValue] = useState("");
  const [savingBatch, setSavingBatch] = useState(false);

  // Initial load — inline .then() chain (no delegated async function) so the
  // mount effect doesn't trip react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/allOrders"), fetch("/api/allFranchise")])
      .then(async ([ordersRes, franchiseRes]) => {
        if (!ordersRes.ok) throw new Error("Failed to fetch sales data");
        const ordersData = await ordersRes.json();
        const franchiseData = franchiseRes.ok ? await franchiseRes.json() : [];
        return { orders: ordersData.orders || ordersData, franchises: franchiseData };
      })
      .then(({ orders, franchises: fr }) => {
        if (cancelled) return;
        setAllOrders(Array.isArray(orders) ? orders : []);
        setFranchises(Array.isArray(fr) ? fr : []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        window.Swal?.fire({
          icon: "error",
          title: "Data Sync Failed",
          text: err instanceof Error ? err.message : "Failed to fetch sales data",
          background: "#1a1a1a",
          color: "#fff",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ordersRes, franchiseRes] = await Promise.all([fetch("/api/allOrders"), fetch("/api/allFranchise")]);
      if (!ordersRes.ok) throw new Error("Failed to fetch sales data");
      const ordersData = await ordersRes.json();
      const franchiseData = franchiseRes.ok ? await franchiseRes.json() : [];
      setAllOrders(Array.isArray(ordersData.orders || ordersData) ? ordersData.orders || ordersData : []);
      setFranchises(Array.isArray(franchiseData) ? franchiseData : []);
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Data Sync Failed",
        text: err instanceof Error ? err.message : "Failed to fetch sales data",
        background: "#1a1a1a",
        color: "#fff",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleRefresh() {
    window.Swal?.fire({
      title: "Syncing...",
      background: "#1a1a1a",
      color: "#fff",
      timer: 1000,
      didOpen: () => {
        window.Swal?.showLoading();
        loadData();
      },
    });
  }

  const stats = useMemo(() => {
    const total = allOrders.length;
    const revenue = allOrders.reduce((s, o) => s + collectedAmount(o), 0);
    const franchiseCount = allOrders.filter((o) => resolveBookingMethod(o) === "franchise").length;
    const directCount = allOrders.filter((o) => resolveBookingMethod(o) !== "franchise").length;
    return { total, revenue, franchiseCount, directCount };
  }, [allOrders]);

  const filtered = useMemo(() => {
    let result = [...allOrders];

    const q = search.toLowerCase();
    if (q) {
      result = result.filter((o) => {
        const u = typeof o.userId === "object" ? o.userId : undefined;
        const name = (u?.name || o.customerName || "").toLowerCase();
        const email = (u?.email || o.email || "").toLowerCase();
        const id = (o.orderId || o._id || "").toLowerCase();
        const product = (o.slotId?.title || o.courseTitle || "").toLowerCase();
        return name.includes(q) || email.includes(q) || id.includes(q) || product.includes(q);
      });
    }

    if (franchiseFilterVal === "manual" || franchiseFilterVal === "standard" || franchiseFilterVal === "franchise") {
      result = result.filter((o) => resolveBookingMethod(o) === franchiseFilterVal);
    } else if (franchiseFilterVal !== "all") {
      result = result.filter((o) => o.referralCode === franchiseFilterVal);
    }

    const bVal = batchNoFilter.toLowerCase().trim();
    if (bVal) {
      result = result.filter((o) => (o.slotId?.batchNo || "").toLowerCase().includes(bVal));
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter((o) => new Date(o.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((o) => new Date(o.createdAt) <= end);
    }

    return result;
  }, [allOrders, search, franchiseFilterVal, batchNoFilter, startDate, endDate]);

  const hasActiveFilters = !!(search || franchiseFilterVal !== "all" || batchNoFilter || startDate || endDate);

  function clearFilters() {
    setSearch("");
    setFranchiseFilterVal("all");
    setBatchNoFilter("");
    setStartDate("");
    setEndDate("");
  }

  function showOrderDetail(order: OrderItem) {
    setSelectedOrder(order);
    setBatchInputValue(order.slotId?.batchNo || "");
  }

  function closeOrderDetail() {
    setSelectedOrder(null);
    setBatchInputValue("");
  }

  async function saveOrderBatch() {
    if (!selectedOrder) return;
    const newBatch = batchInputValue.trim();
    if (!newBatch) {
      window.Swal?.fire({ icon: "warning", text: "Please enter a batch number.", background: "#1a1a1a", color: "#fff" });
      return;
    }

    setSavingBatch(true);
    window.Swal?.fire({
      title: "Saving Batch Info...",
      text: "Updating batch schedule details.",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder._id}/batch`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchNo: newBatch }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update transaction batch");

      window.Swal?.fire({
        icon: "success",
        title: "Batch Saved!",
        text: "The batch number has been updated successfully.",
        background: "#1a1a1a",
        color: "#fff",
        timer: 1500,
        showConfirmButton: false,
      });

      setAllOrders((prev) =>
        prev.map((o) => (o._id === selectedOrder._id ? { ...o, slotId: { ...(o.slotId || {}), batchNo: newBatch } } : o))
      );
      closeOrderDetail();
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Allotment Sync Failed",
        text: err instanceof Error ? err.message : "Failed to update transaction batch",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    } finally {
      setSavingBatch(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <i className="fas fa-chart-pie me-2"></i> Sales Analytics
          </h1>
          <p className="text-muted mb-0">Monitor global revenue streams and transaction details</p>
        </div>
        <div className="d-flex gap-2">
          <button className="thm-btn" onClick={handleRefresh}>
            <i className="fas fa-sync-alt me-2"></i> Sync Data
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <i className="fas fa-receipt"></i>
          <div className="val">{stats.total}</div>
          <div className="lab">Total Transactions</div>
        </div>
        <div className="stat-card">
          <i className="fas fa-wallet"></i>
          <div className="val">₹{stats.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div className="lab">Total Gross Revenue</div>
        </div>
        <div className="stat-card">
          <i className="fas fa-store"></i>
          <div className="val">{stats.franchiseCount}</div>
          <div className="lab">Partner Referrals</div>
        </div>
        <div className="stat-card">
          <i className="fas fa-user-check"></i>
          <div className="val">{stats.directCount}</div>
          <div className="lab">Direct Conversions</div>
        </div>
      </div>

      {/* Filtering System */}
      <div className="filter-panel">
        <div className="row g-3">
          <div className="col-lg-3 col-md-6">
            <label className="admin-form-label">Search Transaction</label>
            <div className="position-relative">
              <i className="fas fa-search position-absolute top-50 start-0 translate-middle-y ms-3 opacity-50"></i>
              <input
                type="text"
                className="admin-input ps-5"
                placeholder="Customer, Email or Order ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <label className="admin-form-label">Filter by Booking Type</label>
            <select className="admin-input" value={franchiseFilterVal} onChange={(e) => setFranchiseFilterVal(e.target.value)}>
              <option value="all">All Booking Types</option>
              <optgroup label="─── By Method ───">
                <option value="manual">🛠 Manual (Admin Booked)</option>
                <option value="standard">💳 Standard (Payment Gateway)</option>
                <option value="franchise">🏪 Franchise (Referral)</option>
              </optgroup>
              {franchises.filter((p) => p.referralCode).length > 0 && (
                <optgroup label="─── By Partner Code ───">
                  {franchises
                    .filter((p) => p.referralCode)
                    .map((p) => (
                      <option key={p._id} value={p.referralCode}>
                        {p.name} ({p.referralCode})
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>
          <div className="col-lg-2 col-md-6">
            <label className="admin-form-label">Batch No.</label>
            <input
              type="text"
              className="admin-input"
              placeholder="e.g. B2405"
              value={batchNoFilter}
              onChange={(e) => setBatchNoFilter(e.target.value)}
            />
          </div>
          <div className="col-lg-4 col-md-6">
            <label className="admin-form-label">Date Range</label>
            <div className="d-flex gap-2">
              <input type="date" className="admin-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <input type="date" className="admin-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mt-3 d-flex justify-content-end">
          {hasActiveFilters && (
            <button
              className="thm-btn py-1 px-3"
              style={{ background: "rgba(255,107,107,0.1)", color: "#ff6b6b", borderColor: "rgba(255,107,107,0.2)", fontSize: "0.8rem" }}
              onClick={clearFilters}
            >
              <i className="fas fa-times me-1"></i> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="admin-card">
        <div className="admin-table-container">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-warning" role="status"></div>
              <p className="mt-3 opacity-50">Fetching global sales data...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-search-minus mb-3" style={{ fontSize: "3rem", opacity: 0.2 }}></i>
              <h4>No transactions found</h4>
              <p className="text-muted">Adjust your filters to see more results.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Product/Service</th>
                  <th>Final Amount</th>
                  <th>Booking Method</th>
                  <th>Batch Info</th>
                  <th>Payment Status</th>
                  <th>Timestamp</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const u = typeof o.userId === "object" ? o.userId : undefined;
                  const prodTitle = o.slotId?.title || o.courseTitle || o.courseId?.title || "Unknown Product";
                  const isBatch = !!o.slotId;
                  const statusClass = (o.status || "").toLowerCase() === "paid" ? "status-paid" : "status-pending";
                  const date = new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

                  return (
                    <tr key={o._id}>
                      <td>
                        <code style={{ color: "var(--primary-gold)" }}>#{(o.orderId || o._id).substring(0, 10)}</code>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u?.name || o.customerName || "Guest"}</div>
                        <div className="small opacity-50">{u?.email || o.email || "-"}</div>
                      </td>
                      <td>
                        <span className={`product-badge ${isBatch ? "badge-batch" : "badge-course"}`}>
                          <i className={`fas ${isBatch ? "fa-calendar-alt" : "fa-book"}`}></i> {isBatch ? "BATCH" : "COURSE"}
                        </span>
                        <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{prodTitle}</div>
                      </td>
                      <td className="text-success" style={{ fontWeight: 700 }}>
                        {(() => {
                          const collected = collectedAmount(o);
                          const total = parseFloat(String(o.price)) || 0;
                          if (o.bookingMethod === "sales" && collected < total) {
                            return (
                              <>
                                ₹{collected.toFixed(2)}
                                <div className="small opacity-50" style={{ fontWeight: 400 }}>
                                  of ₹{total.toFixed(2)} total
                                </div>
                              </>
                            );
                          }
                          return <>₹{total.toFixed(2)}</>;
                        })()}
                      </td>
                      <td>
                        <BookingMethodBadge order={o} />
                      </td>
                      <td>
                        <code style={{ color: "var(--text-white)", opacity: 0.8 }}>{o.slotId?.batchNo || "—"}</code>
                      </td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>{(o.status || "pending").toUpperCase()}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>{date}</span>
                      </td>
                      <td className="text-end">
                        <button className="action-btn" onClick={() => showOrderDetail(o)}>
                          <i className="fas fa-receipt"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="admin-modal-overlay" style={{ display: "flex" }} onClick={closeOrderDetail}>
          <div className="admin-modal sales-modal-content" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h5 className="admin-modal-title" style={{ fontSize: "1.2rem" }}>
                <i className="fas fa-file-invoice me-2 text-warning"></i> Transaction Invoice
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={closeOrderDetail}></button>
            </div>
            <div className="modal-body">
              {(() => {
                const o = selectedOrder;
                const u = typeof o.userId === "object" ? o.userId : undefined;
                const finalPrice = parseFloat(String(o.price)) || 0;
                const origPrice = parseFloat(String(o.originalAmount)) || finalPrice;
                const discount = parseFloat(String(o.discount)) || 0;
                const method = resolveBookingMethod(o);
                const methodDisplay = METHOD_DISPLAY_LABELS[method](o);

                return (
                  <>
                    <div className="order-detail-row">
                      <span>Transaction ID</span>
                      <span className="fw-bold">{o.orderId || o._id}</span>
                    </div>
                    <div className="order-detail-row">
                      <span>Razorpay Payment ID</span>
                      <span className="fw-bold">{o.paymentId || "N/A"}</span>
                    </div>
                    <div className="order-detail-row">
                      <span>Customer Name</span>
                      <span className="fw-bold">{u?.name || o.customerName || "Guest"}</span>
                    </div>
                    <div className="order-detail-row">
                      <span>Customer Email</span>
                      <span className="fw-bold">{u?.email || o.email || "-"}</span>
                    </div>
                    <div className="order-detail-row">
                      <span>Product Title</span>
                      <span className="fw-bold">{o.slotId?.title || o.courseTitle || "Product"}</span>
                    </div>
                    <div className="order-detail-row" style={{ alignItems: "center" }}>
                      <span>Batch Number</span>
                      <div className="d-flex gap-2 align-items-center">
                        <input
                          type="text"
                          className="admin-input py-1 px-2"
                          style={{
                            maxWidth: 140,
                            fontSize: "0.85rem",
                            background: "var(--surface-light)",
                            border: "1px solid rgba(224, 194, 20, 0.25)",
                            color: "#fff",
                            borderRadius: 4,
                          }}
                          placeholder="e.g. B45"
                          value={batchInputValue}
                          onChange={(e) => setBatchInputValue(e.target.value)}
                        />
                        <button
                          className="thm-btn py-1 px-3"
                          style={{ fontSize: "0.78rem", padding: "4px 10px", borderRadius: 4 }}
                          disabled={savingBatch}
                          onClick={saveOrderBatch}
                        >
                          <i className="fas fa-save"></i> Save
                        </button>
                      </div>
                    </div>
                    <div className="order-detail-row">
                      <span>Original Amount</span>
                      <span className="fw-bold">₹{origPrice.toFixed(2)}</span>
                    </div>
                    <div className="order-detail-row">
                      <span>Discount Applied</span>
                      <span className="text-success">₹{discount.toFixed(2)}</span>
                    </div>
                    <div
                      className="order-detail-row"
                      style={{ background: "rgba(224,194,20,0.05)", padding: 15, margin: "10px 0", borderRadius: 8 }}
                    >
                      <span>FINAL PAYOUT</span>
                      <span className="fw-bold text-warning" style={{ fontSize: "1.2rem" }}>
                        ₹{finalPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="order-detail-row">
                      <span>Coupon Used</span>
                      <span className="badge bg-warning text-dark">{o.couponCode || "NONE"}</span>
                    </div>
                    <div className="order-detail-row">
                      <span>Booking Method</span>
                      <span className="fw-bold">{methodDisplay}</span>
                    </div>
                    <div className="order-detail-row">
                      <span>Status</span>
                      <span className={`status-badge ${o.status === "paid" ? "status-paid" : "status-pending"}`}>
                        {(o.status || "pending").toUpperCase()}
                      </span>
                    </div>
                    <div className="order-detail-row">
                      <span>Date &amp; Time</span>
                      <span className="opacity-70">{new Date(o.createdAt).toLocaleString()}</span>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button className="thm-btn py-2 px-4" onClick={closeOrderDetail}>
                Close Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
