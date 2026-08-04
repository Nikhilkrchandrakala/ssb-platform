"use client";

import { useMemo, useState, useEffect } from "react";
import { useAdminUser } from "@/components/admin/AdminUserProvider";
import {
  ShieldCheck,
  UserPlus,
  Search,
  AlertTriangle,
  UserX,
  UserLock,
  Pencil,
  Lock,
  Trash2,
  UserPen,
  Eye,
  EyeOff,
  Info,
  Save,
} from "lucide-react";
import { ASSESSOR_TYPE_VALUES, assessorLabel } from "@/lib/assessorLabels";
import "@/app/admin/styles/legacy-roles.css";

const ICON_STYLE = { verticalAlign: -2 };

interface StaffUser {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  role: string;
  sourceCollection?: string;
  permissions?: string[];
  assessorType?: string | null;
  commissionPercent?: number;
  referralCode?: string;
  salesRole?: "executive" | "head" | null;
  reportsTo?: string | null;
  createdAt?: string;
}

const ROLE_LEVELS: Record<string, number> = {
  owner: 5,
  super_admin: 4,
  admin: 3,
  franchise: 2,
  assessor: 2,
  student: 1,
};

const CONTENT_PERMISSIONS: { value: string; label: string }[] = [
  { value: "dashboard", label: "Dashboard" },
  { value: "magazine", label: "Magazine" },
  { value: "blogs", label: "Blogs" },
  { value: "gallery", label: "Gallery" },
  { value: "candidates", label: "REC Candidates" },
];

const MANAGEMENT_PERMISSIONS: { value: string; label: string }[] = [
  { value: "courses", label: "Courses" },
  { value: "franchise", label: "Franchise" },
  { value: "sales", label: "Total Sales" },
  { value: "coupons", label: "Coupons" },
  { value: "leads", label: "Leads" },
  { value: "roles", label: "Roles & Permissions" },
  { value: "students", label: "Candidate Database" },
  { value: "allotment", label: "Assessor Allotment" },
  { value: "psych_battery", label: "Candidate Evaluation" },
];

const ASSESSOR_TYPES = ASSESSOR_TYPE_VALUES;

const PROTECTED_EMAIL = "nkc@ssbwithisv.in";
const SUPER_ADMIN_EMAIL = "info@ssbwithisv.in";

interface RoleFormState {
  id: string;
  email: string;
  name: string;
  phone: string;
  password: string;
  role: "assessor" | "franchise" | "admin" | "sales";
  commission: number;
  permissions: string[];
  assessorType: string;
  salesRole: "executive" | "head";
  reportsTo: string;
  emailReadonly: boolean;
  roleDisabled: boolean;
}

const EMPTY_FORM: RoleFormState = {
  id: "new",
  email: "",
  name: "",
  phone: "",
  password: "",
  role: "assessor",
  commission: 20,
  permissions: [],
  assessorType: "GTO",
  salesRole: "executive",
  reportsTo: "",
  emailReadonly: false,
  roleDisabled: false,
};

