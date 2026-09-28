"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import {
  Globe,
  MapPin,
  CheckCircle2,
  CalendarDays,
  CalendarCheck,
  Search,
  RotateCcw,
  FileSpreadsheet,
  AlertTriangle,
  Inbox,
  Clock,
  Mail,
  Phone,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Award,
  Compass,
} from "lucide-react";
import SearchCombobox from "@/components/admin/SearchCombobox";
import { latestDistinctValues } from "@/lib/latestValues";
import "@/app/admin/styles/legacy-leads.css";
import "@/app/admin/styles/legacy-leads-page.css";

const ICON_STYLE = { verticalAlign: -2 };

interface LeadItem {
  _id: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  date: string;
  time?: string;
  isRegisteredLead?: boolean;
  convertedAt?: string | null;
  enrollmentMode?: string;
  source?: string;
  ssbExperience?: string;
  nextSsbDate?: string;
  entries?: string[];
  boards?: string[];
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

const EXPERIENCE_OPTIONS = ["Fresher", "Screened Out", "Conference Out"];

const ENTRY_OPTIONS = [
  "10+2 B. Tech. entry (Navy)",
  "10+2 TES Army",
  "AFCAT",
  "Army Service entry (PCSL, SCO, ACC, AMC)",
  "CDS",
  "Navy Service entry (CW, SD List)",
  "NCC special entry",
  "NDA",
  "RVC",
  "SSC (JAG)",
  "SSC (Tech) Army",
  "SSC Navy (Executive, Law, Pilot, Naval Air Operations, Engineering, Electrical, Logistics, Naval Armament, Education)",
  "Territorial Army",
  "TGC",
];

const BOARD_OPTIONS = [
  "1 AFSB Dehradun",
  "2 AFSB Mysuru",
  "3 AFSB Gandhinagar",
  "4 AFSB Varanasi",
  "5 AFSB Guwahati",
  "33 SSB Bhopal (Navy)",
  "NSB Vizag (Navy)",
  "12 SSB Bangalore (Navy)",
  "SSB (Kolkata) (Navy)",
  "31 | 32 SSB Selection Center North (Jalandhar)",
  "11 | 14 | 18 | 19 | 34 SSB Selection Center East (Prayagraj)",
  "20 | 21 | 22 SSB Selection Center Central (Bhopal)",
  "17 | 24 SSB Selection Center South (Bangalore)",
  "CGSB (NOIDA)",
  "Not known right now",
  "NOT IN THIS LIST",
];

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

interface BatchLeadsViewProps {
  batchType: "online" | "offline";
}

export default function BatchLeadsView({ batchType }: BatchLeadsViewProps) {
  const targetSource = batchType === "online" ? "google-ads-online" : "google-ads-offline";
  const title = batchType === "online" ? "Online Google Ad Batch" : "Offline Google Ad Batch";
  const subtitle =
    batchType === "online"
      ? "Track and manage leads submitted from the online batch Google Ads landing page"
      : "Track and manage leads submitted from the offline batch Google Ads landing page";

  const [batchLeads, setBatchLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [entryFilter, setEntryFilter] = useState("all");
  const [boardFilter, setBoardFilter] = useState("all");

  const [fromDateInput, setFromDateInput] = useState("");
  const [toDateInput, setToDateInput] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/allLeads")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data: LeadItem[]) => {
        if (cancelled) return;
        const filtered = data
          .filter((l) => l.source === targetSource)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setBatchLeads(filtered);
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
  }, [targetSource]);

  const leadNameOptions = useMemo(() => latestDistinctValues(batchLeads, (l) => l.name, (l) => l.date), [batchLeads]);

  // Date Filter
  const dateFiltered = useMemo(() => {
    if (!appliedFrom && !appliedTo) return batchLeads;
    return batchLeads.filter((lead) => {
      const leadYMD = new Date(lead.date).toISOString().split("T")[0];
      if (appliedFrom && appliedTo) return leadYMD >= appliedFrom && leadYMD <= appliedTo;
      if (appliedFrom) return leadYMD >= appliedFrom;
      if (appliedTo) return leadYMD <= appliedTo;
      return true;
    });
  }, [batchLeads, appliedFrom, appliedTo]);

