"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ticket,
  PlusCircle,
  List,
  Plus,
  Store,
  UserCheck,
  Pencil,
  Trash2,
} from "lucide-react";
import "@/app/admin/styles/legacy-coupon-management.css";

const ICON_STYLE = { verticalAlign: -2 };

/**
 * Ported from admin-ssbwithisv/CouponManagement.html + assets/js/coupons.js.
 * Legacy used localStorage JWT + Authorization headers against a separate
 * Express origin; here the httpOnly session cookie attaches automatically to
 * same-origin fetch calls against /api/myCoupons, /api/coupon/:id,
 * /api/createCoupon, /api/updateCoupon/:id, /api/deleteCoupon/:id.
 */

interface CouponItem {
  _id: string;
  code: string;
  discountType: "percent" | "flat";
  discountValue: number;
  expiry?: string | null;
  isActive: boolean;
  usedBy?: { userId?: string; usedAt?: string }[];
  franchiseId?: { name?: string } | string | null;
  createdAt?: string;
}

async function parseJsonSafe(res: Response): Promise<Record<string, unknown>> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function escapeHtml(str: string | undefined | null): string {
  if (!str) return "";
  return String(str).replace(/[&<>]/g, (m) => (m === "&" ? "&amp;" : m === "<" ? "&lt;" : "&gt;"));
}