export default function RolesManagementView() {
  const { user } = useAdminUser();

  const [allUsers, setAllUsers] = useState<StaffUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Update Account Role");
  const [form, setForm] = useState<RoleFormState>(EMPTY_FORM);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to fetch staff accounts"))))
      .then((data) => {
        if (!cancelled) {
          setAllUsers(data.users || []);
          setUsersError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setUsersError(err instanceof Error ? err.message : "Failed to fetch staff accounts");
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadUsers = () => {
    setUsersLoading(true);
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to fetch staff accounts"))))
      .then((data) => {
        setAllUsers(data.users || []);
        setUsersError(null);
      })
      .catch((err) => setUsersError(err instanceof Error ? err.message : "Failed to fetch staff accounts"))
      .finally(() => setUsersLoading(false));
  };

  const loggedInUserId = String(user?.id || user?._id || "");
  const loggedInUserEmail = (user?.email || "").toLowerCase();
  const isSuperAdmin = (user?.permissions || []).includes("super_admin");
  const loggedInLevel =
    user?.role === "owner" ? "owner" : isSuperAdmin ? "super_admin" : user?.role || "student";

  const adminOptionDisabled = ROLE_LEVELS[loggedInLevel] <= ROLE_LEVELS["admin"];
  const superAdminCheckDisabled = ROLE_LEVELS[loggedInLevel] < ROLE_LEVELS["super_admin"];

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase().trim();
    return allUsers.filter((u) => {
      const matchesSearch =
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.phone && u.phone.toLowerCase().includes(query));
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "sales" ? u.role === "admin" && !!u.salesRole : u.role === roleFilter && !u.salesRole);
      return matchesSearch && matchesRole;
    });
  }, [allUsers, search, roleFilter]);

  // Sales Heads only — populates the "Reports To" picker when creating/editing a Sales Executive.
  const salesHeads = useMemo(() => allUsers.filter((u) => u.role === "admin" && u.salesRole === "head"), [allUsers]);
  const salesHeadName = (headId?: string | null) => {
    if (!headId) return null;
    const head = allUsers.find((u) => u.id === headId);
    return head ? head.name || head.email : "Unknown Head";
  };

  const openRoleModal = (u: StaffUser) => {
    const isSelf = u.id === loggedInUserId;
    const isProtectedUser = u.email.toLowerCase() === PROTECTED_EMAIL || u.role === "owner";
    const isSalesAccount = u.role === "admin" && !!u.salesRole;
    setModalTitle("Update Account Role");
    setForm({
      id: u.id,
      email: u.email,
      name: u.name || "",
      phone: u.phone || "",
      password: "",
      role: isSalesAccount ? "sales" : (u.role as RoleFormState["role"]) || "assessor",
      commission: u.commissionPercent || 20,
      permissions: u.permissions || [],
      assessorType: u.assessorType || "",
      salesRole: u.salesRole || "executive",
      reportsTo: u.reportsTo || "",
      emailReadonly: true,
      roleDisabled: isProtectedUser || isSelf,
    });
    setPasswordVisible(false);
    setModalOpen(true);
  };

  const openPromoteModal = () => {
    setModalTitle("Promote / Add Staff");
    setForm({ ...EMPTY_FORM, assessorType: "GTO" });
    setPasswordVisible(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const togglePermission = (value: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(value)
        ? prev.permissions.filter((p) => p !== value)
        : [...prev.permissions, value],
    }));
  };

  const toggleSuperAdmin = (checked: boolean) => {
    setForm((prev) => {
      if (checked) {
        const allValues = [...CONTENT_PERMISSIONS, ...MANAGEMENT_PERMISSIONS].map((p) => p.value);
        return { ...prev, permissions: Array.from(new Set([...prev.permissions, "super_admin", ...allValues])) };
      }
      return { ...prev, permissions: prev.permissions.filter((p) => p !== "super_admin") };
    });
  };

  const submitRoleForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (form.role === "sales" && form.salesRole === "executive" && !form.reportsTo) {
      window.Swal?.fire({
        icon: "warning",
        title: "Reports To required",
        text: "A Sales Executive must report to an existing Sales Head. Create the Head account first if none exists yet.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });
      return;
    }

    setIsSubmitting(true);

    const isSales = form.role === "sales";
    const backendRole = isSales ? "admin" : form.role;
    const permissions = form.role === "admin" ? form.permissions : isSales ? ["sales"] : [];
    const assessorTypeVal = form.role === "assessor" ? form.assessorType || null : null;

    window.Swal?.fire({
      title: "Configuring Role...",
      text: "Please wait while configuration syncs.",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    try {
      const res = await fetch(`/api/admin/users/${form.id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: backendRole,
          email: form.email.trim(),
          name: form.name.trim(),
          phone: form.phone.trim(),
          password: form.password.trim(),
          commissionPercent: Number(form.commission),
          permissions,
          assessorType: assessorTypeVal,
          salesRole: isSales ? form.salesRole : null,
          reportsTo: isSales && form.salesRole === "executive" ? form.reportsTo : null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to configure role");

      window.Swal?.fire({
        icon: "success",
        title: "Success",
        text: result.message || "Role updated successfully!",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });

      closeModal();
      reloadUsers();
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Error",
        text: error instanceof Error ? error.message : "Failed to configure role",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteUser = async (u: StaffUser) => {
    const result = await window.Swal?.fire({
      title: "Delete Staff Member?",
      html: `Are you sure you want to permanently delete <strong>${u.name || "this user"}</strong> (<code>${u.email}</code>)?<br><br><span style="color:#ff6b6b; font-size:0.85rem;"><i class="fas fa-exclamation-triangle"></i> This will delete the user completely from all databases!</span>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff6b6b",
      cancelButtonColor: "#555",
      confirmButtonText: "Yes, Delete permanently",
      cancelButtonText: "Cancel",
      background: "#1a1a1a",
      color: "#fff",
    });
    if (!result?.isConfirmed) return;

    window.Swal?.fire({
      title: "Deleting User...",
      text: "Please wait while the user account is removed.",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to delete user account");

      window.Swal?.fire({
        icon: "success",
        title: "Deleted!",
        text: resData.message || "User account deleted successfully.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });
      reloadUsers();
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Error Deleting User",
        text: error instanceof Error ? error.message : "Failed to delete user account",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    }
  };

  const roleBadge = (u: StaffUser) => {
    if (u.role === "owner") return { cls: "role-owner", label: "OWNER" };
    if (u.role === "admin" && u.salesRole === "head") return { cls: "role-sales", label: "Sales Head" };
    if (u.role === "admin" && u.salesRole === "executive") return { cls: "role-sales", label: "Sales Executive" };
    if (u.role === "admin") {
      const label =
        u.email.toLowerCase() === SUPER_ADMIN_EMAIL || (u.permissions || []).includes("super_admin")
          ? "SUPER ADMIN"
          : "Admin";
      return { cls: "role-admin", label };
    }
    if (u.role === "franchise") return { cls: "role-franchise", label: "Franchise" };
    if (u.role === "assessor") return { cls: "role-assessor", label: "Assessor" };
    return { cls: "role-student", label: "Candidate" };
  };

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <ShieldCheck size={20} className="me-2" style={ICON_STYLE} /> Roles &amp; Permissions
          </h1>
          <p className="text-muted mb-0">Assign roles (Admin, Franchise, Assessor) and manage staff access permissions</p>
        </div>
        <button className="thm-btn" onClick={openPromoteModal}>
          <UserPlus size={16} className="me-1" style={ICON_STYLE} /> Promote / Add Staff
        </button>
      </div>

      <div className="admin-card">
        <div className="roles-filter-bar">
          <div className="search-wrapper">
            <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="admin-input"
              placeholder="Search staff by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <span className="text-muted me-2 small">FILTER BY ROLE:</span>
            <select className="filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="assessor">Assessor</option>
              <option value="franchise">Franchise</option>
              <option value="sales">Sales (Executive/Head)</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>Designated Role</th>
                <th>Details / Affiliate Info</th>
                <th style={{ width: 200, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={6} className="text-center p-5">
                    <div className="spinner-border text-warning" role="status"></div>
                    <p className="mt-3 mb-0 opacity-70">Fetching staff accounts from database...</p>
                  </td>
                </tr>
              ) : usersError ? (
                <tr>
                  <td colSpan={6} className="text-center p-5 text-danger">
                    <AlertTriangle size={32} className="mb-3" />
                    <p className="mb-0">Error loading staff users: {usersError}</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-5 opacity-50">
                    <UserX size={32} className="mb-3" />
                    <p className="mb-0">No matching staff accounts found.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const badge = roleBadge(u);
                  const isProtected = u.email.toLowerCase() === PROTECTED_EMAIL || u.role === "owner";
                  const isSelf = u.id === loggedInUserId;
                  const isTargetOwner = u.role === "owner";
                  const isTargetSuper =
                    u.email.toLowerCase() === SUPER_ADMIN_EMAIL ||
                    u.email.toLowerCase() === PROTECTED_EMAIL ||
                    (u.permissions || []).includes("super_admin");
                  const targetLevel = isTargetOwner ? "owner" : isTargetSuper ? "super_admin" : u.role;
                  const canEdit =
                    !isSelf &&
                    !isProtected &&
                    (loggedInLevel === "super_admin" || ROLE_LEVELS[loggedInLevel] > ROLE_LEVELS[targetLevel]);
                  const canDelete =
                    !isSelf &&
                    !isProtected &&
                    (loggedInUserEmail === PROTECTED_EMAIL || ROLE_LEVELS[loggedInLevel] > ROLE_LEVELS[targetLevel]);

                  return (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name || "System Admin"}</strong>
                      </td>
                      <td>{u.email}</td>
                      <td>{u.phone || "N/A"}</td>
                      <td>
                        <span className={`role-badge ${badge.cls}`}>{badge.label}</span>
                      </td>
                      <td>
                        {u.role === "admin" && u.salesRole === "head" ? (
                          <div style={{ fontSize: "0.85rem" }}>
                            <span className="text-warning">Manages:</span>{" "}
                            <span>{allUsers.filter((au) => au.reportsTo === u.id).length} executive(s)</span>
                          </div>
                        ) : u.role === "admin" && u.salesRole === "executive" ? (
                          <div style={{ fontSize: "0.85rem" }}>
                            <span className="text-warning">Reports to:</span> <span>{salesHeadName(u.reportsTo) || "—"}</span>
                          </div>
                        ) : u.role === "franchise" ? (
                          <div style={{ fontSize: "0.85rem" }}>
                            <span className="text-warning">Code:</span> <code>{u.referralCode || "N/A"}</code>
                            <br />
                            <span className="text-warning">Comm:</span> <span>{u.commissionPercent || 20}%</span>
                          </div>
                        ) : u.role === "assessor" ? (
                          <div style={{ fontSize: "0.85rem" }}>
                            <span className="text-warning">Specialization:</span>{" "}
                            <strong style={{ color: "#9b59b6" }}>{assessorLabel(u.assessorType) || "General Assessor"}</strong>
                          </div>
                        ) : (
                          <span className="opacity-50">—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        {isProtected ? (
                          <button
                            className="thm-btn"
                            style={{ background: "#555", borderColor: "#555", padding: "6px 12px", fontSize: "0.8rem", opacity: 0.6, cursor: "not-allowed" }}
                            disabled
                            title="This is a protected user and cannot be edited."
                          >
                            <ShieldCheck size={14} className="me-1" style={ICON_STYLE} /> Locked
                          </button>
                        ) : isSelf ? (
                          <button
                            className="thm-btn"
                            style={{ background: "#555", borderColor: "#555", padding: "6px 12px", fontSize: "0.8rem", opacity: 0.6, cursor: "not-allowed" }}
                            disabled
                            title="You cannot edit your own account here."
                          >
                            <UserLock size={14} className="me-1" style={ICON_STYLE} /> Self
                          </button>
                        ) : !canEdit ? (
                          <button
                            className="thm-btn"
                            style={{ background: "#555", borderColor: "#555", padding: "6px 12px", fontSize: "0.8rem", opacity: 0.6, cursor: "not-allowed" }}
                            disabled
                            title="You cannot edit other users on the same or higher level."
                          >
                            <ShieldCheck size={14} className="me-1" style={ICON_STYLE} /> Locked
                          </button>
                        ) : (
                          <button className="thm-btn" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => openRoleModal(u)}>
                            <Pencil size={14} className="me-1" style={ICON_STYLE} /> Edit
                          </button>
                        )}

                        {isProtected ? (
                          <button
                            className="thm-btn"
                            style={{ background: "#555", borderColor: "#555", padding: "6px 12px", fontSize: "0.8rem", marginLeft: 5, opacity: 0.6, cursor: "not-allowed" }}
                            disabled
                            title="This is a protected user and cannot be deleted."
                          >
                            <Lock size={14} className="me-1" style={ICON_STYLE} /> Locked
                          </button>
                        ) : isSelf ? (
                          <button
                            className="thm-btn"
                            style={{ background: "#555", borderColor: "#555", padding: "6px 12px", fontSize: "0.8rem", marginLeft: 5, opacity: 0.6, cursor: "not-allowed" }}
                            disabled
                            title="You cannot delete your own account."
                          >
                            <UserLock size={14} className="me-1" style={ICON_STYLE} /> Self
                          </button>
                        ) : !canDelete ? (
                          <button
                            className="thm-btn"
                            style={{ background: "#555", borderColor: "#555", padding: "6px 12px", fontSize: "0.8rem", marginLeft: 5, opacity: 0.6, cursor: "not-allowed" }}
                            disabled
                            title="You cannot delete other users on the same or higher level."
                          >
                            <Lock size={14} className="me-1" style={ICON_STYLE} /> Locked
                          </button>
                        ) : (
                          <button
                            className="thm-btn"
                            style={{ background: "#ff6b6b", borderColor: "#ff6b6b", padding: "6px 12px", fontSize: "0.8rem", marginLeft: 5 }}
                            onClick={() => confirmDeleteUser(u)}
                          >
                            <Trash2 size={14} className="me-1" style={ICON_STYLE} /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="admin-modal-overlay" style={{ display: "flex" }}>
          <div className="admin-modal" style={{ maxWidth: 950, width: "95%", margin: "20px auto" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                <UserPen size={18} className="me-2" style={ICON_STYLE} /> {modalTitle}
              </h3>
              <button type="button" className="btn-close btn-close-white" onClick={closeModal}></button>
            </div>
            <form onSubmit={submitRoleForm}>
              <div className="row">
                <div className="col-md-5 border-end border-secondary pe-4">
                  <h5 className="text-warning mb-3" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Account Details
                  </h5>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Email Address</label>
                    <input
                      type="email"
                      className="admin-input"
                      required
                      placeholder="e.g. user@example.com"
                      value={form.email}
                      readOnly={form.emailReadonly}
                      disabled={form.emailReadonly}
                      style={form.emailReadonly ? { background: "#2b2b2b", borderColor: "#555", opacity: 0.8 } : undefined}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">User Name</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="User Name (optional)"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Phone Number</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. +91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Force Reset Password (Optional)</label>
                    <div className="position-relative">
                      <input
                        type={passwordVisible ? "text" : "password"}
                        className="admin-input"
                        placeholder="Enter new password"
                        style={{ paddingRight: 45 }}
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => setPasswordVisible((v) => !v)}
                        style={{ position: "absolute", right: 15, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", zIndex: 10 }}
                      >
                        {passwordVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Select System Role</label>
                    <select
                      className="admin-input"
                      required
                      value={form.role}
                      disabled={form.roleDisabled}
                      style={form.roleDisabled ? { background: "#2b2b2b", borderColor: "#555", opacity: 0.8 } : undefined}
                      onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as RoleFormState["role"] }))}
                    >
                      <option value="assessor">Assessor (Evaluator Specialization)</option>
                      <option value="franchise">Franchise Partner (Affiliate Sales)</option>
                      <option value="sales" disabled={adminOptionDisabled}>
                        Sales Person (Executive/Head)
                      </option>
                      <option value="admin" disabled={adminOptionDisabled}>
                        System Admin (Configurable Page Access)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="col-md-7 ps-4 d-flex flex-column justify-content-between">
                  <div>
                    {form.role === "franchise" && (
                      <div className="admin-form-group commission-input-group" style={{ display: "block" }}>
                        <h5 className="text-warning mb-3" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Franchise Configuration
                        </h5>
                        <label className="admin-form-label">Commission Rate (%)</label>
                        <input
                          type="number"
                          className="admin-input"
                          min={0}
                          max={100}
                          value={form.commission}
                          placeholder="e.g. 20"
                          onChange={(e) => setForm((prev) => ({ ...prev, commission: Number(e.target.value) }))}
                        />
                        <p className="small text-muted mt-2">
                          <Info size={14} style={ICON_STYLE} /> A unique referral code will be automatically generated upon submission for marketing attribution.
                        </p>
                      </div>
                    )}

                    {form.role === "sales" && (
                      <div className="admin-form-group" style={{ display: "block", animation: "fadeIn 0.3s ease" }}>
                        <h5 className="text-warning mb-3" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Sales Hierarchy
                        </h5>
                        <p className="small text-muted mb-3">
                          <Info size={14} style={ICON_STYLE} /> A Sales Head manages a team of executives and reports directly to the Owner. A Sales
                          Executive must report to an existing Head.
                        </p>
                        <div className="d-flex flex-column gap-3 mb-3">
                          <label className="d-flex align-items-center gap-2" style={{ color: "#fff", cursor: "pointer", fontSize: 13 }}>
                            <input
                              type="radio"
                              name="salesRole"
                              checked={form.salesRole === "head"}
                              onChange={() => setForm((prev) => ({ ...prev, salesRole: "head", reportsTo: "" }))}
                              className="form-check-input mt-0"
                              style={{ backgroundColor: "#2b2b2b", borderColor: "#555", width: 18, height: 18 }}
                            />{" "}
                            <strong>Sales Head</strong> (manages a team, reports to Owner)
                          </label>
                          <label className="d-flex align-items-center gap-2" style={{ color: "#fff", cursor: "pointer", fontSize: 13 }}>
                            <input
                              type="radio"
                              name="salesRole"
                              checked={form.salesRole === "executive"}
                              onChange={() => setForm((prev) => ({ ...prev, salesRole: "executive" }))}
                              className="form-check-input mt-0"
                              style={{ backgroundColor: "#2b2b2b", borderColor: "#555", width: 18, height: 18 }}
                            />{" "}
                            <strong>Sales Executive</strong> (reports to a Sales Head)
                          </label>
                        </div>

                        {form.salesRole === "executive" && (
                          <div className="admin-form-group">
                            <label className="admin-form-label">Reports To (Sales Head)</label>
                            {salesHeads.length === 0 ? (
                              <p className="small text-danger mb-0">
                                <AlertTriangle size={14} style={ICON_STYLE} /> No Sales Head exists yet — create one first (select &ldquo;Sales
                                Head&rdquo; above) before adding an executive.
                              </p>
                            ) : (
                              <select
                                className="admin-input"
                                required
                                value={form.reportsTo}
                                onChange={(e) => setForm((prev) => ({ ...prev, reportsTo: e.target.value }))}
                              >
                                <option value="">Select a Sales Head…</option>
                                {salesHeads
                                  .filter((h) => h.id !== form.id)
                                  .map((h) => (
                                    <option key={h.id} value={h.id}>
                                      {h.name || h.email}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {form.role === "assessor" && (
                      <div className="admin-form-group" style={{ display: "block", animation: "fadeIn 0.3s ease" }}>
                        <h5 className="text-warning mb-3" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Assessor Specialization
                        </h5>
                        <p className="small text-muted mb-3">
                          <Info size={14} style={ICON_STYLE} /> Specify the assessment officer subtype for Candidate Evaluation assignments:
                        </p>
                        <div className="d-flex flex-column gap-3">
                          {ASSESSOR_TYPES.map((at) => (
                            <label key={at} className="d-flex align-items-center gap-2" style={{ color: "#fff", cursor: "pointer", fontSize: 13 }}>
                              <input
                                type="radio"
                                name="assessorType"
                                value={at}
                                checked={form.assessorType === at}
                                onChange={() => setForm((prev) => ({ ...prev, assessorType: at }))}
                                className="form-check-input mt-0"
                                style={{ backgroundColor: "#2b2b2b", borderColor: "#555", width: 18, height: 18 }}
                              />{" "}
                              <strong>{assessorLabel(at)}</strong>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {form.role === "admin" && (
                      <div className="admin-form-group" style={{ display: "block", animation: "fadeIn 0.3s ease" }}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h5 className="text-warning mb-0" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Page clearances
                          </h5>
                          <label
                            className="d-flex align-items-center gap-2 text-warning mb-0"
                            style={{ cursor: "pointer", fontSize: 12, fontWeight: "bold", background: "rgba(224, 194, 20, 0.1)", padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(224, 194, 20, 0.2)" }}
                          >
                            <input
                              type="checkbox"
                              checked={form.permissions.includes("super_admin")}
                              disabled={superAdminCheckDisabled}
                              onChange={(e) => toggleSuperAdmin(e.target.checked)}
                              className="form-check-input mt-0"
                              style={{ backgroundColor: "#2b2b2b", borderColor: "#e0c214" }}
                            />{" "}
                            Super Admin
                          </label>
                        </div>
                        <p className="small text-muted mb-3">
                          <Info size={14} style={ICON_STYLE} /> Enable specific page checkboxes to grant administrative clearance:
                        </p>

                        <div className="row g-3">
                          <div className="col-6">
                            <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 6, border: "1px solid #333" }}>
                              <strong style={{ fontSize: 11, textTransform: "uppercase", color: "var(--primary-gold)", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                                Content Pages
                              </strong>
                              <div className="d-flex flex-column gap-2">
                                {CONTENT_PERMISSIONS.map((p) => (
                                  <label key={p.value} className="d-flex align-items-center gap-2" style={{ color: "#fff", cursor: "pointer", fontSize: 12 }}>
                                    <input
                                      type="checkbox"
                                      checked={form.permissions.includes(p.value)}
                                      onChange={() => togglePermission(p.value)}
                                      className="form-check-input mt-0"
                                      style={{ backgroundColor: "#2b2b2b", borderColor: "#555" }}
                                    />{" "}
                                    {p.label}
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="col-6">
                            <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 6, border: "1px solid #333" }}>
                              <strong style={{ fontSize: 11, textTransform: "uppercase", color: "var(--primary-gold)", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                                Management Pages
                              </strong>
                              <div className="d-flex flex-column gap-2">
                                {MANAGEMENT_PERMISSIONS.map((p) => (
                                  <label key={p.value} className="d-flex align-items-center gap-2" style={{ color: "#fff", cursor: "pointer", fontSize: 12 }}>
                                    <input
                                      type="checkbox"
                                      checked={form.permissions.includes(p.value)}
                                      onChange={() => togglePermission(p.value)}
                                      className="form-check-input mt-0"
                                      style={{ backgroundColor: "#2b2b2b", borderColor: "#555" }}
                                    />{" "}
                                    {p.label}
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary">
                    <button type="button" className="thm-btn cancel-btn" style={{ padding: "8px 25px" }} onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="thm-btn" style={{ padding: "8px 25px" }} disabled={isSubmitting}>
                      <Save size={14} className="me-1" style={ICON_STYLE} /> Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
