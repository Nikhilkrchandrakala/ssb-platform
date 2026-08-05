"use client";

import { useEffect, useState } from "react";
import { Send, Users, Mail, MessageSquareText, CheckCircle2, XCircle } from "lucide-react";
import { assessorLabel } from "@/lib/assessorLabels";
import "@/app/admin/styles/legacy-allotment.css";

const ICON_STYLE = { verticalAlign: -2 };

interface AssessorRow {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  assessorType?: string;
  count: number;
}

interface NotifyResult {
  assessorId: string;
  name: string;
  count: number;
  emailDelivered: boolean;
  smsDelivered: boolean;
}

export default function AllotmentSummaryView() {
  const [batches, setBatches] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [assessors, setAssessors] = useState<AssessorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastResults, setLastResults] = useState<NotifyResult[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/allotment-summary")
      .then((res) => res.json())
      .then((data) => setBatches(data.batches || []))
      .catch(() => {});
  }, []);

  const loadBatch = (batch: string) => {
    setSelectedBatch(batch);
    setLastResults(null);
    if (!batch) {
      setAssessors([]);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/allotment-summary?batch=${encodeURIComponent(batch)}`)
      .then((res) => res.json())
      .then((data) => setAssessors(data.assessors || []))
      .catch(() => setAssessors([]))
      .finally(() => setLoading(false));
  };

  const handleSend = async () => {
    if (!selectedBatch || assessors.length === 0) return;

    const result = await window.Swal?.fire({
      title: "Send Allotment Notifications?",
      html: `This will email + SMS <strong>${assessors.length}</strong> assessor(s) their current candidate count for <strong>Batch ${selectedBatch}</strong>.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#e0c214",
      cancelButtonColor: "rgba(255,255,255,0.1)",
      confirmButtonText: "Yes, notify them",
      background: "#1a1a1a",
      color: "#fff",
    });
    if (!result?.isConfirmed) return;

    setSending(true);
    try {
      const response = await fetch("/api/admin/allotment-summary/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: selectedBatch }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send notifications");

      setLastResults(data.results || []);
      const failed = (data.results || []).filter((r: NotifyResult) => !r.emailDelivered && !r.smsDelivered).length;
      window.Swal?.fire({
        icon: failed > 0 ? "warning" : "success",
        title: "Notifications Sent",
        text: failed > 0 ? `${failed} assessor(s) had neither email nor SMS deliver — check details below.` : "All assessors notified successfully.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });
    } catch (err) {
      window.Swal?.fire({
        icon: "error",
        title: "Failed to Send",
        text: err instanceof Error ? err.message : "Something went wrong.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 1100, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <Send size={20} className="me-2" style={ICON_STYLE} /> Notify Assessors
          </h1>
          <p className="text-muted mb-0">Send each assessor their current candidate count for a batch — one notification per assessor, not per candidate.</p>
        </div>
        <button
          className="thm-btn"
          onClick={handleSend}
          disabled={sending || loading || !selectedBatch || assessors.length === 0}
        >
          {sending ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span> Sending...
            </>
          ) : (
            <>
              <Send size={14} className="me-2" style={ICON_STYLE} /> Send Notifications
            </>
          )}
        </button>
      </div>

      <div className="admin-card">
        <div className="d-flex flex-wrap gap-3 align-items-center mb-4">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Batch</span>
            <select
              className="admin-input form-select"
              style={{ minWidth: 160 }}
              value={selectedBatch}
              onChange={(e) => loadBatch(e.target.value)}
            >
              <option value="">Select a batch...</option>
              {batches.map((b) => (
                <option value={b} key={b}>
                  Batch {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-warning" role="status"></div>
          </div>
        )}

        {!loading && selectedBatch && assessors.length === 0 && (
          <div className="text-center py-5 opacity-50">
            <Users size={48} style={{ opacity: 0.3 }} />
            <p className="mt-3">No assessors have any candidates allotted in Batch {selectedBatch} yet.</p>
          </div>
        )}

        {!loading && assessors.length > 0 && (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Assessor</th>
                  <th>Role</th>
                  <th>Candidates in Batch {selectedBatch}</th>
                  {lastResults && <th>Last Send Result</th>}
                </tr>
              </thead>
              <tbody>
                {assessors.map((a) => {
                  const result = lastResults?.find((r) => r.assessorId === a.id);
                  return (
                    <tr key={a.id}>
                      <td>
                        <span style={{ fontWeight: 600, color: "var(--primary-gold)" }}>{a.name}</span>
                        {a.email && <div className="small opacity-50">{a.email}</div>}
                      </td>
                      <td>{assessorLabel(a.assessorType) || "—"}</td>
                      <td>
                        <span className="status-badge status-active">{a.count}</span>
                      </td>
                      {lastResults && (
                        <td>
                          {result ? (
                            <div className="d-flex gap-3">
                              <span title="Email">
                                <Mail size={13} className="me-1" style={ICON_STYLE} />
                                {result.emailDelivered ? (
                                  <CheckCircle2 size={13} color="#2ecc71" style={ICON_STYLE} />
                                ) : (
                                  <XCircle size={13} color="#ff6b6b" style={ICON_STYLE} />
                                )}
                              </span>
                              <span title="SMS">
                                <MessageSquareText size={13} className="me-1" style={ICON_STYLE} />
                                {result.smsDelivered ? (
                                  <CheckCircle2 size={13} color="#2ecc71" style={ICON_STYLE} />
                                ) : (
                                  <XCircle size={13} color="#ff6b6b" style={ICON_STYLE} />
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="opacity-50">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
