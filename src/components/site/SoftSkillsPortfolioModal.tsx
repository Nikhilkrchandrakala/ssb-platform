"use client";

import React, { useState, useEffect } from "react";
import {
  FaTimes,
  FaVideo,
  FaLock,
  FaUnlock,
  FaCheckCircle,
  FaClock,
  FaHourglassHalf,
  FaExternalLinkAlt,
  FaEdit,
  FaQuoteLeft,
  FaYoutube,
} from "react-icons/fa";
import toast from "react-hot-toast";
import { getYouTubeEmbedUrl, extractYouTubeVideoId } from "@/lib/youtube";

export interface SoftSkillsSubmissionData {
  _id?: string;
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
}

interface SoftSkillsPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: {
    _id: string;
    title?: string;
    batchNo?: string;
    startTime?: string;
  };
}

export default function SoftSkillsPortfolioModal({
  isOpen,
  onClose,
  slot,
}: SoftSkillsPortfolioModalProps) {
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<SoftSkillsSubmissionData | null>(null);

  // Video 1 form state
  const [video1Input, setVideo1Input] = useState("");
  const [editingVideo1, setEditingVideo1] = useState(false);
  const [submittingV1, setSubmittingV1] = useState(false);

  // Video 2 form state
  const [video2Input, setVideo2Input] = useState("");
  const [editingVideo2, setEditingVideo2] = useState(false);
  const [submittingV2, setSubmittingV2] = useState(false);

  const fetchSubmission = async () => {
    if (!slot?._id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/student/softskills/submission?slotId=${slot._id}`);
      if (!res.ok) throw new Error("Failed to load portfolio details");
      const data = await res.json();
      setSubmission(data.submission);
      if (data.submission?.video1Url) setVideo1Input(data.submission.video1Url);
      if (data.submission?.video2Url) setVideo2Input(data.submission.video2Url);
    } catch (err) {
      console.error(err);
      toast.error("Could not load your submission details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSubmission();
    }
  }, [isOpen, slot?._id]);

  if (!isOpen) return null;

  const handleVideoSubmit = async (videoNumber: 1 | 2) => {
    const rawUrl = videoNumber === 1 ? video1Input : video2Input;
    if (!rawUrl || !rawUrl.trim()) {
      toast.error("Please enter a valid YouTube link.");
      return;
    }

    const videoId = extractYouTubeVideoId(rawUrl);
    if (!videoId) {
      toast.error("Invalid YouTube URL. Please provide a standard watch or youtu.be link.");
      return;
    }

    if (videoNumber === 1) setSubmittingV1(true);
    else setSubmittingV2(true);

    try {
      const res = await fetch("/api/student/softskills/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: slot._id,
          videoNumber,
          videoUrl: rawUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit video URL");

      setSubmission(data.submission);
      if (videoNumber === 1) setEditingVideo1(false);
      else setEditingVideo2(false);

      toast.success(
        videoNumber === 1
          ? "Video 1 (Baseline Speech) submitted successfully!"
          : "Video 2 (Final Capstone Speech) submitted successfully!"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to submit video.");
    } finally {
      if (videoNumber === 1) setSubmittingV1(false);
      else setSubmittingV2(false);
    }
  };

  const getStatusBadge = () => {
    if (!submission) return null;
    if (submission.status === "COMPLETED") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(46, 204, 113, 0.15)",
            color: "#2ecc71",
            border: "1px solid rgba(46, 204, 113, 0.35)",
            padding: "4px 12px",
            borderRadius: 999,
            fontSize: "0.82rem",
            fontWeight: 700,
          }}
        >
          <FaCheckCircle /> Completed
        </span>
      );
    }
    if (submission.status === "REVIEW_PENDING") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(52, 152, 219, 0.15)",
            color: "#3498db",
            border: "1px solid rgba(52, 152, 219, 0.35)",
            padding: "4px 12px",
            borderRadius: 999,
            fontSize: "0.82rem",
            fontWeight: 700,
          }}
        >
          <FaClock /> Review Pending
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(243, 156, 18, 0.15)",
          color: "#f39c12",
          border: "1px solid rgba(243, 156, 18, 0.35)",
          padding: "4px 12px",
          borderRadius: 999,
          fontSize: "0.82rem",
          fontWeight: 700,
        }}
      >
        <FaHourglassHalf /> Pending
      </span>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#131315",
          border: "1px solid rgba(210, 161, 0, 0.25)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "960px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(210, 161, 0, 0.1)",
          color: "#fff",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px 18px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
                <FaVideo style={{ color: "var(--primary-gold, #d2a100)" }} />
                Speech Portfolio &amp; Videos
              </h2>
              {getStatusBadge()}
            </div>
            <p style={{ margin: 0, color: "#a0a0a0", fontSize: "0.88rem" }}>
              {slot.title || "4 Weeks Soft Skills Bootcamp"} {slot.batchNo ? `(#${slot.batchNo})` : ""}
            </p>
          </div>

          <button
            onClick={onClose}
            type="button"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ccc",
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            title="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "28px", flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
              <FaHourglassHalf style={{ fontSize: 28, animation: "spin 1.5s infinite linear", marginBottom: 12 }} />
              <p>Loading your submission details...</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {/* Mentor Feedback Banner (if completed or feedback exists) */}
              {submission?.feedback ? (
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(210, 161, 0, 0.15) 0%, rgba(210, 161, 0, 0.05) 100%)",
                    border: "1px solid rgba(210, 161, 0, 0.4)",
                    borderRadius: 14,
                    padding: "22px 24px",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <FaQuoteLeft style={{ color: "var(--primary-gold, #d2a100)", fontSize: "1.2rem" }} />
                    <h4 style={{ margin: 0, color: "var(--primary-gold, #d2a100)", fontSize: "1.05rem", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Mentor Feedback &amp; Evaluation
                    </h4>
                  </div>
                  <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.95)", fontSize: "0.95rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {submission.feedback}
                  </p>
                  {submission.reviewedAt && (
                    <div style={{ marginTop: 14, fontSize: "0.78rem", color: "#aaa" }}>
                      Evaluated on: {new Date(submission.reviewedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  )}
                </div>
              ) : submission?.status === "REVIEW_PENDING" ? (
                <div
                  style={{
                    background: "rgba(52, 152, 219, 0.1)",
                    border: "1px solid rgba(52, 152, 219, 0.3)",
                    borderRadius: 12,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <FaClock style={{ color: "#3498db", fontSize: "1.2rem", flexShrink: 0 }} />
                  <p style={{ margin: 0, color: "#d2e5f5", fontSize: "0.9rem", lineHeight: 1.5 }}>
                    <strong>Both videos have been submitted!</strong> Your mentor is currently reviewing your speeches and will publish your comparative feedback once evaluated.
                  </p>
                </div>
              ) : null}

              {/* Two Videos Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
                  gap: 24,
                }}
              >
                {/* ================= VIDEO 1: BASELINE ================= */}
                <div
                  style={{
                    background: "#18181b",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 14,
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--primary-gold, #d2a100)", letterSpacing: "1px", textTransform: "uppercase" }}>
                        Milestone 01 • Day 1
                      </span>
                      <h4 style={{ margin: "4px 0 0", fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                        Baseline Introduction Video
                      </h4>
                    </div>

                    {submission?.video1Id ? (
                      <span style={{ color: "#2ecc71", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                        <FaCheckCircle /> Submitted
                      </span>
                    ) : (
                      <span style={{ color: "#f39c12", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                        <FaHourglassHalf /> Pending
                      </span>
                    )}
                  </div>

                  <p style={{ color: "#9ca3af", fontSize: "0.82rem", lineHeight: 1.5, margin: "0 0 16px" }}>
                    Record an unlisted 60–90 second self-introduction on YouTube before classes start. This establishes your baseline benchmark.
                  </p>

                  {/* Player or Submission Input */}
                  {submission?.video1Id && !editingVideo1 ? (
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
                          src={getYouTubeEmbedUrl(submission.video1Id) || ""}
                          title="Baseline Introduction Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            border: "none",
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                        <span style={{ fontSize: "0.75rem", color: "#888" }}>
                          Submitted: {submission.video1SubmittedAt ? new Date(submission.video1SubmittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Yes"}
                        </span>
                        {submission.status !== "COMPLETED" && (
                          <button
                            type="button"
                            onClick={() => setEditingVideo1(true)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--primary-gold, #d2a100)",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <FaEdit /> Edit Link
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ position: "relative" }}>
                          <input
                            type="text"
                            placeholder="e.g. https://youtu.be/XYZ123 or unlisted watch URL"
                            value={video1Input}
                            onChange={(e) => setVideo1Input(e.target.value)}
                            style={{
                              width: "100%",
                              background: "rgba(0, 0, 0, 0.5)",
                              border: "1px solid rgba(255, 255, 255, 0.18)",
                              borderRadius: 8,
                              color: "#fff",
                              padding: "10px 14px 10px 36px",
                              fontSize: "0.88rem",
                            }}
                          />
                          <FaYoutube style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444" }} />
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleVideoSubmit(1)}
                            disabled={submittingV1}
                            style={{
                              flex: 1,
                              background: "var(--primary-gold, #d2a100)",
                              color: "#000",
                              border: "none",
                              borderRadius: 6,
                              padding: "10px",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              cursor: "pointer",
                            }}
                          >
                            {submittingV1 ? "Submitting..." : submission?.video1Id ? "Update Link" : "Submit Video 1"}
                          </button>

                          {editingVideo1 && (
                            <button
                              type="button"
                              onClick={() => setEditingVideo1(false)}
                              style={{
                                background: "rgba(255, 255, 255, 0.08)",
                                color: "#ccc",
                                border: "1px solid rgba(255, 255, 255, 0.15)",
                                borderRadius: 6,
                                padding: "10px 16px",
                                fontSize: "0.85rem",
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: 12, fontSize: "0.74rem", color: "#777", lineHeight: 1.4 }}>
                        💡 Tip: Make sure your YouTube video is set to <strong>Unlisted</strong> so only you and your mentor can watch it.
                      </div>
                    </div>
                  )}
                </div>

                {/* ================= VIDEO 2: CAPSTONE ================= */}
                <div
                  style={{
                    background: "#18181b",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 14,
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--primary-gold, #d2a100)", letterSpacing: "1px", textTransform: "uppercase" }}>
                        Milestone 02 • Week 4
                      </span>
                      <h4 style={{ margin: "4px 0 0", fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                        Exit Capstone Speech Video
                      </h4>
                    </div>

                    {!submission?.video2Unlocked ? (
                      <span style={{ color: "#888", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                        <FaLock /> Locked
                      </span>
                    ) : submission?.video2Id ? (
                      <span style={{ color: "#2ecc71", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                        <FaCheckCircle /> Submitted
                      </span>
                    ) : (
                      <span style={{ color: "#3498db", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                        <FaUnlock /> Unlocked
                      </span>
                    )}
                  </div>

                  <p style={{ color: "#9ca3af", fontSize: "0.82rem", lineHeight: 1.5, margin: "0 0 16px" }}>
                    Your final 5-minute capstone speech video showcasing your transformed poise, articulation, and presence.
                  </p>

                  {/* Locked State vs Active Form / Player */}
                  {!submission?.video2Unlocked ? (
                    <div
                      style={{
                        background: "rgba(0, 0, 0, 0.35)",
                        border: "1px dashed rgba(255, 255, 255, 0.15)",
                        borderRadius: 10,
                        padding: "36px 20px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 12,
                        minHeight: "200px",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: "rgba(255, 255, 255, 0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#aaa",
                          fontSize: "1.1rem",
                        }}
                      >
                        <FaLock />
                      </div>
                      <h5 style={{ margin: 0, fontSize: "0.95rem", color: "#ccc", fontWeight: 600 }}>
                        Submission Currently Locked
                      </h5>
                      <p style={{ margin: 0, color: "#777", fontSize: "0.8rem", maxWidth: "320px", lineHeight: 1.5 }}>
                        Your mentor will unlock this second submission towards the end of Week 4 after you complete your speech drills.
                      </p>
                    </div>
                  ) : submission?.video2Id && !editingVideo2 ? (
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
                          src={getYouTubeEmbedUrl(submission.video2Id) || ""}
                          title="Exit Capstone Speech Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            border: "none",
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                        <span style={{ fontSize: "0.75rem", color: "#888" }}>
                          Submitted: {submission.video2SubmittedAt ? new Date(submission.video2SubmittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Yes"}
                        </span>
                        {submission.status !== "COMPLETED" && (
                          <button
                            type="button"
                            onClick={() => setEditingVideo2(true)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--primary-gold, #d2a100)",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <FaEdit /> Edit Link
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ position: "relative" }}>
                          <input
                            type="text"
                            placeholder="e.g. https://youtu.be/ABC456 or unlisted watch URL"
                            value={video2Input}
                            onChange={(e) => setVideo2Input(e.target.value)}
                            style={{
                              width: "100%",
                              background: "rgba(0, 0, 0, 0.5)",
                              border: "1px solid rgba(255, 255, 255, 0.18)",
                              borderRadius: 8,
                              color: "#fff",
                              padding: "10px 14px 10px 36px",
                              fontSize: "0.88rem",
                            }}
                          />
                          <FaYoutube style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444" }} />
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleVideoSubmit(2)}
                            disabled={submittingV2}
                            style={{
                              flex: 1,
                              background: "var(--primary-gold, #d2a100)",
                              color: "#000",
                              border: "none",
                              borderRadius: 6,
                              padding: "10px",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              cursor: "pointer",
                            }}
                          >
                            {submittingV2 ? "Submitting..." : submission?.video2Id ? "Update Link" : "Submit Video 2"}
                          </button>

                          {editingVideo2 && (
                            <button
                              type="button"
                              onClick={() => setEditingVideo2(false)}
                              style={{
                                background: "rgba(255, 255, 255, 0.08)",
                                color: "#ccc",
                                border: "1px solid rgba(255, 255, 255, 0.15)",
                                borderRadius: 6,
                                padding: "10px 16px",
                                fontSize: "0.85rem",
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: 12, fontSize: "0.74rem", color: "#777", lineHeight: 1.4 }}>
                        💡 Tip: Once you submit Video 2, your submission will automatically move to <strong>Review Pending</strong> for your mentor to evaluate both videos.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
