"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "@/app/admin/styles/legacy-allotment.css";

/**
 * Assessor Allotment & Management.
 * Ported from admin-ssbwithisv/Allotment.html + assets/js/allotment.js.
 *
 * Legacy bugs found while porting (flagged, not silently changed):
 *  - The pagination controls (`.pagination-btn` / `.pagination-ellipsis`)
 *    rendered by allotment.js reference CSS classes that are defined
 *    NOWHERE in any legacy stylesheet — genuinely unstyled default browser
 *    buttons in production. Fixed here by rendering the same styled
 *    Bootstrap `.pagination`/`.page-link` component the Student Roster page
 *    uses (see legacy-allotment.css for the ported page-link overrides).
 *  - `populateAssessorDropdowns()` computed a `loadClass` (`load-low` /
 *    `load-med` / `load-high`, backed by real `.load-indicator` CSS in the
 *    page's inline `<style>`) per assessor but never actually applied it to
 *    anything — `<option>` elements can't hold a `<span>` anyway, so the
 *    load-color feature was dead code start to finish. Ported the dropdown
 *    options as they actually rendered: plain "Name (N active)" text, no
 *    color coding.
 */

interface AssessorRef {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Assessor extends AssessorRef {
  assessorType?: string;
  activeLoad?: number;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  batch?: string;
  chestNo?: string;
  clinicalStage?: string;
  profileImage?: string;
  assignedGTO?: AssessorRef | null;
  assignedTO?: AssessorRef | null;
  assignedPsych?: AssessorRef | null;
  assignedIO?: AssessorRef | null;
  assignedAssessments?: string[];
}

interface AssessmentItem {
  _id: string;
  title: string;
  type: string;
  duration?: number;
}

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;

const STAGE_TITLES: Record<string, string> = {
  full_course: "Full Course",
  ssb_ppdt: "Intro & PPDT",
  psych: "Psychology",
  interview: "Interview",
  group_testing: "GTO Tasks",
};

const STAGE_CLASS: Record<string, string> = {
  full_course: "stage-full_course",
  ssb_ppdt: "stage-ssb_ppdt",
  psych: "stage-psych",
  interview: "stage-interview",
  group_testing: "stage-group_testing",
};

function getInitials(name?: string) {
  if (!name) return "ST";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function stagesOf(clinicalStage?: string) {
  return (clinicalStage || "full_course")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildParams(page: number, searchVal: string, stageVal: string, batchVal: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (searchVal.trim()) params.set("search", searchVal.trim());
  if (stageVal !== "all") params.set("clinicalStage", stageVal);
  if (batchVal !== "all") params.set("batch", batchVal);
  return params;
}

export default function AllotmentView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [assessors, setAssessors] = useState<Assessor[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [batches, setBatches] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [brokenAvatars, setBrokenAvatars] = useState<Set<string>>(new Set());

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStudent, setModalStudent] = useState<Student | null>(null);
  const [selectPsych, setSelectPsych] = useState("");
  const [selectGTO, setSelectGTO] = useState("");
  const [selectTO, setSelectTO] = useState("");
  const [selectIO, setSelectIO] = useState("");
  const [assignedAssessmentIds, setAssignedAssessmentIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = (page: number, searchVal: string, stageVal: string, batchVal: string) => {
    setLoading(true);
    setLoadError(null);
    const params = buildParams(page, searchVal, stageVal, batchVal);
    Promise.all([fetch(`/api/admin/allotment-students?${params.toString()}`), fetch("/api/admin/assessors")])
      .then(async ([studentsRes, assessorsRes]) => {
        if (!studentsRes.ok || !assessorsRes.ok) throw new Error("Failed to load records from server");
        const studentsData = await studentsRes.json();
        const assessorsData = await assessorsRes.json();
        setStudents(studentsData.students || []);
        setAssessors(assessorsData.assessors || []);
        setTotalCount(studentsData.totalCount || 0);
        setTotalPages(studentsData.totalPages || 1);
        setCurrentPage(studentsData.page || 1);
        setBatches(studentsData.batches || []);
      })
      .catch((error) => {
        console.error("Load Data Error:", error);
        setLoadError(error instanceof Error ? error.message : "Error loading data");
      })
      .finally(() => setLoading(false));
  };

  // Initial mount load: assessments, then paginated students + assessors.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/assessments")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return null;
        if (data?.assessments) setAssessments(data.assessments);
        const params = buildParams(1, "", "all", "all");
        return Promise.all([fetch(`/api/admin/allotment-students?${params.toString()}`), fetch("/api/admin/assessors")]);
      })
      .then(async (results) => {
        if (cancelled || !results) return;
        const [studentsRes, assessorsRes] = results;
        if (!studentsRes.ok || !assessorsRes.ok) throw new Error("Failed to load records from server");
        const studentsData = await studentsRes.json();
        const assessorsData = await assessorsRes.json();
        if (cancelled) return;
        setStudents(studentsData.students || []);
        setAssessors(assessorsData.assessors || []);
        setTotalCount(studentsData.totalCount || 0);
        setTotalPages(studentsData.totalPages || 1);
        setCurrentPage(studentsData.page || 1);
        setBatches(studentsData.batches || []);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Load Data Error:", error);
        setLoadError(error instanceof Error ? error.message : "Error loading data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      loadData(1, value, stageFilter, batchFilter);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleStageFilterChange = (value: string) => {
    setStageFilter(value);
    loadData(1, search, value, batchFilter);
  };

  const handleBatchFilterChange = (value: string) => {
    setBatchFilter(value);
    loadData(1, search, stageFilter, value);
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    loadData(page, search, stageFilter, batchFilter);
  };

  // Dashboard-level allotment stats (page-level, mirroring legacy — the
  // "Fully Allotted"/"Pending" counters only reflect the current page's 25
  // rows, while "Enrolled Candidates" reflects the true server-side total).
  const pageAllottedCount = useMemo(
    () => students.filter((s) => s.assignedPsych && s.assignedGTO && s.assignedTO && s.assignedIO).length,
    [students]
  );

  const renderAvatar = (id: string, profileImage: string | undefined, name: string) => {
    const initials = getInitials(name);
    if (profileImage && !brokenAvatars.has(id)) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profileImage} alt={name} className="avatar-circle" onError={() => setBrokenAvatars((prev) => new Set(prev).add(id))} />
      );
    }
    return <div className="avatar-circle">{initials}</div>;
  };