  // Experience Filter
  const experienceFiltered = useMemo(() => {
    if (experienceFilter === "all") return dateFiltered;
    return dateFiltered.filter((lead) => (lead.ssbExperience || "").toLowerCase() === experienceFilter.toLowerCase());
  }, [dateFiltered, experienceFilter]);

  // Target Entry Filter
  const entryFiltered = useMemo(() => {
    if (entryFilter === "all") return experienceFiltered;
    return experienceFiltered.filter((lead) => Array.isArray(lead.entries) && lead.entries.includes(entryFilter));
  }, [experienceFiltered, entryFilter]);

  // Board Filter
  const boardFiltered = useMemo(() => {
    if (boardFilter === "all") return entryFiltered;
    return entryFiltered.filter((lead) => Array.isArray(lead.boards) && lead.boards.includes(boardFilter));
  }, [entryFiltered, boardFilter]);

  // Search Filter
  const searchFiltered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return boardFiltered;
    return boardFiltered.filter((lead) => {
      const name = (lead.name || "").toLowerCase();
      const email = (lead.email || "").toLowerCase();
      const phone = (lead.phoneNumber || "").toLowerCase();
      const exp = (lead.ssbExperience || "").toLowerCase();
      const entries = Array.isArray(lead.entries) ? lead.entries.join(" ").toLowerCase() : "";
      const boards = Array.isArray(lead.boards) ? lead.boards.join(" ").toLowerCase() : "";
      return (
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        exp.includes(query) ||
        entries.includes(query) ||
        boards.includes(query)
      );
    });
  }, [boardFiltered, search]);

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
      parts.push(`date (${rangeText})`);
    }
    if (experienceFilter !== "all") parts.push(`exp: ${experienceFilter}`);
    if (entryFilter !== "all") parts.push(`entry: ${entryFilter}`);
    if (boardFilter !== "all") parts.push(`board: ${boardFilter}`);
    if (search.trim()) parts.push(`search: "${search.trim()}"`);

    if (parts.length > 0) {
      return `${searchFiltered.length} leads — ${parts.join(", ")}`;
    }
    return `Total: ${batchLeads.length} leads`;
  }, [appliedFrom, appliedTo, experienceFilter, entryFilter, boardFilter, search, searchFiltered.length, batchLeads.length]);

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
      title: "Filters applied",
    });
  }

  function clearFilters() {
    setFromDateInput("");
    setToDateInput("");
    setAppliedFrom("");
    setAppliedTo("");
    setSearch("");
    setExperienceFilter("all");
    setEntryFilter("all");
    setBoardFilter("all");
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

      setBatchLeads((prev) => prev.filter((l) => l._id !== leadId));
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
        Date: isNaN(dateObj.getTime()) ? String(lead.date || "") : dateObj.toLocaleDateString("en-GB"),
        Time: isNaN(dateObj.getTime()) ? String(lead.time || "") : dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
        Name: lead.name || "—",
        Email: lead.email || "—",
        Phone: lead.phoneNumber || "—",
        "SSB Experience": lead.ssbExperience || "—",
        "Target Entries": Array.isArray(lead.entries) && lead.entries.length > 0 ? lead.entries.join(", ") : "—",
        "SSB Boards": Array.isArray(lead.boards) && lead.boards.length > 0 ? lead.boards.join(", ") : "—",
        "Next SSB Date": lead.nextSsbDate || "—",
        Status: lead.convertedAt ? "Converted" : "Pending",
      };
    });

    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.json_to_sheet(mappedData);
    window.XLSX.utils.book_append_sheet(wb, ws, `${batchType.toUpperCase()} Leads`);
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
    const prefix = batchType === "online" ? "Online_Google_Ads" : "Offline_Google_Ads";
    let name = `${prefix}_Export.xlsx`;
    if (appliedFrom && appliedTo) name = `${prefix}_${appliedFrom}_to_${appliedTo}.xlsx`;
    else if (appliedFrom) name = `${prefix}_from_${appliedFrom}.xlsx`;
    else if (appliedTo) name = `${prefix}_until_${appliedTo}.xlsx`;
    exportToExcel(searchFiltered, name);
  }

  function exportAll() {
    const prefix = batchType === "online" ? "Online_Google_Ads" : "Offline_Google_Ads";
    exportToExcel(batchLeads, `${prefix}_All.xlsx`);
  }

  return (
    <div className="container" style={{ maxWidth: 1400, margin: "40px auto", padding: "0 20px" }}>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js" strategy="afterInteractive" />

      {/* Header */}
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            {batchType === "online" ? (
              <Globe size={20} className="me-2" style={ICON_STYLE} />
            ) : (
              <MapPin size={20} className="me-2" style={ICON_STYLE} />
            )}{" "}
            {title}
          </h1>
          <p className="text-muted mb-0">{subtitle}</p>
        </div>
        <div
          className="badge"
          style={{ background: "rgba(224, 194, 20, 0.1)", color: "var(--primary-gold)", border: "1px solid rgba(224, 194, 20, 0.2)", padding: "8px 15px" }}
        >
          {loading ? "Loading leads..." : <><CheckCircle2 size={14} className="me-2" style={ICON_STYLE} /> {infoMsg}</>}
        </div>
      </div>

      {/* Filter Panel with Experience, Entry & Board */}
      <div className="filter-panel" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <div className="filter-item" style={{ minWidth: 0 }}>
          <label className="admin-form-label">
            <CalendarDays size={14} className="me-1" style={ICON_STYLE} /> From Date
          </label>
          <input type="date" className="admin-input" value={fromDateInput} onChange={(e) => setFromDateInput(e.target.value)} />
        </div>

        <div className="filter-item" style={{ minWidth: 0 }}>
          <label className="admin-form-label">
            <CalendarCheck size={14} className="me-1" style={ICON_STYLE} /> To Date
          </label>
          <input type="date" className="admin-input" value={toDateInput} onChange={(e) => setToDateInput(e.target.value)} />
        </div>

        {/* Dropdown Filter: Experience */}
        <div className="filter-item" style={{ minWidth: 0 }}>
          <label className="admin-form-label">
            <Award size={14} className="me-1" style={ICON_STYLE} /> SSB Experience
          </label>
          <select
            className="admin-input"
            value={experienceFilter}
            onChange={(e) => {
              setExperienceFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Experiences</option>
            {EXPERIENCE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown Filter: Target Entry */}
        <div className="filter-item" style={{ minWidth: 0 }}>
          <label className="admin-form-label">
            <Compass size={14} className="me-1" style={ICON_STYLE} /> SSB Entry
          </label>
          <select
            className="admin-input"
            value={entryFilter}
            onChange={(e) => {
              setEntryFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Entries</option>
            {ENTRY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown Filter: Board / Center */}
        <div className="filter-item" style={{ minWidth: 0 }}>
          <label className="admin-form-label">
            <MapPin size={14} className="me-1" style={ICON_STYLE} /> SSB Board
          </label>
          <select
            className="admin-input"
            value={boardFilter}
            onChange={(e) => {
              setBoardFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Boards</option>
            {BOARD_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Action Buttons */}
        <div
          className="filter-actions"
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "flex-end",
            marginTop: 4,
          }}
        >
          <button className="thm-btn" style={{ minWidth: 130 }} onClick={applyFilters}>
            <Search size={14} className="me-2" style={ICON_STYLE} /> Apply Filter
          </button>

          <button
            className="thm-btn"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.15)", minWidth: 90 }}
            onClick={clearFilters}
          >
            <RotateCcw size={14} className="me-2" style={ICON_STYLE} /> Clear
          </button>

          {/* Export Filtered */}
          <button
            className="thm-btn"
            style={{
              background: "rgba(46, 213, 115, 0.16)",
              borderColor: "#2ed573",
              color: "#2ed573",
              minWidth: 170,
            }}
            onClick={exportFiltered}
            title="Download currently filtered leads as Excel"
          >
            <FileSpreadsheet size={14} className="me-2" style={ICON_STYLE} />
            Export Filtered
          </button>

          {/* Export All in this Batch */}
          <button
            className="thm-btn"
            style={{
              background: "rgba(224, 194, 20, 0.15)",
              borderColor: "var(--primary-gold, #e0c214)",
              color: "var(--primary-gold, #e0c214)",
              minWidth: 160,
            }}
            onClick={exportAll}
            title={`Download all ${batchType} leads as Excel`}
          >
            <Download size={14} className="me-2" style={ICON_STYLE} />
            Export All {batchType === "online" ? "Online" : "Offline"}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <SearchCombobox
        options={leadNameOptions}
        wrapperClassName="search-bar"
        className=""
        maxWidth="none"
        placeholder={`Search ${batchType} leads by name, email, phone, experience, entry, or board...`}
        value={search}
        onChange={(v) => {
          setSearch(v);
          setCurrentPage(1);
        }}
      />

      {/* Leads Table Section */}
      <div className="admin-card">
        {loading ? (
          <div className="loading-spinner text-center" style={{ padding: 60 }}>
            <div className="spinner-border text-warning" role="status"></div>
            <p className="mt-3">Fetching {batchType} leads data...</p>
          </div>
        ) : loadError ? (
          <div className="admin-table-container">
            <table className="admin-table">
              <tbody>
                <tr>
                  <td colSpan={10} className="text-center text-danger p-4">
                    <AlertTriangle size={16} className="me-2" style={ICON_STYLE} /> Failed to load leads: {loadError}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : searchFiltered.length === 0 ? (
          <div className="empty-state text-center" style={{ padding: 80 }}>
            <div className="empty-icon mb-3" style={{ fontSize: "4rem", color: "var(--primary-gold)", opacity: 0.3 }}>
              <Inbox size={64} />
            </div>
            <h3>No Leads Found</h3>
            <p>There are no {batchType} leads matching your current filter criteria.</p>
          </div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>SN</th>
                    <th>Date &amp; Time</th>
                    <th>Student Name</th>
                    <th>Contact</th>
                    <th>SSB Experience</th>
                    <th>Target Entry</th>
                    <th>Board / Center</th>
                    <th>Next SSB</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageLeads.map((lead, index) => {
                    const globalIdx = startIdx + index + 1;
                    const dateObj = new Date(lead.date);
                    const formattedDate = isNaN(dateObj.getTime())
                      ? String(lead.date || "—")
                      : dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
                    let formattedTime = lead.time || "—";
                    if (formattedTime === "N/A" && !isNaN(dateObj.getTime())) {
                      formattedTime = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                    }

                    return (
                      <tr key={lead._id}>
                        <td>{globalIdx}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <span className="date-badge">
                              <CalendarDays size={11} className="me-1" style={ICON_STYLE} /> {formattedDate}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              <Clock size={11} className="me-1" style={ICON_STYLE} /> {formattedTime}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="lead-name" style={{ fontSize: "0.95rem" }}>
                            {lead.name || "—"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <span className="lead-contact">
                              <Mail size={11} className="me-1" style={ICON_STYLE} /> {lead.email || "—"}
                            </span>
                            <span className="lead-contact">
                              <Phone size={11} className="me-1" style={ICON_STYLE} /> {lead.phoneNumber || "—"}
                            </span>
                          </div>
                        </td>
                        <td>
                          {lead.ssbExperience ? (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--primary-gold, #e0c214)",
                                background: "rgba(224, 194, 20, 0.1)",
                                padding: "2px 8px",
                                borderRadius: 4,
                                border: "1px solid rgba(224, 194, 20, 0.25)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {lead.ssbExperience}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td>
                          {Array.isArray(lead.entries) && lead.entries.length > 0 ? (
                            <span
                              title={lead.entries.join(", ")}
                              style={{
                                fontSize: "0.8rem",
                                maxWidth: 160,
                                display: "inline-block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {lead.entries.join(", ")}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td>
                          {Array.isArray(lead.boards) && lead.boards.length > 0 ? (
                            <span
                              title={lead.boards.join(", ")}
                              style={{
                                fontSize: "0.8rem",
                                maxWidth: 160,
                                display: "inline-block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {lead.boards.join(", ")}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap" }}>
                            {lead.nextSsbDate || "—"}
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
                            <button className="action-btn delete-btn" title="Delete Lead" onClick={() => handleDelete(lead._id, lead.name)}>
                              <Trash2 size={14} />
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
                  <ChevronLeft size={14} />
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
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floating Action Button */}
      <button id="excelDownloadBtn" title={`Download all ${batchType} leads as Excel`} onClick={exportAll}>
        <Download size={18} />
      </button>
    </div>
  );
}