function formatDiscount(coupon: CouponItem): string {
  return coupon.discountType === "percent" ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`;
}

function getFranchiseDisplay(coupon: CouponItem): { label: string; isFranchise: boolean } {
  if (coupon.franchiseId) {
    const name = typeof coupon.franchiseId === "object" ? coupon.franchiseId.name || "Franchise" : "Franchise";
    return { label: name, isFranchise: true };
  }
  return { label: "Admin", isFranchise: false };
}

export default function CouponManagementView() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "flat">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [expiry, setExpiry] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Initial load — inline .then() chain per repo convention (avoids
  // react-hooks/set-state-in-effect by not delegating to a named async fn).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/myCoupons")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch coupons");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list: CouponItem[] = data.coupons || data;
        setCoupons(Array.isArray(list) ? list : []);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to fetch coupons");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadCoupons() {
    setLoading(true);
    try {
      const res = await fetch("/api/myCoupons");
      if (!res.ok) throw new Error("Failed to fetch coupons");
      const data = await res.json();
      const list: CouponItem[] = data.coupons || data;
      setCoupons(Array.isArray(list) ? list : []);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to fetch coupons");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const total = coupons.length;
    const now = new Date();
    const active = coupons.filter((c) => {
      if (!c.isActive) return false;
      if (c.expiry && new Date(c.expiry) < now) return false;
      return true;
    }).length;
    const totalUsed = coupons.reduce((sum, c) => sum + (c.usedBy?.length || 0), 0);
    return { total, active, totalUsed };
  }, [coupons]);

  function resetForm() {
    setCode("");
    setDiscountType("percent");
    setDiscountValue("");
    setExpiry("");
    setIsActive(true);
  }

  function openAddModal() {
    setEditId(null);
    resetForm();
    setModalOpen(true);
  }

  async function openEditModal(id: string) {
    try {
      const res = await fetch(`/api/coupon/${id}`);
      if (!res.ok) throw new Error("Failed to fetch coupon details");
      const coupon: CouponItem = await res.json();

      setEditId(id);
      setCode(coupon.code);
      setDiscountType(coupon.discountType);
      setDiscountValue(String(coupon.discountValue));
      setExpiry(coupon.expiry ? new Date(coupon.expiry).toISOString().slice(0, 16) : "");
      setIsActive(!!coupon.isActive);
      setModalOpen(true);
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Error",
        text: err instanceof Error ? err.message : "Failed to fetch coupon details",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  }

  function closeModal() {
    setModalOpen(false);
    setEditId(null);
    resetForm();
  }

  async function saveCoupon() {
    const trimmedCode = code.trim().toUpperCase();
    const value = parseFloat(discountValue);

    if (!trimmedCode) {
      window.Swal?.fire({ icon: "warning", title: "Missing Code", text: "Please enter a coupon code.", background: "#1a1a1a", color: "#fff" });
      return;
    }
    if (!value || value <= 0) {
      window.Swal?.fire({ icon: "warning", title: "Invalid Discount", text: "Please enter a valid discount value.", background: "#1a1a1a", color: "#fff" });
      return;
    }

    const payload: Record<string, unknown> = {
      code: trimmedCode,
      discountType,
      discountValue: value,
      expiry: expiry ? new Date(expiry).toISOString() : null,
    };
    if (editId) {
      payload.isActive = isActive;
    }

    setSaving(true);
    try {
      const res = await fetch(editId ? `/api/updateCoupon/${editId}` : "/api/createCoupon", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error((data.message as string) || "Failed to save coupon");

      window.Swal?.fire({
        icon: "success",
        title: editId ? "Coupon Updated" : "Coupon Created",
        text: "The coupon has been saved successfully.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });

      closeModal();
      await reloadCoupons();
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Error",
        text: err instanceof Error ? err.message : "Failed to save coupon",
        background: "#1a1a1a",
        color: "#fff",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCoupon(id: string) {
    const result = await window.Swal?.fire({
      title: "Are you sure?",
      text: "This coupon will be deleted forever. You can't undo this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff6b6b",
      cancelButtonColor: "rgba(255,255,255,0.1)",
      confirmButtonText: "Yes, delete it!",
      background: "#1a1a1a",
      color: "#fff",
    });

    if (!result?.isConfirmed) return;

    try {
      const res = await fetch(`/api/deleteCoupon/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete coupon");

      window.Swal?.fire({ icon: "success", title: "Deleted!", text: "Coupon has been removed.", background: "#1a1a1a", color: "#fff" });
      await reloadCoupons();
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Error",
        text: err instanceof Error ? err.message : "Failed to delete coupon",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  }

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <Ticket size={20} className="me-2" style={ICON_STYLE} /> Coupon Management
          </h1>
          <p className="text-muted mb-0">Create and manage discount coupons for customers and franchises</p>
        </div>
        <button className="thm-btn" onClick={openAddModal}>
          <PlusCircle size={16} style={ICON_STYLE} /> Create Coupon
        </button>
      </div>

      {/* Stats Row */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="stat-card-mini">
            <div className="val">{stats.total}</div>
            <div className="lbl">Total Coupons</div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="stat-card-mini">
            <div className="val">{stats.active}</div>
            <div className="lbl">Active Coupons</div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="stat-card-mini">
            <div className="val">{stats.totalUsed}</div>
            <div className="lbl">Total Redemptions</div>
          </div>
        </div>
      </div>

      {/* Coupons Table Section */}
      <div className="admin-card">
        <h3 className="admin-form-label" style={{ fontSize: "1.3rem", marginBottom: 25 }}>
          <List size={18} className="me-2" style={ICON_STYLE} /> Active &amp; Past Coupons
        </h3>

        {loading && (
          <div className="loading-spinner text-center" style={{ padding: 40 }}>
            <div className="spinner-border text-warning" role="status"></div>
            <p className="mt-2">Loading coupons...</p>
          </div>
        )}

        {!loading && (
          <div className="admin-table-container">
            {loadError ? (
              <table className="admin-table">
                <tbody>
                  <tr>
                    <td colSpan={9} className="text-center text-warning p-4">
                      {loadError}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : coupons.length === 0 ? (
              <div className="empty-state text-center" style={{ padding: 60 }}>
                <div className="empty-icon mb-3" style={{ color: "var(--primary-gold)", opacity: 0.5 }}>
                  <Ticket size={48} />
                </div>
                <h3>No Coupons Found</h3>
                <p>Start by creating your first promotional discount coupon.</p>
                <button className="thm-btn mt-3" onClick={openAddModal}>
                  <Plus size={14} style={ICON_STYLE} /> Create Coupon
                </button>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Code</th>
                    <th>Discount</th>
                    <th>Expiry</th>
                    <th>Type</th>
                    <th>Used</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon, index) => {
                    const now = new Date();
                    const isExpired = coupon.expiry ? new Date(coupon.expiry) < now : false;
                    let statusClass = "status-inactive";
                    let statusText = "Inactive";
                    if (coupon.isActive && isExpired) {
                      statusClass = "status-expired";
                      statusText = "Expired";
                    } else if (coupon.isActive && !isExpired) {
                      statusClass = "status-active";
                      statusText = "Active";
                    }
                    const expiryDate = coupon.expiry
                      ? new Date(coupon.expiry).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : null;
                    const usedCount = coupon.usedBy?.length || 0;
                    const createdAt = coupon.createdAt ? new Date(coupon.createdAt).toLocaleDateString("en-IN") : "N/A";
                    const franchiseDisplay = getFranchiseDisplay(coupon);

                    return (
                      <tr key={coupon._id}>
                        <td>{index + 1}</td>
                        <td>
                          <span className="coupon-code-badge">{escapeHtml(coupon.code)}</span>
                        </td>
                        <td>
                          <span className="discount-val">{formatDiscount(coupon)}</span>
                        </td>
                        <td>{expiryDate ?? <span style={{ opacity: 0.3 }}>&#8734;</span>}</td>
                        <td>
                          {franchiseDisplay.isFranchise ? (
                            <span className="franchise-badge">
                              <Store size={12} className="me-1" style={ICON_STYLE} /> {escapeHtml(franchiseDisplay.label)}
                            </span>
                          ) : (
                            <span style={{ opacity: 0.5 }}>Admin</span>
                          )}
                        </td>
                        <td>
                          <UserCheck size={12} className="me-1" style={{ ...ICON_STYLE, opacity: 0.5 }} /> {usedCount}
                        </td>
                        <td>
                          <span className={`status-badge ${statusClass}`}>{statusText}</span>
                        </td>
                        <td>{createdAt}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button className="action-btn edit-btn" title="Edit Coupon" onClick={() => openEditModal(coupon._id)}>
                              <Pencil size={14} />
                            </button>
                            <button className="action-btn delete-btn" title="Delete Coupon" onClick={() => deleteCoupon(coupon._id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Coupon Modal */}
      {modalOpen && (
        <div className="admin-modal-overlay" style={{ display: "flex" }} onClick={closeModal}>
          <div className="admin-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h5 className="admin-modal-title" style={{ fontSize: "1.2rem" }}>
                {editId ? (
                  <Pencil size={18} className="me-2" style={ICON_STYLE} />
                ) : (
                  <PlusCircle size={18} className="me-2" style={ICON_STYLE} />
                )}{" "}
                {editId ? "Edit Coupon" : "Create New Coupon"}
              </h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={closeModal}></button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveCoupon();
                }}
              >
                <div className="mb-3">
                  <label className="admin-form-label">Coupon Code *</label>
                  <input
                    type="text"
                    className="admin-input"
                    required
                    maxLength={20}
                    placeholder="e.g. SUMMER50"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    UPPERCASE AND NUMBERS ONLY
                  </small>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="admin-form-label">Discount Type *</label>
                    <select
                      className="admin-input"
                      required
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as "percent" | "flat")}
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="flat">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="admin-form-label">Discount Value *</label>
                    <input
                      type="number"
                      className="admin-input"
                      required
                      placeholder="e.g. 20"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="admin-form-label">Expiry Date (Optional)</label>
                  <input type="datetime-local" className="admin-input" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                </div>
                {editId && (
                  <div className="mb-3">
                    <label className="admin-form-label">Status</label>
                    <select className="admin-input" value={isActive ? "true" : "false"} onChange={(e) => setIsActive(e.target.value === "true")}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                )}
                <div className="modal-footer px-0 pb-0 pt-3">
                  <button
                    type="button"
                    className="thm-btn"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="thm-btn" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span> Saving...
                      </>
                    ) : (
                      "Save Coupon"
                    )}
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