  const renderAssessorCell = (assessor: AssessorRef | null | undefined) => {
    if (assessor) return <span className="assessor-pill">{assessor.name}</span>;
    return <span className="assessor-pill not-allotted">Unassigned</span>;
  };

  const openAllotmentModal = (student: Student) => {
    setModalStudent(student);
    const stages = stagesOf(student.clinicalStage);
    const gtoAllowed = stages.includes("full_course") || stages.includes("group_testing");
    const ioAllowed = stages.includes("full_course") || stages.includes("interview");
    const psychOrToAllowed = stages.includes("full_course") || stages.includes("psych");

    setSelectPsych(psychOrToAllowed ? student.assignedPsych?._id || "" : "");
    setSelectGTO(gtoAllowed ? student.assignedGTO?._id || "" : "");
    setSelectTO(psychOrToAllowed ? student.assignedTO?._id || "" : "");
    setSelectIO(ioAllowed ? student.assignedIO?._id || "" : "");
    setAssignedAssessmentIds((student.assignedAssessments || []).map((id) => id.toString()));
    setIsModalOpen(true);
  };

  const closeAllotmentModal = () => {
    setIsModalOpen(false);
    setModalStudent(null);
  };

  const stages = modalStudent ? stagesOf(modalStudent.clinicalStage) : [];
  const gtoAllowed = stages.includes("full_course") || stages.includes("group_testing");
  const ioAllowed = stages.includes("full_course") || stages.includes("interview");
  const psychOrToAllowed = stages.includes("full_course") || stages.includes("psych");
  const isGtoOnly = stages.includes("group_testing") && !stages.includes("full_course") && !stages.includes("psych");
  const isIoOnly = stages.includes("interview") && !stages.includes("full_course") && !stages.includes("psych");
  const showAssessmentsSection = !(isGtoOnly || isIoOnly);

