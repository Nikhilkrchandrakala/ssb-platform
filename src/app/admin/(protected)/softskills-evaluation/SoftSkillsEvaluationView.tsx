"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Video,
  CheckCircle,
  Clock,
  Hourglass,
  Lock,
  Unlock,
  Eye,
  Search,
  Users,
  Calendar,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  X,
  Play,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

interface BatchSlotItem {
  _id: string;
  title?: string;
  batchNo?: string;
  startTime?: string;
  endTime?: string;
  maxStudents: number;
  bookedCount: number;
  pendingCount: number;
  reviewPendingCount: number;
  completedCount: number;
}

interface CandidateSubmission {
  _id?: string | null;
  slotId: string;
  userId: string;
  video1Url?: string;
  video1Id?: string;
  video1SubmittedAt?: string | null;
  video2Unlocked: boolean;
  video2Url?: string;
  video2Id?: string;
  video2SubmittedAt?: string | null;
  status: "PENDING" | "REVIEW_PENDING" | "COMPLETED";
  feedback?: string;
  reviewedAt?: string | null;
  reviewedBy?: { name?: string; email?: string } | null;
}

interface CandidateItem {
  _id: string;
  name: string;
  email: string;
  phone: string;
  chestNo: string;
  profileImage?: string | null;
  submission: CandidateSubmission;
}

