"use client";

import { useEffect, useState } from "react";
import {
  Store,
  PlusCircle,
  Users,
  Plus,
  Copy,
  Trash2,
  ArrowLeft,
  LineChart,
  UserCog,
  Mail,
  Phone,
  ShoppingCart,
  ShoppingBag,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import "@/app/admin/styles/legacy-franchise.css";

const ICON_STYLE = { verticalAlign: -2 };

/**
 * Ported from admin-ssbwithisv/Franchise.html + assets/js/franchise.js.
 * Legacy read a localStorage JWT and attached Authorization headers manually;
 * here the httpOnly session cookie attaches automatically to same-origin
 * fetch calls against /api/allFranchise, /api/createFranchise,
 * /api/deleteFranchise/:id, /api/franchiseDetails/:code.
 */

interface FranchiseItem {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  referralCode?: string;
  commissionPercent?: number;
  createdAt?: string;
}

interface DetailOrder {
  _id: string;
  slotId?: { title?: string; startTime?: string };
  userId?: { name?: string; email?: string };
  price?: number;
  status?: string;
  createdAt: string;
}

interface FranchiseDetailData {
  franchise: FranchiseItem;
  totalSales: number;
  totalOrders: number;
  commission: number;
  orders: DetailOrder[];
}

async function parseJsonSafe(res: Response): Promise<Record<string, unknown>> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      window.Swal?.fire({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        background: "#1a1a1a",
        color: "#fff",
        icon: "success",
        title: "Referral link copied!",
      });
    })
    .catch(() => {
      window.Swal?.fire({ icon: "error", title: "Copy Failed", text, background: "#1a1a1a", color: "#fff" });
    });
}