  const handlePsychChange = (value: string) => {
    setSelectPsych(value);
    if (value && selectTO) {
      window.Swal?.fire({
        icon: "warning",
        title: "Mutually Exclusive",
        text: "A candidate cannot have both a Psych Assessor and a Technical Assessor. Clearing the other selection.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
      setSelectTO("");
    }
  };

  const handleToChange = (value: string) => {
    setSelectTO(value);
    if (value && selectPsych) {
      window.Swal?.fire({
        icon: "warning",
        title: "Mutually Exclusive",
        text: "A candidate cannot have both a Psych Assessor and a Technical Assessor. Clearing the other selection.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
      setSelectPsych("");
    }
  };

  const toggleAssessment = (id: string) => {
    setAssignedAssessmentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAllotmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalStudent || submitting) return;

    if (!isGtoOnly && !isIoOnly && assignedAssessmentIds.length === 0 && assessments.length > 0) {
      window.Swal?.fire({
        icon: "error",
        title: "Assessment Required",
        text: "A student MUST be allotted at least one Assessment.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
      return;
    }
    if (selectGTO && !gtoAllowed) {
      window.Swal?.fire({
        icon: "error",
        title: "Invalid Allotment",
        text: "A GTO Assessor cannot be allotted for this student's course.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
      return;
    }
    if (selectIO && !ioAllowed) {
      window.Swal?.fire({
        icon: "error",
        title: "Invalid Allotment",
        text: "An IO Assessor cannot be allotted for this student's course.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
      return;
    }
    if ((selectPsych || selectTO) && !psychOrToAllowed) {
      window.Swal?.fire({
        icon: "error",
        title: "Invalid Allotment",
        text: "A Psych or TO Assessor cannot be allotted for this student's course.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
      return;
    }
    if (selectPsych && selectTO) {
      window.Swal?.fire({
        icon: "error",
        title: "Invalid Allotment",
        text: "A candidate cannot be assigned to both a Psych Assessor and a Technical Assessor simultaneously. Please choose one.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
      return;
    }

    window.Swal?.fire({
      title: "Saving Allotments...",
      text: "Updating assessor schedules.",
      allowOutsideClick: false,
      background: "#1a1a1a",
      color: "#fff",
      didOpen: () => window.Swal?.showLoading(),
    });

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/allotment/${modalStudent._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedPsych: selectPsych || null,
          assignedGTO: selectGTO || null,
          assignedTO: selectTO || null,
          assignedIO: selectIO || null,
          assignedAssessments: assignedAssessmentIds,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update allotment schedules");

      window.Swal?.fire({
        icon: "success",
        title: "Allotted!",
        text: result.message || "Assessors have been assigned to candidate successfully.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });

      closeAllotmentModal();
      loadData(currentPage, search, stageFilter, batchFilter);
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Allotment Sync Failed",
        text: error instanceof Error ? error.message : "Failed to update allotment schedules",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const psychOptions = assessors.filter((a) => a.assessorType === "Psych");
  const gtoOptions = assessors.filter((a) => a.assessorType === "GTO");
  const toOptions = assessors.filter((a) => a.assessorType === "TO");
  const ioOptions = assessors.filter((a) => a.assessorType === "IO");

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <i className="fas fa-tasks me-2"></i> Assessor Allotment & Management
          </h1>
          <p className="text-muted mb-0">Allot specific GTO, TO, Psych, or IO assessors to active training candidates</p>
        </div>
      </div>

      <div className="summary-card-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-user-graduate"></i>
          </div>
          <div className="stat-info">
            <h3>{totalCount || "—"}</h3>
            <p>Enrolled Candidates</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon icon-allotted">
            <i className="fas fa-clipboard-check"></i>
          </div>
          <div className="stat-info">
            <h3>{pageAllottedCount}</h3>
            <p>Fully Allotted</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon icon-unallotted">
            <i className="fas fa-user-clock"></i>
          </div>
          <div className="stat-info">
            <h3>{students.length - pageAllottedCount}</h3>
            <p>Allotment Pending</p>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div style={{ position: "relative", maxWidth: 400, width: "100%" }}>
            <i className="fas fa-search" style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}></i>
            <input
              type="text"
              className="admin-input"
              placeholder="Search candidate name or contact..."
              style={{ paddingLeft: 45 }}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="d-flex gap-3 align-items-center flex-wrap">
            <div className="d-flex gap-2 align-items-center">
              <span className="text-muted small">BATCH FILTER:</span>
              <select className="admin-input" style={{ width: 160, padding: "8px 15px" }} value={batchFilter} onChange={(e) => handleBatchFilterChange(e.target.value)}>
                <option value="all">All Batches</option>
                {batches.map((b) => (
                  <option key={b} value={b}>
                    Batch {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <span className="text-muted small">COURSE FILTER:</span>
              <select className="admin-input" style={{ width: 220, padding: "8px 15px" }} value={stageFilter} onChange={(e) => handleStageFilterChange(e.target.value)}>
                <option value="all">All Courses</option>
                <option value="full_course">Full 10-day SSB Hackathon</option>
                <option value="ssb_ppdt">Intro to SSB & PPDT</option>
                <option value="psych">Psychology Prep Program</option>
                <option value="interview">Interview & Mock Course</option>
                <option value="group_testing">GTO Course on VTX</option>
              </select>
            </div>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table" id="allotmentTable" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Batch</th>
                <th>Chest</th>
                <th>Course</th>
                <th>Psych</th>
                <th>GTO</th>
                <th>TO</th>
                <th>IO</th>
                <th style={{ width: 80, textAlign: "center", borderLeft: "1px solid var(--border-color)" }}>Allot</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center p-5">
                    <div className="spinner-border text-warning" role="status"></div>
                    <p className="mt-3 mb-0 opacity-70">Fetching active assessor allotment profiles...</p>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={9} className="text-center p-5 text-danger">
                    <i className="fas fa-exclamation-triangle fa-2x mb-3"></i>
                    <p className="mb-0">Error loading data: {loadError}</p>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center p-5 opacity-50">
                    <i className="fas fa-user-clock fa-2x mb-3"></i>
                    <p className="mb-0">No enrolled candidates found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                students.map((s) => {
                  const rowStages = stagesOf(s.clinicalStage);
                  return (
                    <tr key={s._id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          {renderAvatar(s._id, s.profileImage, s.name)}
                          <div>
                            <strong style={{ color: "#fff", fontSize: "0.95rem" }}>{s.name}</strong>
                            <br />
                            <span className="small opacity-50">{s.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-dark border border-secondary text-light px-2 py-1 small" style={{ fontFamily: "monospace" }}>
                          {s.batch || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-warning border border-warning text-dark px-2 py-1 small" style={{ fontFamily: "monospace", fontWeight: 700 }}>
                          {s.chestNo || "—"}
                        </span>
                      </td>
                      <td>
                        {rowStages.map((st) => (
                          <span key={st} className={`stage-badge ${STAGE_CLASS[st] || "stage-full_course"}`} style={{ marginRight: 4, marginBottom: 4, display: "inline-block" }}>
                            {STAGE_TITLES[st] || st}
                          </span>
                        ))}
                      </td>
                      <td>{renderAssessorCell(s.assignedPsych)}</td>
                      <td>{renderAssessorCell(s.assignedGTO)}</td>
                      <td>{renderAssessorCell(s.assignedTO)}</td>
                      <td>{renderAssessorCell(s.assignedIO)}</td>
                      <td style={{ textAlign: "center", borderLeft: "1px solid var(--border-color)" }}>
                        <button className="action-btn" title="Allot Assessors" onClick={() => openAllotmentModal(s)}>
                          <i className="fas fa-clipboard-list"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div
          id="allotmentPagination"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            background: "var(--surface-dark)",
            border: "var(--border-gold)",
            borderTop: "none",
            borderRadius: "0 0 var(--radius-md) var(--radius-md)",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Showing <strong>{startItem}–{endItem}</strong> of <strong>{totalCount}</strong> enrolled candidates
          </div>
          {totalPages > 1 && (
            <nav aria-label="Page navigation">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => goToPage(currentPage - 1)}>
                    <i className="fas fa-chevron-left"></i> Prev
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === currentPage ? "active" : ""}`}>
                    <button className="page-link" onClick={() => goToPage(p)}>
                      {p}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => goToPage(currentPage + 1)}>
                    Next <i className="fas fa-chevron-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {/* Allotment Editing Modal */}
      {isModalOpen && modalStudent && (
        <div className="admin-modal-overlay" style={{ display: "flex" }}>
          <div className="admin-modal" style={{ maxWidth: 900, width: "95%", margin: "20px auto" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                <i className="fas fa-user-edit me-2"></i> Configure Assessor Allotment
              </h3>
              <button type="button" className="btn-close btn-close-white" onClick={closeAllotmentModal}></button>
            </div>
            <form onSubmit={handleAllotmentSubmit}>
              <div className="row">
                {/* Left Column: Student Detail Summary */}
                <div className="col-md-5 border-end border-secondary pe-4">
                  <h5 className="text-warning mb-3" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Candidate Info
                  </h5>

                  <div className="d-flex align-items-center gap-3 mb-4">
                    {renderAvatar(modalStudent._id, modalStudent.profileImage, modalStudent.name)}
                    <div>
                      <h4 className="mb-1" style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                        {modalStudent.name}
                      </h4>
                      <div>
                        {stages.map((st) => (
                          <span key={st} className={`badge stage-badge ${STAGE_CLASS[st] || "stage-full_course"} me-1`}>
                            {STAGE_TITLES[st] || st}
                          </span>
                        ))}
                        <span className="badge bg-dark border border-secondary text-light ms-1" style={{ fontFamily: "monospace" }}>
                          {modalStudent.batch || "—"}
                        </span>
                        {modalStudent.chestNo && (
                          <span className="badge bg-warning border border-warning text-dark ms-1" style={{ fontFamily: "monospace", fontWeight: 700 }}>
                            Chest {modalStudent.chestNo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="admin-form-label">Email Address</label>
                    <input
                      type="text"
                      className="admin-input"
                      readOnly
                      style={{ background: "rgba(255,255,255,0.03)", borderColor: "#444", opacity: 0.7 }}
                      value={modalStudent.email}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="admin-form-label">Phone Number</label>
                    <input
                      type="text"
                      className="admin-input"
                      readOnly
                      style={{ background: "rgba(255,255,255,0.03)", borderColor: "#444", opacity: 0.7 }}
                      value={modalStudent.phone || "N/A"}
                    />
                  </div>

                  <div style={{ background: "rgba(224, 194, 20, 0.04)", border: "var(--border-gold)", padding: 15, borderRadius: 8 }} className="mt-4">
                    <p className="small text-warning mb-0">
                      <i className="fas fa-info-circle"></i> Assessor slots will dynamically filter candidates to the corresponding officer subclass.
                      Workloads are recalculated live in real-time to avoid schedule clashes.
                    </p>
                  </div>
                </div>

                {/* Right Column: Select Dropdowns */}
                <div className="col-md-7 ps-4 d-flex flex-column justify-content-between">
                  <div>
                    <h5 className="text-warning mb-3" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Assessor Assignments
                    </h5>

                    <div className="admin-form-group">
                      <label className="admin-form-label">
                        <i className="fas fa-brain me-1"></i> Psychology Assessor (Psych)
                      </label>
                      <select className="admin-input" disabled={!psychOrToAllowed} value={selectPsych} onChange={(e) => handlePsychChange(e.target.value)}>
                        <option value="">{psychOrToAllowed ? "-- Select Psych Assessor --" : "-- Not Allowed by Course --"}</option>
                        {psychOptions.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.name} ({a.activeLoad || 0} active)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="admin-form-group">
                      <label className="admin-form-label">
                        <i className="fas fa-users-cog me-1"></i> Group Testing Assessor (GTO)
                      </label>
                      <select className="admin-input" disabled={!gtoAllowed} value={selectGTO} onChange={(e) => setSelectGTO(e.target.value)}>
                        <option value="">{gtoAllowed ? "-- Select GTO Assessor --" : "-- Not Allowed by Course --"}</option>
                        {gtoOptions.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.name} ({a.activeLoad || 0} active)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="admin-form-group">
                      <label className="admin-form-label">
                        <i className="fas fa-cogs me-1"></i> Technical Assessor (TO)
                      </label>
                      <select className="admin-input" disabled={!psychOrToAllowed} value={selectTO} onChange={(e) => handleToChange(e.target.value)}>
                        <option value="">{psychOrToAllowed ? "-- Select TO Assessor --" : "-- Not Allowed by Course --"}</option>
                        {toOptions.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.name} ({a.activeLoad || 0} active)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="admin-form-group">
                      <label className="admin-form-label">
                        <i className="fas fa-user-tie me-1"></i> Interviewing Officer (IO)
                      </label>
                      <select className="admin-input" disabled={!ioAllowed} value={selectIO} onChange={(e) => setSelectIO(e.target.value)}>
                        <option value="">{ioAllowed ? "-- Select IO Assessor --" : "-- Not Allowed by Course --"}</option>
                        {ioOptions.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.name} ({a.activeLoad || 0} active)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {showAssessmentsSection && (
                    <div id="psychAssessmentsSection">
                      <h5 className="text-warning mb-2 mt-4" style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Allocated Psych Assessments
                      </h5>
                      <div style={{ flexGrow: 1, maxHeight: 150, overflowY: "auto", paddingRight: 5, marginBottom: 10 }}>
                        <div
                          style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 8, padding: 12 }}
                          className="d-flex flex-column gap-2"
                        >
                          {assessments.length === 0 ? (
                            <div className="text-center p-3 opacity-40">
                              <p className="small mb-0">No active assessments found in system</p>
                            </div>
                          ) : (
                            assessments.map((a) => (
                              <div className="form-check" key={a._id}>
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`assess_${a._id}`}
                                  checked={assignedAssessmentIds.includes(a._id)}
                                  onChange={() => toggleAssessment(a._id)}
                                />
                                <label className="form-check-label text-white small" htmlFor={`assess_${a._id}`}>
                                  {a.title} <span className="opacity-50">({a.type} | {a.duration || 0}m)</span>
                                </label>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary">
                    <button type="button" className="thm-btn secondary" style={{ padding: "8px 25px" }} onClick={closeAllotmentModal}>
                      Cancel
                    </button>
                    <button type="submit" className="thm-btn" style={{ padding: "8px 25px" }} disabled={submitting}>
                      <i className="fas fa-save me-1"></i> {submitting ? "Saving..." : "Save Allotments"}
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