export default function SoftSkillsEvaluationView() {
  const [batches, setBatches] = useState<BatchSlotItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");

  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Review Modal State
  const [evalModalCandidate, setEvalModalCandidate] = useState<CandidateItem | null>(null);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [togglingUnlock, setTogglingUnlock] = useState(false);
  const [batchUnlocking, setBatchUnlocking] = useState(false);

  // Lock body scroll when evaluation modal is open to avoid background page scrolling
  useEffect(() => {
    if (evalModalCandidate) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [evalModalCandidate]);

  // 1. Fetch all Soft Skills batches
  const loadBatches = async () => {
    setLoadingBatches(true);
    try {
      const res = await fetch("/api/admin/softskills/batches");
      if (!res.ok) throw new Error("Failed to load batches");
      const data = await res.json();
      setBatches(data.batches || []);
      if (data.batches && data.batches.length > 0 && !selectedSlotId) {
        setSelectedSlotId(data.batches[0]._id);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Could not load batches");
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  // 2. Fetch candidates for selected batch
  const loadCandidates = async (slotId: string) => {
    if (!slotId) return;
    setLoadingCandidates(true);
    try {
      const res = await fetch(`/api/admin/softskills/candidates?slotId=${slotId}`);
      if (!res.ok) throw new Error("Failed to load candidates");
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Could not load candidates");
    } finally {
      setLoadingCandidates(false);
    }
  };

  useEffect(() => {
    if (selectedSlotId) {
      loadCandidates(selectedSlotId);
    }
  }, [selectedSlotId]);

  // Selected batch object
  const currentBatch = useMemo(
    () => batches.find((b) => b._id === selectedSlotId) || null,
    [batches, selectedSlotId]
  );

  // Filtered candidate list
  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.chestNo.toLowerCase().includes(q);

      const subStatus = c.submission?.status || "PENDING";
      const matchesStatus = statusFilter === "all" || subStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [candidates, search, statusFilter]);

  // Batch-wide Unlock of Video 2
  const handleBatchUnlock = async () => {
    if (!selectedSlotId) return;
    const confirmed = window.confirm(
      "Are you sure you want to unlock Video 2 (Final Capstone Speech) for ALL students in this batch?"
    );
    if (!confirmed) return;

    setBatchUnlocking(true);
    try {
      const res = await fetch("/api/admin/softskills/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: selectedSlotId, unlockAll: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unlock batch");

      toast.success(data.message || "Video 2 unlocked for all students!");
      loadCandidates(selectedSlotId);
    } catch (err: any) {
      toast.error(err.message || "Failed to unlock batch");
    } finally {
      setBatchUnlocking(false);
    }
  };

  // Individual Candidate Video 2 Unlock Toggle
  const handleToggleIndividualUnlock = async (candidate: CandidateItem) => {
    const targetUserId = candidate._id;
    const currentLockState = candidate.submission?.video2Unlocked;
    const nextLockState = !currentLockState;

    setTogglingUnlock(true);
    try {
      const res = await fetch("/api/admin/softskills/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlotId,
          userId: targetUserId,
          lockedState: nextLockState,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update lock status");

      toast.success(
        nextLockState
          ? `Video 2 unlocked for ${candidate.name}`
          : `Video 2 locked for ${candidate.name}`
      );

      // Update in state
      setCandidates((prev) =>
        prev.map((c) =>
          c._id === targetUserId
            ? { ...c, submission: { ...c.submission, video2Unlocked: nextLockState } }
            : c
        )
      );

      if (evalModalCandidate?._id === targetUserId) {
        setEvalModalCandidate((prev) =>
          prev ? { ...prev, submission: { ...prev.submission, video2Unlocked: nextLockState } } : null
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle lock");
    } finally {
      setTogglingUnlock(false);
    }
  };

  // Open Evaluation Modal
  const openEvaluationModal = (candidate: CandidateItem) => {
    setEvalModalCandidate(candidate);
    setFeedbackInput(candidate.submission?.feedback || "");
  };

  // Submit Feedback
  const handleSaveFeedback = async () => {
    if (!evalModalCandidate) return;
    if (!feedbackInput || !feedbackInput.trim()) {
      toast.error("Please enter written remarks/feedback before submitting.");
      return;
    }

    setSavingFeedback(true);
    try {
      const res = await fetch("/api/admin/softskills/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlotId,
          userId: evalModalCandidate._id,
          submissionId: evalModalCandidate.submission?._id,
          feedback: feedbackInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save feedback");

      toast.success("Feedback submitted and published successfully!");

      // Update in local state
      setCandidates((prev) =>
        prev.map((c) =>
          c._id === evalModalCandidate._id
            ? {
                ...c,
                submission: {
                  ...c.submission,
                  feedback: feedbackInput.trim(),
                  status: "COMPLETED",
                  reviewedAt: new Date().toISOString(),
                },
              }
            : c
        )
      );

      setEvalModalCandidate((prev) =>
        prev
          ? {
              ...prev,
              submission: {
                ...prev.submission,
                feedback: feedbackInput.trim(),
                status: "COMPLETED",
                reviewedAt: new Date().toISOString(),
              },
            }
          : null
      );

      loadBatches(); // Refresh batch statistics
    } catch (err: any) {
      toast.error(err.message || "Failed to save feedback");
    } finally {
      setSavingFeedback(false);
    }
  };

  return (
    <div className="admin-page-container" style={{ padding: "28px 32px" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(210, 161, 0, 0.15)",
                border: "1px solid rgba(210, 161, 0, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary-gold, #d2a100)",
                fontSize: 22,
              }}
            >
              <Video />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.65rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>
                Soft Skills Speech Evaluations
              </h1>
              <p style={{ margin: "4px 0 0", color: "#888", fontSize: "0.88rem" }}>
                Evaluate Day 1 Baseline introductions, unlock Capstone exit speeches, and write candidate feedback.
              </p>
            </div>
          </div>
        </div>

        {/* Batch Selector Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select
            value={selectedSlotId}
            onChange={(e) => setSelectedSlotId(e.target.value)}
            disabled={loadingBatches || batches.length === 0}
            style={{
              background: "#1e1e24",
              border: "1px solid rgba(210, 161, 0, 0.35)",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: "0.9rem",
              fontWeight: 600,
              minWidth: "260px",
              cursor: "pointer",
            }}
          >
            {batches.length === 0 ? (
              <option value="">No Active Soft Skills Batches</option>
            ) : (
              batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.batchNo || b.title || "—"}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            onClick={() => {
              loadBatches();
              if (selectedSlotId) loadCandidates(selectedSlotId);
            }}
            style={{
              background: "#1e1e24",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#fff",
              padding: "10px 14px",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Batch Stats Ribbon */}
      {currentBatch && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div style={{ background: "#18181b", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "18px 20px" }}>
            <span style={{ fontSize: "0.75rem", color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Total Candidates Enrolled
            </span>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff", marginTop: 4 }}>
              {currentBatch.bookedCount} <span style={{ fontSize: "0.9rem", color: "#666", fontWeight: 500 }}>/ {currentBatch.maxStudents}</span>
            </div>
          </div>

          <div style={{ background: "#18181b", border: "1px solid rgba(243, 156, 18, 0.25)", borderRadius: 12, padding: "18px 20px" }}>
            <span style={{ fontSize: "0.75rem", color: "#f39c12", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>
              <Hourglass size={14} /> Pending Submissions
            </span>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f39c12", marginTop: 4 }}>
              {currentBatch.pendingCount}
            </div>
          </div>

          <div style={{ background: "#18181b", border: "1px solid rgba(52, 152, 219, 0.25)", borderRadius: 12, padding: "18px 20px" }}>
            <span style={{ fontSize: "0.75rem", color: "#3498db", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={14} /> Review Pending (Ready)
            </span>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#3498db", marginTop: 4 }}>
              {currentBatch.reviewPendingCount}
            </div>
          </div>

          <div style={{ background: "#18181b", border: "1px solid rgba(46, 204, 113, 0.25)", borderRadius: 12, padding: "18px 20px" }}>
            <span style={{ fontSize: "0.75rem", color: "#2ecc71", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle size={14} /> Completed &amp; Evaluated
            </span>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#2ecc71", marginTop: 4 }}>
              {currentBatch.completedCount}
            </div>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div style={{ background: "#18181b", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 14, overflow: "hidden" }}>
        {/* Table Toolbar */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: "540px" }}>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type="text"
                placeholder="Search candidates by name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  background: "#101012",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 8,
                  padding: "9px 14px 9px 36px",
                  color: "#fff",
                  fontSize: "0.88rem",
                }}
              />
              <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#777" }} />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: "#101012",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#fff",
                borderRadius: 8,
                padding: "9px 14px",
                fontSize: "0.85rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="REVIEW_PENDING">Review Pending</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Batch Unlock Action */}
          <button
            type="button"
            onClick={handleBatchUnlock}
            disabled={batchUnlocking || candidates.length === 0}
            style={{
              background: "rgba(210, 161, 0, 0.15)",
              color: "var(--primary-gold, #d2a100)",
              border: "1px solid rgba(210, 161, 0, 0.4)",
              borderRadius: 8,
              padding: "9px 18px",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
            }}
          >
            <Unlock size={15} />
            {batchUnlocking ? "Unlocking Batch..." : "Unlock Video 2 for All Students"}
          </button>
        </div>

        {/* Candidate Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "#131315", color: "#888" }}>
                <th style={{ padding: "14px 20px", fontWeight: 700, textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.8px" }}>
                  Candidate
                </th>
                <th style={{ padding: "14px 16px", fontWeight: 700, textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.8px" }}>
                  Video 1 (Day 1 Baseline)
                </th>
                <th style={{ padding: "14px 16px", fontWeight: 700, textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.8px" }}>
                  Video 2 (Week 4 Capstone)
                </th>
                <th style={{ padding: "14px 16px", fontWeight: 700, textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.8px" }}>
                  Video 2 Lock Status
                </th>
                <th style={{ padding: "14px 16px", fontWeight: 700, textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.8px" }}>
                  Evaluation Status
                </th>
                <th style={{ padding: "14px 20px", fontWeight: 700, textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.8px", textAlign: "right" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingCandidates ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}>
                    <RefreshCw size={24} style={{ animation: "spin 1.5s infinite linear", marginBottom: 12 }} />
                    <div>Loading batch candidates...</div>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}>
                    <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "#ccc", marginBottom: 6 }}>
                      No Active Soft Skills Batches Found
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>
                      Any scheduled Soft Skills batches will appear here. Cancelled batches are automatically excluded.
                    </div>
                  </td>
                </tr>
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 20px", color: "#777" }}>
                    No candidates found for this batch.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => {
                  const sub = c.submission;
                  const status = sub?.status || "PENDING";
                  const v1Submitted = Boolean(sub?.video1Url);
                  const v2Submitted = Boolean(sub?.video2Url);
                  const v2Unlocked = Boolean(sub?.video2Unlocked);

                  return (
                    <tr
                      key={c._id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        transition: "background 0.2s ease",
                      }}
                    >
                      {/* Candidate info */}
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: "50%",
                              background: "rgba(210, 161, 0, 0.15)",
                              color: "var(--primary-gold, #d2a100)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              flexShrink: 0,
                            }}
                          >
                            {c.name ? c.name.slice(0, 2).toUpperCase() : "ST"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#fff" }}>{c.name}</div>
                            <div style={{ fontSize: "0.78rem", color: "#888" }}>{c.email}</div>
                            <div style={{ fontSize: "0.74rem", color: "#666" }}>{c.phone}</div>
                          </div>
                        </div>
                      </td>

                      {/* Video 1 Status */}
                      <td style={{ padding: "16px" }}>
                        {v1Submitted ? (
                          <div>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                background: "rgba(46, 204, 113, 0.12)",
                                color: "#2ecc71",
                                border: "1px solid rgba(46, 204, 113, 0.3)",
                                padding: "4px 10px",
                                borderRadius: 6,
                                fontSize: "0.75rem",
                                fontWeight: 700,
                              }}
                            >
                              <CheckCircle size={12} /> Submitted
                            </span>
                            {sub?.video1SubmittedAt && (
                              <div style={{ fontSize: "0.72rem", color: "#777", marginTop: 4 }}>
                                {new Date(sub.video1SubmittedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "rgba(255, 255, 255, 0.05)",
                              color: "#888",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            <Hourglass size={12} /> Not Submitted
                          </span>
                        )}
                      </td>

                      {/* Video 2 Status */}
                      <td style={{ padding: "16px" }}>
                        {v2Submitted ? (
                          <div>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                background: "rgba(46, 204, 113, 0.12)",
                                color: "#2ecc71",
                                border: "1px solid rgba(46, 204, 113, 0.3)",
                                padding: "4px 10px",
                                borderRadius: 6,
                                fontSize: "0.75rem",
                                fontWeight: 700,
                              }}
                            >
                              <CheckCircle size={12} /> Submitted
                            </span>
                            {sub?.video2SubmittedAt && (
                              <div style={{ fontSize: "0.72rem", color: "#777", marginTop: 4 }}>
                                {new Date(sub.video2SubmittedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                              </div>
                            )}
                          </div>
                        ) : v2Unlocked ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "rgba(52, 152, 219, 0.12)",
                              color: "#3498db",
                              border: "1px solid rgba(52, 152, 219, 0.3)",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            <Unlock size={12} /> Unlocked (Pending)
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "rgba(255, 255, 255, 0.04)",
                              color: "#666",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            <Lock size={12} /> Locked
                          </span>
                        )}
                      </td>

                      {/* Individual Unlock Toggle Button */}
                      <td style={{ padding: "16px" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleIndividualUnlock(c)}
                          disabled={togglingUnlock}
                          style={{
                            background: v2Unlocked ? "rgba(46, 204, 113, 0.12)" : "rgba(255, 255, 255, 0.05)",
                            color: v2Unlocked ? "#2ecc71" : "#aaa",
                            border: `1px solid ${v2Unlocked ? "rgba(46, 204, 113, 0.3)" : "rgba(255, 255, 255, 0.12)"}`,
                            borderRadius: 6,
                            padding: "6px 12px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {v2Unlocked ? <Unlock size={13} /> : <Lock size={13} />}
                          {v2Unlocked ? "Unlocked (Click to Lock)" : "Unlock Video 2"}
                        </button>
                      </td>

                      {/* Evaluation Status Badge (3 simple statuses) */}
                      <td style={{ padding: "16px" }}>
                        {status === "COMPLETED" ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "rgba(46, 204, 113, 0.15)",
                              color: "#2ecc71",
                              border: "1px solid rgba(46, 204, 113, 0.35)",
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: "0.78rem",
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle size={13} /> Completed
                          </span>
                        ) : status === "REVIEW_PENDING" ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "rgba(52, 152, 219, 0.15)",
                              color: "#3498db",
                              border: "1px solid rgba(52, 152, 219, 0.35)",
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: "0.78rem",
                              fontWeight: 700,
                            }}
                          >
                            <Clock size={13} /> Review Pending
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "rgba(243, 156, 18, 0.15)",
                              color: "#f39c12",
                              border: "1px solid rgba(243, 156, 18, 0.35)",
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: "0.78rem",
                              fontWeight: 700,
                            }}
                          >
                            <Hourglass size={13} /> Pending
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => openEvaluationModal(c)}
                          style={{
                            background: status === "REVIEW_PENDING" ? "var(--primary-gold, #d2a100)" : "rgba(255, 255, 255, 0.08)",
                            color: status === "REVIEW_PENDING" ? "#000" : "#fff",
                            border: "none",
                            borderRadius: 6,
                            padding: "8px 16px",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Eye size={14} />
                          {status === "COMPLETED" ? "View / Edit Review" : "Evaluate & Feedback"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= EVALUATION MODAL ================= */}
      {evalModalCandidate && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(8px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "36px 20px 60px",
            overflowY: "auto",
            overflowX: "hidden",
          }}
          onClick={() => setEvalModalCandidate(null)}
        >
          <div
            style={{
              background: "#141416",
              border: "1px solid rgba(210, 161, 0, 0.3)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "1040px",
              boxShadow: "0 30px 80px rgba(0, 0, 0, 0.9)",
              color: "#fff",
              position: "relative",
              margin: "0 auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 28px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>
                    Speech Evaluation: {evalModalCandidate.name}
                  </h3>
                  {evalModalCandidate.submission?.status === "COMPLETED" ? (
                    <span style={{ background: "rgba(46, 204, 113, 0.15)", color: "#2ecc71", padding: "3px 10px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700 }}>
                      Completed
                    </span>
                  ) : evalModalCandidate.submission?.status === "REVIEW_PENDING" ? (
                    <span style={{ background: "rgba(52, 152, 219, 0.15)", color: "#3498db", padding: "3px 10px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700 }}>
                      Review Pending (Both Videos Ready)
                    </span>
                  ) : (
                    <span style={{ background: "rgba(243, 156, 18, 0.15)", color: "#f39c12", padding: "3px 10px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700 }}>
                      Pending Submissions
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
                  {evalModalCandidate.email} • {evalModalCandidate.phone} • {currentBatch?.title || "Soft Skills Batch"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEvalModalCandidate(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#aaa",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 26 }}>
              {/* Notice if both videos are ready */}
              {evalModalCandidate.submission?.video1Id && evalModalCandidate.submission?.video2Id ? (
                <div style={{ background: "rgba(46, 204, 113, 0.1)", border: "1px solid rgba(46, 204, 113, 0.3)", borderRadius: 10, padding: "12px 16px", color: "#2ecc71", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle size={18} />
                  <span>Both the Baseline and Final Capstone videos are submitted! Compare the progression below and provide your evaluation remarks.</span>
                </div>
              ) : (
                <div style={{ background: "rgba(243, 156, 18, 0.1)", border: "1px solid rgba(243, 156, 18, 0.3)", borderRadius: 10, padding: "12px 16px", color: "#f39c12", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 10 }}>
                  <AlertCircle size={18} />
                  <span>
                    {!evalModalCandidate.submission?.video1Id && !evalModalCandidate.submission?.video2Id
                      ? "Neither video has been submitted yet by the student."
                      : !evalModalCandidate.submission?.video2Id
                      ? "Video 1 is submitted, but Video 2 has not been submitted yet. Feedback is typically written once both videos are submitted."
                      : "Video 1 is missing."}
                  </span>
                </div>
              )}

              {/* Side-by-Side Videos */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 24 }}>
                {/* Video 1 Box */}
                <div style={{ background: "#1b1b1e", borderRadius: 12, padding: "18px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "var(--primary-gold, #d2a100)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>
                        Video 1 • Day 1
                      </span>
                      <h4 style={{ margin: "2px 0 0", fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>
                        Baseline Self-Introduction
                      </h4>
                    </div>

                    {evalModalCandidate.submission?.video1Id ? (
                      <span style={{ color: "#2ecc71", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle size={13} /> Submitted
                      </span>
                    ) : (
                      <span style={{ color: "#888", fontSize: "0.78rem", fontWeight: 600 }}>
                        Awaiting Upload
                      </span>
                    )}
                  </div>

                  {evalModalCandidate.submission?.video1Id ? (
                    <div>
                      <div
                        style={{
                          position: "relative",
                          paddingBottom: "56.25%",
                          height: 0,
                          borderRadius: 8,
                          overflow: "hidden",
                          background: "#000",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <iframe
                          src={getYouTubeEmbedUrl(evalModalCandidate.submission.video1Id) || ""}
                          title="Baseline Introduction Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: "0.75rem", color: "#888" }}>
                        <span>Submitted: {evalModalCandidate.submission.video1SubmittedAt ? new Date(evalModalCandidate.submission.video1SubmittedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Yes"}</span>
                        <a href={evalModalCandidate.submission.video1Url} target="_blank" rel="noreferrer" style={{ color: "var(--primary-gold, #d2a100)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          Watch on YouTube <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center", background: "#111", borderRadius: 8, border: "1px dashed rgba(255, 255, 255, 0.1)", color: "#666", fontSize: "0.85rem" }}>
                      No video submitted by student yet.
                    </div>
                  )}
                </div>

                {/* Video 2 Box */}
                <div style={{ background: "#1b1b1e", borderRadius: 12, padding: "18px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "var(--primary-gold, #d2a100)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>
                        Video 2 • Week 4
                      </span>
                      <h4 style={{ margin: "2px 0 0", fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>
                        Exit Capstone Speech
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleIndividualUnlock(evalModalCandidate)}
                      disabled={togglingUnlock}
                      style={{
                        background: evalModalCandidate.submission?.video2Unlocked ? "rgba(46, 204, 113, 0.15)" : "rgba(255, 255, 255, 0.08)",
                        color: evalModalCandidate.submission?.video2Unlocked ? "#2ecc71" : "#aaa",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      {evalModalCandidate.submission?.video2Unlocked ? <Unlock size={12} /> : <Lock size={12} />}
                      {evalModalCandidate.submission?.video2Unlocked ? "Unlocked" : "Locked (Click to Unlock)"}
                    </button>
                  </div>

                  {evalModalCandidate.submission?.video2Id ? (
                    <div>
                      <div
                        style={{
                          position: "relative",
                          paddingBottom: "56.25%",
                          height: 0,
                          borderRadius: 8,
                          overflow: "hidden",
                          background: "#000",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <iframe
                          src={getYouTubeEmbedUrl(evalModalCandidate.submission.video2Id) || ""}
                          title="Exit Capstone Speech Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: "0.75rem", color: "#888" }}>
                        <span>Submitted: {evalModalCandidate.submission.video2SubmittedAt ? new Date(evalModalCandidate.submission.video2SubmittedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Yes"}</span>
                        <a href={evalModalCandidate.submission.video2Url} target="_blank" rel="noreferrer" style={{ color: "var(--primary-gold, #d2a100)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          Watch on YouTube <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center", background: "#111", borderRadius: 8, border: "1px dashed rgba(255, 255, 255, 0.1)", color: "#666", fontSize: "0.85rem", flexDirection: "column", gap: 6 }}>
                      {evalModalCandidate.submission?.video2Unlocked ? (
                        <>
                          <Unlock size={22} style={{ color: "#3498db" }} />
                          <span>Unlocked. Awaiting student final speech upload.</span>
                        </>
                      ) : (
                        <>
                          <Lock size={22} style={{ color: "#666" }} />
                          <span>Locked. Click &quot;Locked (Click to Unlock)&quot; above to allow submission.</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Assessor Feedback Textarea Box */}
              <div style={{ background: "#1b1b1e", borderRadius: 12, padding: "20px", border: "1px solid rgba(210, 161, 0, 0.25)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <MessageSquare size={18} style={{ color: "var(--primary-gold, #d2a100)" }} />
                  <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>
                    Mentor Evaluation Remarks &amp; Feedback
                  </h4>
                </div>
                <p style={{ margin: "0 0 14px", color: "#888", fontSize: "0.82rem" }}>
                  Write your comprehensive feedback on the student&apos;s progression: evaluate pronunciation, pace, body language, pause management, confidence, and capstone keynote delivery.
                </p>

                <textarea
                  rows={6}
                  placeholder="e.g. Excellent progress from Day 1 to Week 4. Noticeable reduction in filler words, firmer eye contact, and much clearer syllable stress. Continue to practice pauses during rapid transitions..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#111",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 8,
                    padding: "14px",
                    color: "#fff",
                    fontSize: "0.92rem",
                    lineHeight: 1.6,
                    resize: "vertical",
                  }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                  {evalModalCandidate.submission?.reviewedAt ? (
                    <span style={{ fontSize: "0.78rem", color: "#2ecc71", display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle size={14} /> Feedback published on {new Date(evalModalCandidate.submission.reviewedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.78rem", color: "#888" }}>
                      Once saved, the status will move to Completed and feedback will appear in the student&apos;s dashboard.
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveFeedback}
                    disabled={savingFeedback}
                    style={{
                      background: "var(--primary-gold, #d2a100)",
                      color: "#000",
                      border: "none",
                      borderRadius: 6,
                      padding: "10px 24px",
                      fontWeight: 800,
                      fontSize: "0.88rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Save size={16} />
                    {savingFeedback ? "Publishing..." : "Save & Publish Feedback"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