export default function FranchiseView() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [franchises, setFranchises] = useState<FranchiseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [detailData, setDetailData] = useState<FranchiseDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ text: string; type: "danger" | "success" } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [commission, setCommission] = useState("20");
  const [password, setPassword] = useState("");

  // Initial load — inline .then() chain (no delegated async function) so the
  // mount effect doesn't trip react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/allFranchise")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch franchises");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setFranchises(Array.isArray(data) ? data : []);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to fetch franchises");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadFranchises() {
    setLoading(true);
    try {
      const res = await fetch("/api/allFranchise");
      if (!res.ok) throw new Error("Failed to fetch franchises");
      const data = await res.json();
      setFranchises(Array.isArray(data) ? data : []);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to fetch franchises");
    } finally {
      setLoading(false);
    }
  }

  function resetModalForm() {
    setName("");
    setEmail("");
    setPhone("");
    setCommission("20");
    setPassword("");
    setModalMessage(null);
    setShowPassword(false);
  }

  function showModalMessage(text: string, type: "danger" | "success") {
    setModalMessage({ text, type });
    setTimeout(() => setModalMessage(null), 4000);
  }

  async function createFranchise() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      showModalMessage("Please fill all required fields (Name, Email, Password)", "danger");
      return;
    }
    if (password.length < 6) {
      showModalMessage("Password must be at least 6 characters", "danger");
      return;
    }
    let commissionPercent = parseInt(commission, 10);
    if (isNaN(commissionPercent) || commissionPercent < 0) {
      commissionPercent = 20;
    }
    if (commissionPercent > 100) {
      showModalMessage("Commission percentage cannot exceed 100%", "danger");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/createFranchise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, phone: trimmedPhone, password, commissionPercent }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error((data.message as string) || "Failed to create franchise");

      window.Swal?.fire({
        icon: "success",
        title: "Franchise Created",
        text: "The new franchise partner has been successfully added.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });

      resetModalForm();
      setModalOpen(false);
      await reloadFranchises();
    } catch (err) {
      showModalMessage(err instanceof Error ? err.message : "Failed to create franchise", "danger");
    } finally {
      setCreating(false);
    }
  }

  async function deleteFranchise(id: string) {
    const result = await window.Swal?.fire({
      title: "Are you sure?",
      text: "This franchise partner will be permanently deleted. This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      background: "#1a1a1a",
      color: "#fff",
      confirmButtonColor: "#ff6b6b",
      cancelButtonColor: "rgba(255,255,255,0.1)",
      confirmButtonText: "Yes, delete it!",
    });
    if (!result?.isConfirmed) return;

    try {
      const res = await fetch(`/api/deleteFranchise/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete franchise");

      window.Swal?.fire({
        icon: "success",
        title: "Deleted!",
        text: "Franchise has been deleted.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });
      await reloadFranchises();
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Error",
        text: err instanceof Error ? err.message : "Failed to delete franchise",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  }

  async function openFranchiseDetail(referralCode?: string) {
    if (!referralCode) return;
    setView("detail");
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);
    try {
      const res = await fetch(`/api/franchiseDetails/${referralCode}`);
      if (!res.ok) throw new Error("Failed to fetch franchise details");
      const data: FranchiseDetailData = await res.json();
      setDetailData(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to fetch franchise details");
    } finally {
      setDetailLoading(false);
    }
  }

  function backToList() {
    setView("list");
    setDetailData(null);
    setDetailError(null);
    reloadFranchises();
  }

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      {view === "list" && (
        <div>
          <div className="admin-page-header">
            <div className="header-left">
              <h1 className="admin-page-title">
                <Store size={20} className="me-2" style={ICON_STYLE} /> Franchise Management
              </h1>
              <p className="text-muted mb-0">Manage all franchise partners and track their performance</p>
            </div>
            <button
              className="thm-btn"
              onClick={() => {
                resetModalForm();
                setModalOpen(true);
              }}
            >
              <PlusCircle size={16} style={ICON_STYLE} /> Add Franchise
            </button>
          </div>

          <div className="admin-card">
            <h3 className="admin-form-label" style={{ fontSize: "1.3rem", marginBottom: 20 }}>
              <Users size={18} className="me-2" style={ICON_STYLE} /> All Franchise Partners
            </h3>

            {loading ? (
              <div className="loading-spinner text-center" style={{ padding: 40 }}>
                <div className="spinner-border text-warning" role="status"></div>
                <p className="mt-2">Loading franchises...</p>
              </div>
            ) : loadError ? (
              <div className="admin-table-container">
                <table className="admin-table">
                  <tbody>
                    <tr>
                      <td colSpan={9} className="text-center text-warning p-4">
                        {loadError}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : franchises.length === 0 ? (
              <div className="empty-state text-center" style={{ padding: 60 }}>
                <div className="empty-icon mb-3" style={{ color: "var(--primary-gold)", opacity: 0.5 }}>
                  <Store size={48} />
                </div>
                <h3>No Franchises Found</h3>
                <p>Create your first franchise partner to get started.</p>
                <button
                  className="thm-btn mt-3"
                  onClick={() => {
                    resetModalForm();
                    setModalOpen(true);
                  }}
                >
                  <Plus size={14} style={ICON_STYLE} /> Add Franchise
                </button>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Comm. %</th>
                      <th>Code</th>
                      <th>Referral Link</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {franchises.map((franchise, index) => {
                      const createdAt = franchise.createdAt ? new Date(franchise.createdAt).toLocaleDateString() : "N/A";
                      const referralCode = franchise.referralCode || "N/A";
                      const referralLink = `https://ssbwithisv.in/?ref=${referralCode}`;
                      const commissionPercent = franchise.commissionPercent !== undefined ? franchise.commissionPercent : 20;

                      return (
                        <tr key={franchise._id} className="clickable-row" onClick={() => openFranchiseDetail(franchise.referralCode)}>
                          <td>{index + 1}</td>
                          <td>
                            <span style={{ color: "var(--primary-gold)", fontWeight: 600 }}>{franchise.name || "—"}</span>
                          </td>
                          <td>{franchise.email || "—"}</td>
                          <td>{franchise.phone || "—"}</td>
                          <td>
                            <span
                              className="badge"
                              style={{ background: "rgba(224, 194, 20, 0.1)", color: "var(--primary-gold)", border: "1px solid rgba(224, 194, 20, 0.3)" }}
                            >
                              {commissionPercent}%
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-dark text-warning" style={{ border: "1px solid rgba(224, 194, 20, 0.3)" }}>
                              {referralCode}
                            </span>
                          </td>
                          <td>
                            <div className="referral-link-box">
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>
                                {referralLink}
                              </span>
                              <button
                                className="action-btn"
                                title="Copy Link"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(referralLink);
                                }}
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          </td>
                          <td>{createdAt}</td>
                          <td>
                            <button
                              className="action-btn delete-btn"
                              title="Delete Franchise"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFranchise(franchise._id);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
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

      {view === "detail" && (
        <div>
          <div className="admin-page-header">
            <div className="header-left">
              <button
                className="thm-btn mb-3"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                onClick={backToList}
              >
                <ArrowLeft size={14} style={ICON_STYLE} /> Back to List
              </button>
              <h1 className="admin-page-title">
                <LineChart size={20} className="me-2" style={ICON_STYLE} /> Franchise Details
              </h1>
            </div>
          </div>

          {detailLoading && (
            <div className="admin-card mb-4">
              <div className="text-center p-5">
                <div className="spinner-border text-warning" role="status"></div>
                <p className="mt-3">Loading details...</p>
              </div>
            </div>
          )}

          {!detailLoading && detailError && (
            <div className="admin-card mb-4">
              <div className="alert alert-danger">Error: {detailError}</div>
            </div>
          )}

          {!detailLoading && detailData && (
            <>
              <div className="admin-card mb-4">
                <div className="row align-items-center">
                  <div className="col-md-2 text-center">
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        background: "rgba(224,194,20,0.1)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 15px",
                      }}
                    >
                      <UserCog size={40} style={{ color: "var(--primary-gold)" }} />
                    </div>
                  </div>
                  <div className="col-md-5">
                    <h4 style={{ color: "var(--primary-gold)", marginBottom: 10 }}>{detailData.franchise.name}</h4>
                    <p className="mb-1 text-muted">
                      <Mail size={14} className="me-2" style={ICON_STYLE} /> {detailData.franchise.email}
                    </p>
                    <p className="mb-0 text-muted">
                      <Phone size={14} className="me-2" style={ICON_STYLE} /> {detailData.franchise.phone || "—"}
                    </p>
                  </div>
                  <div className="col-md-5">
                    <p className="mb-1">
                      <strong className="text-muted">Code:</strong>{" "}
                      <code style={{ color: "var(--primary-gold)", fontSize: "1.1rem", marginLeft: 10 }}>{detailData.franchise.referralCode}</code>
                    </p>
                    <p className="mb-1">
                      <strong className="text-muted">Commission:</strong> <span style={{ marginLeft: 10 }}>{detailData.franchise.commissionPercent}%</span>
                    </p>
                    <p className="mb-0">
                      <strong className="text-muted">Joined:</strong>{" "}
                      <span style={{ marginLeft: 10 }}>{detailData.franchise.createdAt ? new Date(detailData.franchise.createdAt).toLocaleDateString() : "N/A"}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="row mb-4">
                <div className="col-md-4 mb-3">
                  <div className="stat-card-mini">
                    <div className="val">₹{detailData.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                    <div className="lbl">Total Sales Generated</div>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="stat-card-mini">
                    <div className="val">{detailData.totalOrders}</div>
                    <div className="lbl">Total Orders</div>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="stat-card-mini">
                    <div className="val" style={{ color: "#2ecc71" }}>
                      ₹{detailData.commission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="lbl">Total Commission Earned</div>
                  </div>
                </div>
              </div>

              <div className="admin-card">
                <h3 className="admin-form-label" style={{ fontSize: "1.3rem", marginBottom: 20 }}>
                  <ShoppingCart size={18} className="me-2" style={ICON_STYLE} /> Sales &amp; Orders
                </h3>
                {detailData.orders.length === 0 ? (
                  <div className="empty-state text-center p-5">
                    <ShoppingBag size={48} className="mb-3" style={{ opacity: 0.3 }} />
                    <p>No orders found for this franchise partner yet.</p>
                  </div>
                ) : (
                  detailData.orders.map((order) => {
                    const slotTitle = order.slotId?.title || "N/A";
                    const userName = order.userId?.name || "N/A";
                    const userEmail = order.userId?.email || "N/A";
                    const price = order.price || 0;
                    const status = order.status || "pending";
                    const statusClass = status === "completed" || status === "paid" ? "status-paid" : status === "cancelled" ? "status-cancelled" : "status-pending";
                    const startTime = order.slotId?.startTime ? new Date(order.slotId.startTime).toLocaleString() : "N/A";

                    return (
                      <div className="order-item-premium" key={order._id}>
                        <div className="row align-items-center">
                          <div className="col-md-4">
                            <div style={{ fontWeight: 600, color: "var(--primary-gold)" }}>{slotTitle}</div>
                            <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                              <Clock size={12} className="me-1" style={ICON_STYLE} /> {startTime}
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div style={{ fontWeight: 500 }}>{userName}</div>
                            <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{userEmail}</div>
                          </div>
                          <div className="col-md-2">
                            <div style={{ fontWeight: 700, color: "var(--primary-gold)" }}>₹{price}</div>
                            <div style={{ fontSize: "0.65rem", opacity: 0.5 }}>GST INCLUDED</div>
                          </div>
                          <div className="col-md-2">
                            <span className={`status-badge ${statusClass}`}>{status.toUpperCase()}</span>
                          </div>
                          <div className="col-md-1 text-end">
                            <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Add Franchise Modal */}
      {modalOpen && (
        <div
          className="admin-modal-overlay"
          style={{ display: "flex" }}
          onClick={() => {
            setModalOpen(false);
            resetModalForm();
          }}
        >
          <div className="admin-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h5 className="admin-modal-title" style={{ fontSize: "1.2rem" }}>
                <PlusCircle size={18} className="me-2" style={ICON_STYLE} /> Add New Franchise
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={() => {
                  setModalOpen(false);
                  resetModalForm();
                }}
              ></button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createFranchise();
                }}
              >
                <div className="mb-3">
                  <label className="admin-form-label">Full Name *</label>
                  <input
                    type="text"
                    className="admin-input"
                    required
                    placeholder="Enter franchise owner name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="admin-form-label">Email Address *</label>
                  <input
                    type="email"
                    className="admin-input"
                    required
                    placeholder="franchise@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="admin-form-label">Phone Number</label>
                  <input type="tel" className="admin-input" placeholder="+91 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="admin-form-label">Commission Percentage (%) *</label>
                  <input
                    type="number"
                    className="admin-input"
                    min={0}
                    max={100}
                    step={1}
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="admin-form-label">Password *</label>
                  <div className="position-relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="admin-input"
                      required
                      placeholder="Min 6 characters"
                      style={{ paddingRight: 45 }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="franchise-password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {modalMessage && (
                  <div
                    className="alert mt-2"
                    style={{
                      background: modalMessage.type === "danger" ? "rgba(231,76,60,0.1)" : "rgba(46,204,113,0.1)",
                      borderColor: modalMessage.type === "danger" ? "#e74c3c" : "#2ecc71",
                      color: modalMessage.type === "danger" ? "#e74c3c" : "#2ecc71",
                    }}
                  >
                    {modalMessage.text}
                  </div>
                )}
                <div className="modal-footer px-0 pb-0 pt-3">
                  <button
                    type="button"
                    className="thm-btn"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                    onClick={() => {
                      setModalOpen(false);
                      resetModalForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="thm-btn" disabled={creating}>
                    {creating ? "Creating..." : "Create Franchise"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
