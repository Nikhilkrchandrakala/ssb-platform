"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  AlertTriangle,
  Database,
  Eye,
  IdCard,
  ShieldUser,
  XCircle,
  Receipt,
  Save,
  Plus,
} from "lucide-react";
import "@/app/admin/styles/legacy-all-users.css";

const ICON_STYLE = { verticalAlign: -2 };

interface DirectoryUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  createdAt: string;
  profileImage?: string;
  clinicalStage?: string;
  batch?: string;
  chestNo?: string;
}

interface AssessorRef {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface StudentDetail extends DirectoryUser {
  assignedPsych?: AssessorRef | null;
  assignedGTO?: AssessorRef | null;
  assignedTO?: AssessorRef | null;
  assignedIO?: AssessorRef | null;
}

interface OrderSlot {
  title?: string;
  batchNo?: string;
}

interface OrderRecord {
  _id: string;
  orderId?: string;
  price?: number;
  createdAt: string;
  slotId?: OrderSlot | null;
}

const STAGE_TITLES: Record<string, string> = {
  full_course: "Full Course",
  ssb_ppdt: "Intro & PPDT",
  psych: "Psychology",
  interview: "Interview",
  group_testing: "GTO Tasks",
};

const MODULES: { value: string; label: string }[] = [
  { value: "full_course", label: "Full 10-day SSB Hackathon" },
  { value: "ssb_ppdt", label: "Intro to SSB & PPDT (Screening)" },
  { value: "psych", label: "Psychology Prep Program" },
  { value: "interview", label: "Interview & Mock Course" },
  { value: "group_testing", label: "GTO Course on VTX" },
];

const ROLE_BADGE_CLASS: Record<string, string> = {
  admin: "bg-danger",
  superadmin: "bg-danger",
  assessor: "bg-info",
  franchise: "bg-secondary",
  student: "bg-success",
  lead: "bg-warning text-dark",
};

const ITEMS_PER_PAGE = 10;

function getInitials(name?: string) {
  if (!name) return "ST";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ name, src }: { name?: string; src?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name);
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name || ""} className="avatar-circle" onError={() => setFailed(true)} />;
  }
  return <div className="avatar-circle">{initials}</div>;
}

interface EditFormState {
  id: string;
  name: string;
  email: string;
  phone: string;
  batch: string;
  chestNo: string;
  modules: string[];
}

const EMPTY_EDIT_FORM: EditFormState = { id: "", name: "", email: "", phone: "", batch: "", chestNo: "", modules: [] };

interface AddFormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  batch: string;
  chestNo: string;
  stage: string;
}

const EMPTY_ADD_FORM: AddFormState = { name: "", email: "", phone: "", password: "", batch: "", chestNo: "", stage: "full_course" };

