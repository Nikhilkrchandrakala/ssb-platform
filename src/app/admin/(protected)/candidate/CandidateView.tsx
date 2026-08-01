"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  ImageIcon,
} from "lucide-react";
import "@/app/admin/styles/legacy-candidate.css";

const ICON_STYLE = { verticalAlign: -2 };

/**
 * REC Candidate Management.
 * Ported from admin-ssbwithisv/candidate.html + assets/js/candidate.js.
 *
 * Deviations from legacy, noted per the migration brief:
 *  - Legacy rendered this table via the jQuery DataTables plugin (loaded from
 *    a CDN script the shared admin layout does NOT include — only Bootstrap,
 *    Font Awesome, and SweetAlert2 are global here). Reimplemented the same
 *    search + page-length + pagination behavior with plain React state
 *    instead of pulling in a second table library for one page.
 *  - Legacy's Add/Edit modals were real Bootstrap `.modal` instances opened
 *    via `data-bs-toggle`/jQuery `.modal('show')`. Reimplemented as
 *    React-state-controlled `.admin-modal-overlay` overlays (same pattern
 *    used by the Student Roster / Allotment pages) so open/close state lives
 *    in React instead of being driven imperatively by Bootstrap's JS plugin.
 *  - Legacy colored the status badge with `status-paid` / `status-pending`
 *    classes, but neither class is defined anywhere in admin-global.css (or
 *    any other legacy stylesheet) — a real legacy bug where the badge
 *    silently rendered with no color/background at all. Fixed here by using
 *    `status-active` / `status-inactive`, which are the actually-defined
 *    status-badge variants and match the field's real values.
 *  - `editCandidate` fetches full candidate data from local state instead of
 *    re-fetching `GET /api/candidate/:id` (identical data, already in hand
 *    from the initial list load — avoids a redundant round trip).
 */

interface Candidate {
  _id: string;
  name: string;
  entry: string;
  board: string;
  status: string;
  img: string;
  createdAt: string;
}

interface CandidateFormState {
  name: string;
  entry: string;
  board: string;
  status: string;
}

