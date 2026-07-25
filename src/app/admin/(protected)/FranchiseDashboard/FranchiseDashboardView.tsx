"use client";

import { useEffect, useState } from "react";
import "@/app/admin/styles/legacy-franchise-dashboard.css";

/**
 * Ported from admin-ssbwithisv/FranchiseDashboard.html + assets/js/franchise-dashboard.js.
 * Legacy read a localStorage JWT and attached Authorization headers manually,
 * and 401'd by clearing localStorage and redirecting to ./index.html; here
 * the httpOnly session cookie attaches automatically to /api/myDashboard and
 * the (protected) layout already handles redirecting unauthenticated users.
 *
 * Note: the legacy HTML loaded Chart.js via CDN <script> but assets/js/franchise-dashboard.js
 * never actually instantiates a Chart — that was dead markup, so it's not ported here.
 */

interface DashboardOrder {
  _id: string;
  userId?: { name?: string; email?: string };
  slotId?: { title?: string };
  originalAmount?: number;
  discount?: number;
  price?: number;
  referralCode?: string;
  status?: string;
  createdAt: string;
}

interface DashboardData {
  franchise: { name?: string; referralCode?: string; commissionPercent?: number };
  totalSales: number;
  totalOrders: number;
  commission: number;
  orders: DashboardOrder[];
}

export default function FranchiseDashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load — inline .then() chain (no delegated async function) so the
  // mount effect doesn't trip react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/myDashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard data");
        return res.json();
      })
      .then((json: DashboardData) => {
        if (cancelled) return;
        setData(json);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function retry() {
    location.reload();
  }

  function copyReferralCode() {
    const code = data?.franchise?.referralCode ? `https://ssbwithisv.in/?ref=${data.franchise.referralCode}` : "";
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      window.Swal?.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Link copied to clipboard!",
        showConfirmButton: false,
        timer: 2000,
        background: "#1a1a1a",
        color: "#fff",
      });
    });
  }

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      {loading && (
        <div className="loading-spinner text-center" style={{ padding: 100 }}>
          <div className="spinner-border text-warning" role="status"></div>
          <p className="mt-3">Preparing your dashboard...</p>
        </div>
      )}

      {!loading && error && (
        <div className="loading-spinner text-center" style={{ padding: 100 }}>
          <div className="spinner-border text-danger" role="status"></div>
          <p className="text-danger mt-3">Failed to load dashboard. {error}</p>
          <button className="thm-btn mt-3" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <div>
          {/* Hero Section */}
          <div className="welcome-section">
            <div>
              <h1 style={{ fontWeight: 800, marginBottom: 10 }}>Welcome back, {data.franchise?.name || "Partner"}!</h1>
              <p className="mb-0" style={{ fontWeight: 500, opacity: 0.8 }}>
                Here&apos;s an overview of your franchise performance and earnings.
              </p>
            </div>
            <div className="referral-widget">
              <div className="text-start">
                <div className="small opacity-70">YOUR REFERRAL LINK</div>
                <div className="referral-url">
                  {data.franchise?.referralCode ? `https://ssbwithisv.in/?ref=${data.franchise.referralCode}` : "N/A"}
                </div>
              </div>
              <button className="thm-btn" style={{ background: "#000", color: "#fff", padding: "8px 20px" }} onClick={copyReferralCode}>
                <i className="fas fa-copy me-2"></i> COPY
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="stat-grid">
            <div className="stat-box">
              <i className="fas fa-chart-line"></i>
              <div className="val">₹{(data.totalSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
              <div className="lab">Total Sales Revenue</div>
            </div>
            <div className="stat-box">
              <i className="fas fa-shopping-cart"></i>
              <div className="val">{data.totalOrders || 0}</div>
              <div className="lab">Total Orders</div>
            </div>
            <div className="stat-box">
              <i className="fas fa-wallet"></i>
              <div className="val">₹{(data.commission || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
              <div className="lab">My Commission ({data.franchise?.commissionPercent || 20}%)</div>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="admin-card">
            <div className="card-header border-0 bg-transparent px-0 pb-3">
              <h4 className="mb-0 text-white">
                <i className="fas fa-history me-2 text-warning"></i> Recent Referral Activity
              </h4>
            </div>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer Details</th>
                    <th>Course/Slot</th>
                    <th>Original Amount</th>
                    <th>Discount</th>
                    <th>Final Amount</th>
                    <th>Referral Info</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {!data.orders || data.orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center text-muted py-5">
                        No referral orders found yet
                      </td>
                    </tr>
                  ) : (
                    data.orders.map((order) => {
                      const date = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                      const userName = order.userId?.name || "Unknown";
                      const userEmail = order.userId?.email || "-";
                      const slotTitle = order.slotId?.title || "Course Batch";
                      const original = order.originalAmount || 0;
                      const discount = order.discount || 0;
                      const final = order.price || 0;
                      const status = order.status || "pending";
                      const statusClass = status === "paid" ? "status-paid" : "status-pending";

                      return (
                        <tr key={order._id}>
                          <td>
                            <code style={{ color: "var(--primary-gold)" }}>#{order._id.substring(0, 8)}</code>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{userName}</div>
                            <div className="small opacity-50">{userEmail}</div>
                          </td>
                          <td>{slotTitle}</td>
                          <td>₹{original.toFixed(2)}</td>
                          <td className="text-danger">-₹{discount.toFixed(2)}</td>
                          <td className="text-success" style={{ fontWeight: 700 }}>
                            ₹{final.toFixed(2)}
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                background: "rgba(224, 194, 20, 0.1)",
                                color: "var(--primary-gold)",
                                border: "1px solid rgba(224, 194, 20, 0.2)",
                                fontWeight: 400,
                              }}
                            >
                              {order.referralCode || "-"}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${statusClass}`}>{status.toUpperCase()}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>{date}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
