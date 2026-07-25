"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import "@/app/admin/styles/legacy-leads.css";
import "@/app/admin/styles/legacy-leads-page.css";

/**
 * Ported from admin-ssbwithisv/leads.html + assets/js/leads.js.
 * Legacy called /api/allLeads/leads/:id with no auth at all (the endpoint has
 * since been locked to admin/owner in Phase 2); the httpOnly session cookie
 * attaches automatically to same-origin fetch calls here.
 *
 * Legacy bug fixed during this port: leads.js fully implemented handleDelete()
 * and handleElevate() (plus matching .action-btn.elevate-btn / .actions-cell
 * CSS hooks), but leads.html's table only ever rendered 6 plain columns —
 * no Actions column, no buttons — so those functions were unreachable dead
 * code in production. An Actions column with working Delete/Elevate buttons
 * has been added here to actually wire up that existing logic.
 */

interface LeadItem {
  _id: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  date: string;
  time?: string;
  isRegisteredLead?: boolean;
  // Sales module (salesimplementation.md Phase 6, stretch) — set by
  // enrollStudent when this lead's email matches a new sales enrollment.
  convertedAt?: string | null;
}

declare global {
  interface Window {
    XLSX?: {
      utils: {
        book_new: () => unknown;
        json_to_sheet: (data: Record<string, string>[]) => unknown;
        book_append_sheet: (wb: unknown, ws: unknown, name: string) => void;
      };
      writeFile: (wb: unknown, filename: string) => void;
    };
  }
}

function escapeText(str: string | undefined | null): string {
  return str || "";
}

function getPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export default function LeadsView() {
  const [allLeads, setAllLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [fromDateInput, setFromDateInput] = useState("");
  const [toDateInput, setToDateInput] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Initial load — inline .then() chain (no delegated async function) so the
  // mount effect doesn't trip react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/allLeads")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data: LeadItem[]) => {
        if (cancelled) return;
        const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllLeads(sorted);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load leads");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dateFiltered = useMemo(() => {
    if (!appliedFrom && !appliedTo) return allLeads;
    return allLeads.filter((lead) => {
      const leadYMD = new Date(lead.date).toISOString().split("T")[0];
      if (appliedFrom && appliedTo) return leadYMD >= appliedFrom && leadYMD <= appliedTo;
      if (appliedFrom) return leadYMD >= appliedFrom;
      if (appliedTo) return leadYMD <= appliedTo;
      return true;
    });
  }, [allLeads, appliedFrom, appliedTo]);

  const searchFiltered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return dateFiltered;
    return dateFiltered.filter((lead) => {
      const name = (lead.name || "").toLowerCase();
      const email = (lead.email || "").toLowerCase();
      const phone = (lead.phoneNumber || "").toLowerCase();
      return name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [dateFiltered, search]);

  const totalPages = Math.max(1, Math.ceil(searchFiltered.length / perPage));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIdx = (safePage - 1) * perPage;
  const endIdx = Math.min(startIdx + perPage, searchFiltered.length);
  const pageLeads = searchFiltered.slice(startIdx, endIdx);

  const infoMsg = useMemo(() => {
    const parts: string[] = [];
    if (appliedFrom || appliedTo) {
      let rangeText = "";
      if (appliedFrom && appliedTo) rangeText = `${appliedFrom} to ${appliedTo}`;
      else if (appliedFrom) rangeText = `from ${appliedFrom}`;
      else rangeText = `until ${appliedTo}`;
      parts.push(`filtered by date (${rangeText})`);
    }
    if (search.trim()) parts.push(`searching "${search.trim()}"`);

    if (parts.length > 0) {
      return `${searchFiltered.length} leads — ${parts.join(", ")}`;
    }
    return `Total: ${allLeads.length} leads`;
  }, [appliedFrom, appliedTo, search, searchFiltered.length, allLeads.length]);

  function applyFilters() {
    setAppliedFrom(fromDateInput);
    setAppliedTo(toDateInput);
    setCurrentPage(1);
    window.Swal?.fire({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
      background: "#1a1a1a",
      color: "#fff",
      icon: "info",
      title: "Filter applied",
    });
  }

  function clearFilters() {
    setFromDateInput("");
    setToDateInput("");
    setAppliedFrom("");
    setAppliedTo("");
    setSearch("");
    setCurrentPage(1);
  }

  async function handleDelete(leadId: string, leadName?: string) {
    const result = await window.Swal?.fire({
      title: "Delete Lead?",
      html: `Are you sure you want to permanently delete <strong>${escapeText(leadName) || "this lead"}</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff6b6b",
      cancelButtonColor: "#555",
      confirmButtonText: '<i class="fas fa-trash-alt me-1"></i> Yes, Delete',
      cancelButtonText: "Cancel",
      background: "#1a1a1a",
      color: "#fff",
    });
    if (!result?.isConfirmed) return;

    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      setAllLeads((prev) => prev.filter((l) => l._id !== leadId));
      window.Swal?.fire({
        icon: "success",
        title: "Deleted",
        text: data.message || "Lead removed successfully.",
        background: "#1a1a1a",
        color: "#fff",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Delete Failed",
        text: err instanceof Error ? err.message : "Failed to delete",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  }

  async function handleElevate(leadId: string, leadName?: string, leadEmail?: string) {
    const result = await window.Swal?.fire({
      title: "Elevate to Candidate?",
      html: `
        <p>This will create a registered user account for:</p>
        <div style="background: rgba(46, 204, 113, 0.08); border: 1px solid rgba(46, 204, 113, 0.2); border-radius: 8px; padding: 12px; margin: 10px 0; text-align: left;">
            <strong style="color: #2ecc71;">${escapeText(leadName) || "—"}</strong><br>
            <small style="opacity: 0.7;">${escapeText(leadEmail) || "—"}</small>
        </div>
        <p style="font-size: 0.85rem; opacity: 0.7;">The user will be assigned a temporary password (<code>password123</code>) and can reset it via Forgot Password.</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2ecc71",
      cancelButtonColor: "#555",
      confirmButtonText: '<i class="fas fa-user-plus me-1"></i> Yes, Elevate',
      cancelButtonText: "Cancel",
      background: "#1a1a1a",
      color: "#fff",
    });
    if (!result?.isConfirmed) return;

    try {
      const res = await fetch(`/api/leads/${leadId}/elevate`, { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        window.Swal?.fire({
          icon: "success",
          title: "Lead Elevated!",
          html: `<strong>${escapeText(data.user?.name) || escapeText(leadName)}</strong> is now a registered candidate.<br><small>They can log in with temporary password <code>password123</code>.</small>`,
          background: "#1a1a1a",
          color: "#fff",
          confirmButtonColor: "#e0c214",
        });
      } else if (res.status === 409) {
        window.Swal?.fire({
          icon: "info",
          title: "Already Registered",
          html: `This lead already has a registered account:<br><strong>${escapeText(data.user?.name)}</strong> (${escapeText(data.user?.email)})`,
          background: "#1a1a1a",
          color: "#fff",
          confirmButtonColor: "#e0c214",
        });
      } else {
        throw new Error(data.error || "Failed to elevate");
      }
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Elevation Failed",
        text: err instanceof Error ? err.message : "Failed to elevate",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  }

  function exportToExcel(leadsArray: LeadItem[], fileName: string) {
    if (!window.XLSX) {
      window.Swal?.fire({ icon: "error", title: "Export Unavailable", text: "Excel export library is still loading, please try again.", background: "#1a1a1a", color: "#fff" });
      return;
    }
    if (!leadsArray || leadsArray.length === 0) {
      window.Swal?.fire({ icon: "warning", title: "No Data", text: "There is no data to export for the current selection.", background: "#1a1a1a", color: "#fff" });
      return;
    }

    const mappedData = leadsArray.map((lead) => {
      const dateObj = new Date(lead.date);
      return {
        Date: dateObj.toLocaleDateString("en-GB"),
        Time: dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
        Name: lead.name || "—",
        Email: lead.email || "—",
        Phone: lead.phoneNumber || "—",
      };
    });

    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.json_to_sheet(mappedData);
    window.XLSX.utils.book_append_sheet(wb, ws, "Leads Data");
    window.XLSX.writeFile(wb, fileName);

    window.Swal?.fire({
      icon: "success",
      title: "Export Complete",
      text: `File "${fileName}" has been downloaded.`,
      background: "#1a1a1a",
      color: "#fff",
      confirmButtonColor: "#e0c214",
    });
  }

  function exportFiltered() {
    let name = "Leads_Export.xlsx";
    if (appliedFrom && appliedTo) name = `Leads_${appliedFrom}_to_${appliedTo}.xlsx`;
    else if (appliedFrom) name = `Leads_from_${appliedFrom}.xlsx`;
    else if (appliedTo) name = `Leads_until_${appliedTo}.xlsx`;
    exportToExcel(searchFiltered, name);
  }

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js" strategy="afterInteractive" />

      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <i className="fas fa-address-book me-2"></i> Leads Management
          </h1>
          <p className="text-muted mb-0">Track, manage, and convert inquiry leads from the magazine and website</p>
        </div>
        <div
          className="badge"
          style={{ background: "rgba(224, 194, 20, 0.1)", color: "var(--primary-gold)", border: "1px solid rgba(224, 194, 20, 0.2)", padding: "8px 15px" }}
        >
          {loading ? "Loading leads..." : <><i className="fas fa-check-circle me-2"></i> {infoMsg}</>}
        </div>
      </div>

      {/* Filter Panel */}
      <div className="filter-panel">
        <div className="filter-item">
          <label className="admin-form-label">
            <i className="far fa-calendar-alt me-1"></i> From Date
          </label>
          <input type="date" className="admin-input" value={fromDateInput} onChange={(e) => setFromDateInput(e.target.value)} />
        </div>
        <div className="filter-item">
          <label className="admin-form-label">
            <i className="far fa-calendar-check me-1"></i> To Date
          </label>
          <input type="date" className="admin-input" value={toDateInput} onChange={(e) => setToDateInput(e.target.value)} />
        </div>
        <div className="filter-actions">
          <button className="thm-btn" style={{ minWidth: 130 }} onClick={applyFilters}>
            <i className="fas fa-search me-2"></i> Apply Filter
          </button>
          <button
            className="thm-btn"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", minWidth: 100 }}
            onClick={clearFilters}
          >
            <i className="fas fa-undo me-2"></i> Clear
          </button>
          <button className="thm-btn" style={{ background: "#27ae60", borderColor: "#2ecc71", minWidth: 160 }} onClick={exportFiltered}>
            <i className="fas fa-file-excel me-2"></i> Export Excel
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <i className="fas fa-search search-icon"></i>
        <input
          type="text"
          placeholder="Search leads by name, email, or phone number..."
          autoComplete="off"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Leads Table Section */}
      <div className="admin-card">
        {loading ? (
          <div className="loading-spinner text-center" style={{ padding: 60 }}>
            <div className="spinner-border text-warning" role="status"></div>
            <p className="mt-3">Fetching leads data...</p>
          </div>
        ) : loadError ? (
          <div className="admin-table-container">
            <table className="admin-table">
              <tbody>
                <tr>
                  <td colSpan={7} className="text-center text-danger p-4">
                    <i className="fas fa-exclamation-triangle me-2"></i> Failed to load leads: {loadError}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : searchFiltered.length === 0 ? (
          <div className="empty-state text-center" style={{ padding: 80 }}>
            <div className="empty-icon mb-3" style={{ fontSize: "4rem", color: "var(--primary-gold)", opacity: 0.3 }}>
              <i className="fas fa-inbox"></i>
            </div>
            <h3>No Leads Found</h3>
            <p>There are no leads matching your current filter criteria.</p>
          </div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>SN</th>
                    <th>Login Date</th>
                    <th>Login Time</th>
                    <th>Student Name</th>
                    <th>Email Address</th>
                    <th>Mobile Number</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageLeads.map((lead, index) => {
                    const globalIdx = startIdx + index + 1;
                    const dateObj = new Date(lead.date);
                    const formattedDate = dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
                    let formattedTime = lead.time || "—";
                    if (formattedTime === "N/A" && lead.date) {
                      formattedTime = new Date(lead.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                    }

                    return (
                      <tr key={lead._id}>
                        <td>{globalIdx}</td>
                        <td>
                          <span className="date-badge">
                            <i className="far fa-calendar-alt me-1"></i> {formattedDate}
                          </span>
                        </td>
                        <td>
                          <span className="date-badge">
                            <i className="far fa-clock me-1"></i> {formattedTime}
                          </span>
                        </td>
                        <td>
                          <span className="lead-name" style={{ fontSize: "0.95rem" }}>
                            {lead.name || "—"}
                          </span>
                        </td>
                        <td>
                          <span className="lead-contact">
                            <i className="far fa-envelope me-1"></i> {lead.email || "—"}
                          </span>
                        </td>
                        <td>
                          <span className="lead-contact">
                            <i className="fas fa-phone-alt me-1"></i> {lead.phoneNumber || "—"}
                          </span>
                        </td>
                        <td>
                          {lead.convertedAt ? (
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 4,
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                letterSpacing: "0.5px",
                                color: "#2ecc71",
                                background: "rgba(46,204,113,0.15)",
                                border: "1px solid rgba(46,204,113,0.3)",
                              }}
                              title={`Converted via sales enrollment on ${new Date(lead.convertedAt).toLocaleDateString()}`}
                            >
                              CONVERTED
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td>
                          <div className="actions-cell">
                            {!lead.isRegisteredLead && (
                              <button
                                className="action-btn elevate-btn"
                                title="Elevate to Candidate"
                                onClick={() => handleElevate(lead._id, lead.name, lead.email)}
                              >
                                <i className="fas fa-user-plus"></i>
                              </button>
                            )}
                            <button className="action-btn delete-btn" title="Delete Lead" onClick={() => handleDelete(lead._id, lead.name)}>
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination-controls" style={{ display: "flex" }}>
              <div className="pagination-info">
                <span>
                  Showing {startIdx + 1}–{endIdx} of {searchFiltered.length} leads
                </span>
                &nbsp;|&nbsp;
                <label>
                  Per page:{" "}
                  <select
                    className="per-page-select"
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(parseInt(e.target.value, 10));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
              </div>
              <div className="pagination-buttons">
                <button disabled={safePage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  <i className="fas fa-chevron-left"></i>
                </button>
                {getPageRange(safePage, totalPages).map((p, i) =>
                  p === "..." ? (
                    <button key={`ellipsis-${i}`} disabled style={{ cursor: "default" }}>
                      &hellip;
                    </button>
                  ) : (
                    <button key={p} className={p === safePage ? "active" : ""} onClick={() => setCurrentPage(p)}>
                      {p}
                    </button>
                  )
                )}
                <button disabled={safePage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floating Action Button for ALL Export */}
      <button id="excelDownloadBtn" title="Download all leads as Excel" onClick={() => exportToExcel(allLeads, "All_Leads_Complete.xlsx")}>
        <i className="fas fa-download"></i>
      </button>
    </div>
  );
}