const EMPTY_FORM: CandidateFormState = { name: "", entry: "", board: "", status: "active" };
const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function CandidateView() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [boardFilter, setBoardFilter] = useState("All");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<CandidateFormState>(EMPTY_FORM);
  const [addImageFile, setAddImageFile] = useState<File | null>(null);
  const [addImagePreview, setAddImagePreview] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CandidateFormState>(EMPTY_FORM);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadCandidates = () => {
    setLoading(true);
    fetch("/api/allCandidates")
      .then((res) => res.json())
      .then((result) => {
        const list: Candidate[] = Array.isArray(result) ? result : result?.data || [];
        setCandidates(list);
      })
      .catch((error) => {
        console.error("Load error:", error);
        window.Swal?.fire({ icon: "error", title: "Fetch Error", text: error.message, background: "#1a1a1a", color: "#fff" });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/allCandidates")
      .then((res) => res.json())
      .then((result) => {
        if (cancelled) return;
        const list: Candidate[] = Array.isArray(result) ? result : result?.data || [];
        setCandidates(list);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Load error:", error);
        window.Swal?.fire({ icon: "error", title: "Fetch Error", text: error.message, background: "#1a1a1a", color: "#fff" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const boardOptions = useMemo(() => {
    const boards = new Set(candidates.map((c) => c.board).filter(Boolean));
    return Array.from(boards).sort();
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return candidates.filter((c) => {
      const matchesBoard = boardFilter === "All" || c.board === boardFilter;
      const matchesSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.entry?.toLowerCase().includes(q) ||
        c.board?.toLowerCase().includes(q);
      return matchesBoard && matchesSearch;
    });
  }, [candidates, search, boardFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(currentPage, totalPages);
  const pageSlice = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleBoardFilterChange = (value: string) => {
    setBoardFilter(value);
    setCurrentPage(1);
  };

  const handlePreview = (file: File, setPreview: (url: string) => void) => {
    if (!file.type.startsWith("image/")) {
      window.Swal?.fire({ icon: "error", title: "Invalid File", text: "Please select an image (JPG/PNG)", background: "#1a1a1a", color: "#fff" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") setPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const openAdd = () => {
    setAddForm(EMPTY_FORM);
    setAddImageFile(null);
    setAddImagePreview(null);
    setIsAddOpen(true);
  };

  const closeAdd = () => {
    setIsAddOpen(false);
  };

  const openEdit = (candidate: Candidate) => {
    setEditId(candidate._id);
    setEditForm({
      name: candidate.name || "",
      entry: candidate.entry || "",
      board: candidate.board || "",
      status: candidate.status || "active",
    });
    setEditImageFile(null);
    setEditImagePreview(candidate.img || null);
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditId(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addImageFile) {
      window.Swal?.fire({ icon: "warning", text: "Please upload a candidate photo", background: "#1a1a1a", color: "#fff" });
      return;
    }

    const fd = new FormData();
    fd.append("name", addForm.name);
    fd.append("entry", addForm.entry);
    fd.append("board", addForm.board);
    fd.append("status", addForm.status);
    fd.append("img", addImageFile);

    setAddSubmitting(true);
    try {
      const response = await fetch("/api/addCandidate", { method: "POST", body: fd });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to add candidate");

      window.Swal?.fire({ icon: "success", title: "Added!", text: "Candidate has been created.", background: "#1a1a1a", color: "#fff" });
      closeAdd();
      loadCandidates();
    } catch (error) {
      window.Swal?.fire({ icon: "error", title: "Error", text: error instanceof Error ? error.message : "Failed to add candidate", background: "#1a1a1a", color: "#fff" });
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;

    const fd = new FormData();
    fd.append("name", editForm.name);
    fd.append("entry", editForm.entry);
    fd.append("board", editForm.board);
    fd.append("status", editForm.status);
    if (editImageFile) fd.append("img", editImageFile);

    setEditSubmitting(true);
    try {
      const response = await fetch(`/api/updateCandidate/${editId}`, { method: "PUT", body: fd });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to update candidate");

      window.Swal?.fire({ icon: "success", title: "Updated!", text: "Candidate details saved.", background: "#1a1a1a", color: "#fff" });
      closeEdit();
      loadCandidates();
    } catch (error) {
      window.Swal?.fire({ icon: "error", title: "Error", text: error instanceof Error ? error.message : "Failed to update candidate", background: "#1a1a1a", color: "#fff" });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    window.Swal?.fire({
      title: "Are you sure?",
      text: "This candidate record will be removed permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff6b6b",
      cancelButtonColor: "rgba(255,255,255,0.1)",
      confirmButtonText: "Yes, delete it!",
      background: "#1a1a1a",
      color: "#fff",
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        const response = await fetch(`/api/deleteCandidate/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Delete failed");
        window.Swal?.fire({ icon: "success", title: "Deleted", background: "#1a1a1a", color: "#fff" });
        loadCandidates();
      } catch (error) {
        window.Swal?.fire({ icon: "error", text: error instanceof Error ? error.message : "Delete failed", background: "#1a1a1a", color: "#fff" });
      }
    });
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <GraduationCap size={20} className="me-2" style={ICON_STYLE} /> REC Candidate Management
          </h1>
          <p className="text-muted mb-0">Manage successful candidates, their records, and display status</p>
        </div>
        <button className="thm-btn" onClick={openAdd}>
          <PlusCircle size={16} style={ICON_STYLE} /> Add New Candidate
        </button>
      </div>

      <div className="admin-card">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Show</span>
            <select
              className="admin-input"
              style={{ width: 80, padding: "6px 10px" }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-muted small">per page</span>
          </div>
          <select
            className="admin-input form-select"
            style={{ maxWidth: 220 }}
            value={boardFilter}
            onChange={(e) => handleBoardFilterChange(e.target.value)}
          >
            <option value="All">All Boards</option>
            {boardOptions.map((board) => (
              <option value={board} key={board}>
                {board}
              </option>
            ))}
          </select>
          <div style={{ position: "relative", maxWidth: 320, width: "100%" }}>
            <Search size={16} style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="admin-input"
              placeholder="Search candidates..."
              style={{ paddingLeft: 45, borderRadius: 20 }}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table" id="candidatesTable">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Entry No</th>
                <th>Board</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center p-5">
                    <div className="spinner-border text-warning" role="status"></div>
                  </td>
                </tr>
              ) : pageSlice.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-5 opacity-50">
                    No candidates found
                  </td>
                </tr>
              ) : (
                pageSlice.map((candidate) => {
                  return (
                    <tr key={candidate._id}>
                      <td>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={candidate.img}
                          alt={candidate.name}
                          className="candidate-img-circle"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://via.placeholder.com/50?text=User";
                          }}
                        />
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "var(--primary-gold)" }}>{candidate.name}</span>
                        {candidate.status !== "active" && (
                          <span className="status-badge status-inactive ms-2" title="Not shown on the public Hall of Fame page">
                            Hidden
                          </span>
                        )}
                      </td>
                      <td>
                        <code style={{ color: "var(--text-white)", opacity: 0.8 }}>{candidate.entry}</code>
                      </td>
                      <td>{candidate.board}</td>
                      <td>
                        <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>{formatDate(candidate.createdAt)}</span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button className="action-btn edit-btn" onClick={() => openEdit(candidate)} title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button className="action-btn delete-btn" onClick={() => handleDelete(candidate._id)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="d-flex justify-content-between align-items-center mt-3 px-2 pb-2">
            <span className="text-muted small">
              Showing {(pageSafe - 1) * pageSize + 1} to {Math.min(pageSafe * pageSize, filtered.length)} of {filtered.length} entries
            </span>
            <nav aria-label="Page navigation">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${pageSafe === 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft size={14} />
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === pageSafe ? "active" : ""}`}>
                    <button className="page-link" onClick={() => setCurrentPage(p)}>
                      {p}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${pageSafe === totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                    <ChevronRight size={14} />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Add Candidate Modal */}
      {isAddOpen && (
        <div className="admin-modal-overlay" style={{ display: "flex" }}>
          <div className="admin-modal" style={{ maxWidth: 700, width: "95%", margin: "20px auto" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                <PlusCircle size={18} className="me-2" style={ICON_STYLE} /> Add New Candidate
              </h3>
              <button type="button" className="btn-close btn-close-white" onClick={closeAdd}></button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="admin-form-label">Full Name *</label>
                    <input
                      type="text"
                      className="admin-input"
                      required
                      placeholder="Enter candidate name"
                      value={addForm.name}
                      onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="admin-form-label">Entry Number *</label>
                    <input
                      type="text"
                      className="admin-input"
                      required
                      placeholder="e.g. SSB-2024-001"
                      value={addForm.entry}
                      onChange={(e) => setAddForm((f) => ({ ...f, entry: e.target.value }))}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="admin-form-label">SSB Board *</label>
                    <input
                      type="text"
                      className="admin-input"
                      required
                      placeholder="e.g. 1 AFSB Varanasi"
                      value={addForm.board}
                      onChange={(e) => setAddForm((f) => ({ ...f, board: e.target.value }))}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="admin-form-label">Show on Public Hall of Fame Page?</label>
                    <select
                      className="admin-input"
                      value={addForm.status}
                      onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))}
                    >
                      <option value="active">Yes, show it (Active)</option>
                      <option value="inactive">No, keep it hidden (Inactive)</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="admin-form-label">Candidate Photo *</label>
                  <label className="upload-zone" style={{ display: "block" }}>
                    <div className="upload-icon">
                      <UploadCloud size={28} />
                    </div>
                    <div className="upload-text">Click or Drag to Upload Photo</div>
                    <div className="text-muted small">JPG, PNG (Max 5MB)</div>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAddImageFile(file);
                          handlePreview(file, setAddImagePreview);
                        }
                      }}
                    />
                  </label>
                  <div className="text-center">
                    {addImagePreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={addImagePreview} alt="Preview" className="preview-img" style={{ display: "inline-block" }} />
                    )}
                  </div>
                </div>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary">
                <button
                  type="button"
                  className="thm-btn"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                  onClick={closeAdd}
                >
                  Cancel
                </button>
                <button type="submit" className="thm-btn" disabled={addSubmitting}>
                  {addSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span> Creating...
                    </>
                  ) : (
                    "Create Candidate"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Candidate Modal */}
      {isEditOpen && (
        <div className="admin-modal-overlay" style={{ display: "flex" }}>
          <div className="admin-modal" style={{ maxWidth: 700, width: "95%", margin: "20px auto" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                <Pencil size={18} className="me-2" style={ICON_STYLE} /> Edit Candidate
              </h3>
              <button type="button" className="btn-close btn-close-white" onClick={closeEdit}></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="admin-form-label">Full Name *</label>
                    <input
                      type="text"
                      className="admin-input"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="admin-form-label">Entry Number *</label>
                    <input
                      type="text"
                      className="admin-input"
                      required
                      value={editForm.entry}
                      onChange={(e) => setEditForm((f) => ({ ...f, entry: e.target.value }))}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="admin-form-label">SSB Board *</label>
                    <input
                      type="text"
                      className="admin-input"
                      required
                      value={editForm.board}
                      onChange={(e) => setEditForm((f) => ({ ...f, board: e.target.value }))}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="admin-form-label">Show on Public Hall of Fame Page?</label>
                    <select
                      className="admin-input"
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                    >
                      <option value="active">Yes, show it (Active)</option>
                      <option value="inactive">No, keep it hidden (Inactive)</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="admin-form-label">Change Candidate Photo</label>
                  <label className="upload-zone" style={{ display: "block" }}>
                    <div className="upload-icon">
                      <ImageIcon size={28} />
                    </div>
                    <div className="upload-text">Click to change photo</div>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditImageFile(file);
                          handlePreview(file, setEditImagePreview);
                        }
                      }}
                    />
                  </label>
                  <div className="text-center">
                    {editImagePreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editImagePreview} alt="Preview" className="preview-img" style={{ display: "inline-block" }} />
                    )}
                  </div>
                </div>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary">
                <button
                  type="button"
                  className="thm-btn"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                  onClick={closeEdit}
                >
                  Cancel
                </button>
                <button type="submit" className="thm-btn" disabled={editSubmitting}>
                  {editSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span> Updating...
                    </>
                  ) : (
                    "Update Candidate"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