export default function AllUsersView() {
  const [allUsers, setAllUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [studentOrders, setStudentOrders] = useState<OrderRecord[]>([]);
  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_EDIT_FORM);
  const [savingProfile, setSavingProfile] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>(EMPTY_ADD_FORM);
  const [addingStudent, setAddingStudent] = useState(false);

  const reloadUsers = () => {
    setLoading(true);
    fetch("/api/admin/all-users")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to fetch candidate profiles"))))
      .then((data) => {
        setAllUsers(data.users || []);
        setLoadError(null);
        setCurrentPage(1);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to fetch candidate profiles"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/all-users")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to fetch candidate profiles"))))
      .then((data) => {
        if (!cancelled) {
          setAllUsers(data.users || []);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to fetch candidate profiles");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase().trim();
    return allUsers.filter((u) => {
      const matchesSearch =
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.phone && u.phone.toLowerCase().includes(query));
      if (roleFilter === "admin") {
        return matchesSearch && (u.role === "admin" || u.role === "superadmin");
      }
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [allUsers, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageSlice = filteredUsers.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [] as (number | "ellipsis")[];
    let startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
    const nums: (number | "ellipsis")[] = [];
    if (startPage > 1) {
      nums.push(1);
      if (startPage > 2) nums.push("ellipsis");
    }
    for (let i = startPage; i <= endPage; i++) nums.push(i);
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) nums.push("ellipsis");
      nums.push(totalPages);
    }
    return nums;
  }, [totalPages, currentPage]);

  // ── Student Detail Modal ──
  const openStudentModal = async (id: string) => {
    window.Swal?.fire({
      title: "Loading Profile Details...",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    try {
      const res = await fetch(`/api/admin/students/${id}`);
      if (!res.ok) throw new Error("Failed to load details from server");
      const result = await res.json();
      const student: StudentDetail = result.student;
      const orders: OrderRecord[] = result.orders || [];

      window.Swal?.close();

      const activeStages = (student.clinicalStage || "full_course").split(",").map((s) => s.trim()).filter(Boolean);

      setStudentDetail(student);
      setStudentOrders(orders);
      setEditForm({
        id: student._id,
        name: student.name || "",
        email: student.email || "",
        phone: student.phone || "",
        batch: student.batch || "",
        chestNo: student.chestNo || "",
        modules: activeStages,
      });
      setStudentModalOpen(true);
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Failed to Fetch Details",
        text: error instanceof Error ? error.message : "Failed to load details from server",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    }
  };

  const closeStudentModal = () => setStudentModalOpen(false);

  const fullSelected = editForm.modules.includes("full_course");
  const othersSelected = editForm.modules.some((m) => m !== "full_course");

  const toggleModule = (value: string) => {
    setEditForm((prev) => {
      const isChecked = prev.modules.includes(value);
      if (value === "full_course") {
        return { ...prev, modules: isChecked ? [] : ["full_course"] };
      }
      if (isChecked) {
        return { ...prev, modules: prev.modules.filter((m) => m !== value) };
      }
      return { ...prev, modules: [...prev.modules.filter((m) => m !== "full_course"), value] };
    });
  };

  const submitEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const clinicalStage = editForm.modules.length > 0 ? editForm.modules.join(",") : "full_course";

    window.Swal?.fire({
      title: "Saving Credentials...",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    try {
      const res = await fetch(`/api/admin/students/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          batch: editForm.batch.trim(),
          clinicalStage,
          chestNo: editForm.chestNo.trim(),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update profile");

      window.Swal?.fire({
        icon: "success",
        title: "Profile Saved!",
        text: "Candidate profile credentials updated successfully.",
        background: "#1a1a1a",
        color: "#fff",
        timer: 1500,
        showConfirmButton: false,
      });

      closeStudentModal();
      reloadUsers();
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Save Failed",
        text: error instanceof Error ? error.message : "Failed to update profile",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Add Candidate Modal ──
  const openAddModal = () => {
    setAddForm(EMPTY_ADD_FORM);
    setAddModalOpen(true);
  };
  const closeAddModal = () => setAddModalOpen(false);

  const submitAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingStudent(true);

    window.Swal?.fire({
      title: "Creating Trainee Account...",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          phone: addForm.phone.trim(),
          password: addForm.password,
          batch: addForm.batch.trim(),
          clinicalStage: addForm.stage,
          chestNo: addForm.chestNo.trim(),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create candidate trainee");

      window.Swal?.fire({
        icon: "success",
        title: "Candidate Added!",
        text: "The trainee record has been saved successfully in the database.",
        background: "#1a1a1a",
        color: "#fff",
        timer: 2000,
        showConfirmButton: false,
      });

      closeAddModal();
      reloadUsers();
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Creation Failed",
        text: error instanceof Error ? error.message : "Failed to create candidate trainee",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    } finally {
      setAddingStudent(false);
    }
  };

  const renderAssessorBadge = (assessor: AssessorRef | null | undefined, label: string) => {
    if (assessor) {
      return (
        <div className="mini-badge w-100 p-2 d-flex justify-content-between align-items-center mb-1" key={label}>
          <span>
            <ShieldUser size={14} className="me-1" style={ICON_STYLE} /> {label} Assessor
          </span>
          <strong style={{ color: "#fff" }}>{assessor.name}</strong>
        </div>
      );
    }
    return (
      <div
        className="mini-badge w-100 p-2 d-flex justify-content-between align-items-center mb-1"
        style={{ background: "rgba(231, 76, 60, 0.04)", borderColor: "rgba(231, 76, 60, 0.15)" }}
        key={label}
      >
        <span style={{ color: "#ff6b6b" }}>
          <XCircle size={14} className="me-1" style={ICON_STYLE} /> {label} Assessor
        </span>
        <strong style={{ color: "#ff6b6b", fontWeight: 500 }}>Unassigned</strong>
      </div>
    );
  };

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <Users size={20} className="me-2" style={ICON_STYLE} /> All Users Database
          </h1>
          <p className="text-muted mb-0">Unified directory of every account in the system (Admins, Assessors, Students, Leads)</p>
        </div>
        <div className="d-flex gap-2">
          <button className="thm-btn" onClick={openAddModal}>
            <UserPlus size={16} className="me-2" style={ICON_STYLE} /> Add Candidate
          </button>
        </div>
      </div>

      <div className="admin-card">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div style={{ position: "relative", maxWidth: 400, width: "100%" }}>
            <Search size={16} style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="admin-input"
              placeholder="Search candidates by name, email, phone..."
              style={{ paddingLeft: 45 }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="d-flex gap-3 align-items-center flex-wrap">
            <div className="d-flex gap-2 align-items-center">
              <span className="text-muted small">ROLE FILTER:</span>
              <select
                className="admin-input"
                style={{ width: 220, padding: "8px 15px" }}
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin / Superadmin</option>
                <option value="assessor">Assessor (GTO/Psych/IO/TO)</option>
                <option value="student">Student (Paid)</option>
                <option value="lead">Lead (Unpaid)</option>
                <option value="franchise">Franchise</option>
              </select>
            </div>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User / Email</th>
                <th>Phone Contact</th>
                <th>System Role</th>
                <th>Registration Date</th>
                <th>Status / Badges</th>
                <th style={{ width: 130, textAlign: "center" }}>View Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center p-5">
                    <div className="spinner-border text-warning" role="status"></div>
                    <p className="mt-3 mb-0 opacity-70">Fetching unified user accounts from database...</p>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={6} className="text-center p-5 text-danger">
                    <AlertTriangle size={32} className="mb-3" />
                    <p className="mb-0">Error loading database: {loadError}</p>
                  </td>
                </tr>
              ) : pageSlice.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-5 opacity-50">
                    <Database size={32} className="mb-3" />
                    <p className="mb-0">No candidate records found.</p>
                  </td>
                </tr>
              ) : (
                pageSlice.map((s) => {
                  const roleClass = ROLE_BADGE_CLASS[s.role || ""] || "bg-secondary";
                  const joinedDate = new Date(s.createdAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });
                  const stages = (s.clinicalStage || "").split(",").map((st) => st.trim()).filter(Boolean);

                  return (
                    <tr key={s._id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <Avatar name={s.name} src={s.profileImage} />
                          <div>
                            <strong style={{ color: "#fff", fontSize: "0.95rem" }}>{s.name}</strong>
                            <br />
                            <span className="small opacity-50">{s.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code>{s.phone || "N/A"}</code>
                      </td>
                      <td>
                        <span className={`badge ${roleClass} text-uppercase`} style={{ fontSize: "0.75rem" }}>
                          {s.role || "unknown"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>{joinedDate}</span>
                      </td>
                      <td>
                        {stages.length > 0 ? (
                          stages.map((st) => (
                            <span className="badge bg-dark border border-secondary text-light px-2 py-1 small me-1 mb-1" key={st}>
                              {STAGE_TITLES[st] || st}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted small">No Course Access</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button className="action-btn" title="View Profile" onClick={() => openStudentModal(s._id)}>
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-3 px-2 pb-2">
          <span className="text-muted small" style={{ fontWeight: 500 }}>
            {filteredUsers.length === 0
              ? "Showing 0 to 0 of 0 entries"
              : `Showing ${pageStart + 1} to ${Math.min(pageStart + ITEMS_PER_PAGE, filteredUsers.length)} of ${filteredUsers.length} entries`}
          </span>
          {totalPages > 1 && (
            <nav aria-label="Page navigation">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item${currentPage === 1 ? " disabled" : ""}`}>
                  <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); goToPage(currentPage - 1); }}>
                    &laquo; Prev
                  </a>
                </li>
                {pageNumbers.map((p, idx) =>
                  p === "ellipsis" ? (
                    <li className="page-item disabled" key={`ellipsis-${idx}`}>
                      <span className="page-link">...</span>
                    </li>
                  ) : (
                    <li className={`page-item${p === currentPage ? " active" : ""}`} key={p}>
                      <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); goToPage(p); }}>
                        {p}
                      </a>
                    </li>
                  )
                )}
                <li className={`page-item${currentPage === totalPages ? " disabled" : ""}`}>
                  <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); goToPage(currentPage + 1); }}>
                    Next &raquo;
                  </a>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {studentModalOpen && studentDetail && (
        <div className="admin-modal-overlay" style={{ display: "flex" }}>
          <div className="admin-modal" style={{ maxWidth: 1200, width: "95%", margin: "20px auto" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                <IdCard size={18} className="me-2" style={ICON_STYLE} /> Complete Trainee Profile
              </h3>
              <button type="button" className="btn-close btn-close-white" onClick={closeStudentModal}></button>
            </div>

            <div className="row">
              <div className="col-md-4 border-end border-secondary pe-4">
                <h5 className="text-warning mb-3" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Trainee Credentials
                </h5>

                <form id="editProfileForm" onSubmit={submitEditProfile}>
                  <div className="d-flex align-items-center gap-3 mb-4">
                    <Avatar name={editForm.name} src={studentDetail.profileImage} />
                    <div className="w-100">
                      <label className="admin-form-label mb-0" style={{ fontSize: "0.7rem" }}>
                        Name
                      </label>
                      <input
                        type="text"
                        className="admin-input py-1 px-2 mb-1"
                        style={{ fontSize: "0.95rem", fontWeight: 700 }}
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {editForm.modules.map((st) => (
                          <span className="badge" style={{ background: "rgba(224,194,20,0.15)", color: "var(--primary-gold)" }} key={st}>
                            {STAGE_TITLES[st] || st}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="admin-form-label">Email ID</label>
                    <input
                      type="email"
                      className="admin-input"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="admin-form-label">Phone Contact</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={editForm.phone}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="row mb-3">
                    <div className="col-6">
                      <label className="admin-form-label">Batch Info</label>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="e.g. B2405"
                        value={editForm.batch}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, batch: e.target.value }))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="admin-form-label">Chest No.</label>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="e.g. 12"
                        value={editForm.chestNo}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, chestNo: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="admin-form-label d-block mb-2">Assigned Course Modules</label>
                    <div
                      className="d-flex flex-column gap-2"
                      style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 8, padding: 12 }}
                    >
                      {MODULES.map((mod) => {
                        const checked = editForm.modules.includes(mod.value);
                        const disabled = mod.value === "full_course" ? othersSelected : fullSelected;
                        return (
                          <div className="form-check" key={mod.value}>
                            <input
                              className="form-check-input module-checkbox"
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleModule(mod.value)}
                              id={`mod_${mod.value}`}
                            />
                            <label className="form-check-label text-white small" htmlFor={`mod_${mod.value}`}>
                              {mod.label}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </form>
              </div>

              <div className="col-md-8 ps-4">
                <div className="row h-100">
                  <div className="col-md-7 border-end border-secondary pe-4 d-flex flex-column" style={{ minHeight: 480 }}>
                    <h5 className="text-warning mb-3" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Registered Courses &amp; Batches
                    </h5>
                    <div style={{ maxHeight: 180, overflowY: "auto", paddingRight: 5, marginBottom: 20 }}>
                      <div className="course-card-list">
                        {studentOrders.length === 0 ? (
                          <div className="text-center p-5 opacity-40">
                            <Receipt size={32} className="mb-2" />
                            <p className="small mb-0">No paid courses or batch slots found for this candidate</p>
                          </div>
                        ) : (
                          studentOrders.map((o) => {
                            const price = o.price || 0;
                            const date = new Date(o.createdAt).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            });
                            const slotTitle = o.slotId?.title || "Purchased Course Registration";
                            const batchNo = o.slotId?.batchNo ? `Batch #${o.slotId.batchNo}` : "Course Module";
                            return (
                              <div className="course-item-card" key={o._id}>
                                <div className="course-item-left">
                                  <h6>{slotTitle}</h6>
                                  <p>
                                    <code style={{ color: "var(--primary-gold)" }}>#{(o.orderId || o._id).substring(0, 10)}</code> &nbsp;|&nbsp; {batchNo}
                                  </p>
                                </div>
                                <div className="course-item-right">
                                  <div className="price">₹{price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                                  <div className="date">{date}</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-5 ps-4 d-flex flex-column justify-content-between" style={{ minHeight: 480 }}>
                    <div>
                      <h5 className="text-warning mb-3" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Allotted Evaluators
                      </h5>
                      <div className="assessor-badge-stack w-100 mb-4">
                        {renderAssessorBadge(studentDetail.assignedPsych, "Psychology")}
                        {renderAssessorBadge(studentDetail.assignedGTO, "Group Testing (GTO)")}
                        {renderAssessorBadge(studentDetail.assignedTO, "Technical (TO)")}
                        {renderAssessorBadge(studentDetail.assignedIO, "Interviewing (IO)")}
                      </div>
                    </div>
                    <div>
                      <button type="submit" form="editProfileForm" className="thm-btn py-2 w-100" disabled={savingProfile}>
                        <Save size={16} className="me-2" style={ICON_STYLE} /> {savingProfile ? "Saving..." : "Save Profile"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {addModalOpen && (
        <div
          className="admin-modal-overlay"
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", zIndex: 1050, overflowY: "auto", padding: "40px 10px" }}
        >
          <div className="admin-modal" style={{ maxWidth: 500, width: "95%", background: "var(--surface-dark)", border: "var(--border-gold)", borderRadius: "var(--radius-md)", padding: 25, color: "var(--text-white)", margin: "auto" }}>
            <div className="admin-modal-header d-flex justify-content-between align-items-center mb-4" style={{ borderBottom: "1px solid rgba(224,194,20,0.1)", paddingBottom: 15 }}>
              <h3 className="admin-modal-title" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--primary-gold)", margin: 0 }}>
                <UserPlus size={18} className="me-2" style={ICON_STYLE} /> Add New Candidate Trainee
              </h3>
              <button type="button" className="btn-close btn-close-white" onClick={closeAddModal}></button>
            </div>

            <form onSubmit={submitAddStudent}>
              <div className="mb-3">
                <label className="admin-form-label">Full Name</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. Rahul Sharma"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label className="admin-form-label">Email Address</label>
                <input
                  type="email"
                  className="admin-input"
                  placeholder="e.g. rahul@example.com"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label className="admin-form-label">Phone Number</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. 9876543210"
                  required
                  value={addForm.phone}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label className="admin-form-label">Account Password</label>
                <input
                  type="password"
                  className="admin-input"
                  placeholder="Set initial password..."
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div className="row mb-3">
                <div className="col-4">
                  <label className="admin-form-label">Batch No.</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. B2405"
                    value={addForm.batch}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, batch: e.target.value }))}
                  />
                </div>
                <div className="col-4">
                  <label className="admin-form-label">Chest No.</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. 12"
                    value={addForm.chestNo}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, chestNo: e.target.value }))}
                  />
                </div>
                <div className="col-4">
                  <label className="admin-form-label">Course</label>
                  <select
                    className="admin-input"
                    value={addForm.stage}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, stage: e.target.value }))}
                  >
                    <option value="full_course">Full 10-day SSB Hackathon</option>
                    <option value="ssb_ppdt">Intro to SSB & PPDT</option>
                    <option value="psych">Psychology Prep Program</option>
                    <option value="interview">Interview & Mock Course</option>
                    <option value="group_testing">GTO Course on VTX</option>
                  </select>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary">
                <button type="button" className="thm-btn cancel-btn py-2 px-4" onClick={closeAddModal}>
                  Cancel
                </button>
                <button type="submit" className="thm-btn py-2 px-4" disabled={addingStudent}>
                  <Plus size={14} className="me-1" style={ICON_STYLE} /> {addingStudent ? "Adding..." : "Add Candidate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
