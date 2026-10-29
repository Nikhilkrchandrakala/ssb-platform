"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { UserProfile, Assessment, AssessmentSubmission } from "../../types";
import { assessorLabel } from "@/lib/assessorLabels";
import { latestDistinctValues } from "@/lib/latestValues";
import { Plus, Trash2, Edit2, Database, Play, Eye, X, CheckCircle, Send, Copy, UploadCloud, FileUp, Video, MessageSquare, Loader2 } from "lucide-react";
import {
  PageHeader, Badge, Card, GlassCard, Button, IconButton, TableShell, Th, Td, Tr, EmptyState,
  Reveal, Skeleton, staggerDelay, Dialog, DialogContent, DialogTitle, SegmentedControl,
} from "../../components/ui/Primitives";
import SearchCombobox from "../../components/ui/SearchCombobox";
import { useDocumentPip, PipContent, FileGallery, resolveFileUrl, isPdfPath } from "../../components/ui/DocumentPipViewer";
import { cn } from "../../lib/utils";

// Ported from psych_battery/src/pages/AdminDashboard.tsx.
//
// Legacy-only fixes made while porting:
// - Dropped `assignAssessor` (defined in the legacy file but never wired to
//   any button/handler — dead code, would trip no-unused-vars here).
// - Dropped unused lucide icon imports (Layers, UserPlus, ArrowRight,
//   AlertCircle, Lock, Unlock) that legacy imported but never rendered.
//
// Assessor-only fields (gtoStatus/ioStatus/toStatus/*Remarks) aren't on the
// shared AssessmentSubmission type (they're populated ad hoc by the
// /api/psych/submissions route), so they're accessed through a local
// extension type instead of legacy's `as any`.
type SubmissionWithAssessorFields = AssessmentSubmission & {
  gtoStatus?: string;
  ioStatus?: string;
  toStatus?: string;
  gtoRemarks?: string;
  ioRemarks?: string;
  toRemarks?: string;
};

type AssessorScores = Record<string, number> & { marks?: number };

const psychTraits = [
  { id: "effective_intelligence", code: "EI", name: "Effective Intelligence" },
  { id: "reasoning_ability", code: "RA", name: "Reasoning Ability" },
  { id: "organizing_ability", code: "OA", name: "Organizing Ability" },
  { id: "power_of_expression", code: "POE", name: "Power of Expression" },
  { id: "social_adaptability", code: "SA", name: "Social Adaptability" },
  { id: "cooperation", code: "COOP", name: "Cooperation" },
  { id: "sense_of_responsibility", code: "SOR", name: "Sense of Responsibility" },
  { id: "initiative", code: "INIT", name: "Initiative" },
  { id: "self_confidence", code: "SC", name: "Self Confidence" },
  { id: "speed_of_decision", code: "SOD", name: "Speed of Decision" },
  { id: "ability_to_influence_the_group", code: "AIG", name: "Influence Group" },
  { id: "liveliness", code: "LIV", name: "Liveliness" },
  { id: "determination", code: "D", name: "Determination" },
  { id: "courage", code: "C", name: "Courage" },
  { id: "stamina", code: "S", name: "Stamina" },
];

const ASSESSOR_TRAITS_CONFIG = {
  Psych: psychTraits,
  GTO: psychTraits,
  IO: psychTraits,
  TO: psychTraits,
};

const gridConfig = {
  factors: [
    { label: <>FACTOR I:<br />PLANNING &amp; ORGANIZING</>, colSpan: 4 },
    { label: <>FACTOR II:<br />SOCIAL ADJUSTMENT</>, colSpan: 3 },
    { label: <>FACTOR III:<br />SOCIAL EFFECTIVENESS</>, colSpan: 5 },
    { label: <>FACTOR IV:<br />DYNAMIC</>, colSpan: 3 },
  ],
  traits: psychTraits,
};

function formatUploadedAt(value: unknown): string {
  if (!value) return "time not recorded";
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return "time not recorded";
  return `uploaded ${d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
}

// One tracked step (PIQ 1 / PIQ 2 / Dossier) in the Candidate Step column.
// Clicking an uploaded step fires a brief ping-ring animation, then opens
// its file(s) via the caller's onOpen (picture-in-picture viewer).
function StepDot({ label, uploaded, uploadedAt, onOpen }: { label: string; uploaded: boolean; uploadedAt?: unknown; onOpen: () => void }) {
  const [pulsing, setPulsing] = useState(false);

  return (
    <button
      type="button"
      disabled={!uploaded}
      onClick={() => {
        if (!uploaded) return;
        setPulsing(true);
        window.setTimeout(() => setPulsing(false), 700);
        onOpen();
      }}
      title={uploaded ? `${label}: ${formatUploadedAt(uploadedAt)} — click to view` : `${label}: not uploaded yet`}
      className={cn(
        "flex flex-col items-center gap-1 group bg-transparent border-0 p-0",
        uploaded ? "cursor-pointer" : "cursor-default"
      )}
    >
      <span className="relative flex items-center justify-center w-3 h-3">
        {pulsing && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />}
        <span
          className={cn(
            "relative inline-flex w-2.5 h-2.5 rounded-full transition-transform",
            uploaded ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] group-hover:scale-125" : "bg-app-border"
          )}
        />
      </span>
      <span className={cn("text-[9px] font-bold uppercase tracking-widest", uploaded ? "text-emerald-400" : "text-app-text-muted")}>{label}</span>
    </button>
  );
}

export default function AdminDashboardView({ tab }: { tab?: string }) {
  const router = useRouter();
  const activeTab = tab === "catalogue" ? "assessments" : "assignments";

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithAssessorFields[]>([]);
  const [loading, setLoading] = useState(true);

  // Candidate Evaluation table filters (name / batch no / chest no / status).
  const [nameFilter, setNameFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [chestNoFilter, setChestNoFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");

  // Super Admin Auditing State
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithAssessorFields | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);

  // Candidate Step tracker (PIQ 1 / PIQ 2 / Dossier) — which step's uploaded
  // file(s) are currently open in the picture-in-picture viewer, plus the
  // imperative PiP controller (its `request()` must be called synchronously
  // from the dot's onClick — see useDocumentPip's doc comment).
  const [pipTarget, setPipTarget] = useState<{ submission: SubmissionWithAssessorFields; step: "piq1" | "piq2" | "dossier" } | null>(null);
  const pip = useDocumentPip();

  // Admin Direct Dossier Upload Modal State
  const [uploadTarget, setUploadTarget] = useState<SubmissionWithAssessorFields | null>(null);
  const [uploadMode, setUploadMode] = useState<"LIVE_CALL" | "DIRECT_UPLOAD">("LIVE_CALL");
  const [uploadNotes, setUploadNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingDossier, setUploadingDossier] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAdminDossierUpload = async () => {
    if (!uploadTarget) return;
    if (selectedFiles.length === 0) {
      alert("Please select at least one file to upload.");
      return;
    }

    const nonPdf = selectedFiles.filter(
      (f) => f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")
    );
    if (nonPdf.length > 0) {
      alert("Only PDF files are accepted for dossiers. Images are not allowed.");
      return;
    }

    const maxLimit = 5 * 1024 * 1024;
    const oversized = selectedFiles.filter((f) => f.size > maxLimit);
    if (oversized.length > 0) {
      alert(`File size exceeds 5 MB limit: ${oversized.map((f) => f.name).join(", ")}`);
      return;
    }

    setUploadingDossier(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      formData.append("testConductedVia", uploadMode);
      if (uploadNotes.trim()) {
        formData.append("notes", uploadNotes.trim());
      }

      const subId = uploadTarget.id || (uploadTarget as unknown as { _id?: string })._id;
      const res = await fetch(`/api/psych/submissions/${subId}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to upload dossier");

      alert("Dossier uploaded successfully!");
      setUploadTarget(null);
      setSelectedFiles([]);
      setUploadNotes("");

      // Refresh data
      const [usersList, assessmentsList, submissionsList] = await Promise.all([
        api.users.list(),
        api.assessments.list(),
        api.submissions.list(),
      ]);
      setUsers(usersList);
      setAssessments(assessmentsList);
      setSubmissions(submissionsList);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to upload dossier.");
    } finally {
      setUploadingDossier(false);
    }
  };

  // Legacy gated this fetch behind `if (!isAdminUser) return;` inside the
  // effect — but that early return sat *before* the `finally` that clears
  // `loading`, so a non-admin viewer would spin forever (harmless there only
  // because ProtectedRoute requireAdmin already kept non-admins out). Here
  // requirePsychAdmin() in page.tsx gates server-side before this component
  // ever mounts, so the client-side re-check (and its bug) is dropped.
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.users.list(), api.assessments.list(), api.submissions.list()])
      .then(([usersList, assessmentsList, submissionsList]) => {
        if (cancelled) return;
        setUsers(usersList);
        setAssessments(assessmentsList);
        setSubmissions(submissionsList);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to fetch admin data:", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBroadcastSub = async (submissionId: string) => {
    setBroadcasting(true);
    try {
      const response = await api.submissions.broadcast(submissionId);
      const updatedSub = response.submission;

      setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? { ...s, ...updatedSub } : s)));
      setSelectedSubmission((prev) => (prev && prev.id === submissionId ? { ...prev, ...updatedSub } : prev));
      alert("Success! All qualitative written feedback comments have been successfully broadcasted to the candidate.");
    } catch (err) {
      console.error("Failed to broadcast results:", err);
      alert(err instanceof Error ? err.message : "Failed to broadcast results.");
    } finally {
      setBroadcasting(false);
    }
  };

  const createAssessment = async () => {
    try {
      const newAssessment = {
        title: "New Protocol",
        description: "Describe the purpose of this psychological battery.",
        type: "GENERAL",
        instructions: "Follow the on-screen instructions.",
        duration: 30,
        active: false,
      };

      const created = await api.assessments.create(newAssessment);
      router.push(`/psych-battery/admin/assessment/${created.id}`);
    } catch (error) {
      console.error("Failed to create assessment:", error);
    }
  };

  const deleteAssessment = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this assessment? This action cannot be undone.")) return;
    try {
      await api.assessments.delete(id);
      setAssessments((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Failed to delete assessment:", error);
      alert("Failed to delete assessment.");
    }
  };

  const toggleAssessmentActive = async (id: string, currentActive: boolean) => {
    try {
      const updated = await api.assessments.update(id, { active: !currentActive });
      setAssessments((prev) => prev.map((a) => (a.id === id ? { ...a, active: updated.active } : a)));
    } catch (error) {
      console.error("Failed to toggle assessment status:", error);
      alert("Failed to update assessment status.");
    }
  };

  const duplicateAssessment = async (id: string) => {
    if (!window.confirm("Are you sure you want to duplicate this assessment?")) return;
    try {
      const newAssessment = await api.assessments.duplicate(id);
      setAssessments((prev) => [...prev, newAssessment]);
    } catch (error) {
      console.error("Failed to duplicate assessment:", error);
      alert("Failed to duplicate assessment.");
    }
  };

  const resolveStudent = (s: SubmissionWithAssessorFields) =>
    (s.student as UserProfile | undefined) || users.find((u) => u.uid === s.userId) || users.find((u) => u.id === s.userId);

  const evaluationStudents = useMemo(
    () => submissions.map((s) => (s.student as UserProfile | undefined) || users.find((u) => u.uid === s.userId) || users.find((u) => u.id === s.userId)),
    [submissions, users]
  );
  const nameOptions = useMemo(
    () => latestDistinctValues(evaluationStudents, (s) => s?.name, (s) => s?.createdAt as string | undefined),
    [evaluationStudents]
  );
  const batchOptions = useMemo(
    () => latestDistinctValues(evaluationStudents, (s) => s?.batch, (s) => s?.createdAt as string | undefined),
    [evaluationStudents]
  );
  const chestNoOptions = useMemo(
    () => latestDistinctValues(evaluationStudents, (s) => s?.chestNo, (s) => s?.createdAt as string | undefined),
    [evaluationStudents]
  );

  const isSubmissionCompleted = (s: SubmissionWithAssessorFields) =>
    s.status === "COMPLETED" || s.status === "REPORT_RELEASED";

  const filteredSubmissions = submissions.filter((s) => {
    const student = resolveStudent(s);
    if (nameFilter.trim() && !(student?.name || "").toLowerCase().includes(nameFilter.trim().toLowerCase())) return false;
    if (batchFilter.trim() && !(student?.batch || "").toLowerCase().includes(batchFilter.trim().toLowerCase())) return false;
    if (chestNoFilter.trim() && !(student?.chestNo || "").toLowerCase().includes(chestNoFilter.trim().toLowerCase())) return false;
    if (statusFilter === "PENDING" && isSubmissionCompleted(s)) return false;
    if (statusFilter === "COMPLETED" && !isSubmissionCompleted(s)) return false;
    return true;
  });

  if (loading)
    return (
      <div className="space-y-8 pb-20">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        eyebrow="Privileged Access"
        title="Admin Nexus"
        description="Global protocol control, user management, and assessor progress monitoring."
      />

      {activeTab === "assessments" && (
        <div className="space-y-5 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-app-text-bright uppercase tracking-widest">Assessment Catalogue</h3>
            <Button variant="primary" icon={Plus} onClick={createAssessment}>
              New Assessment Battery
            </Button>
          </div>

          {assessments.length === 0 ? (
            <Card><EmptyState icon={Database} title="No assessments yet" description="Create your first assessment battery to get started." /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {assessments.map((a, index) => (
                <GlassCard key={a.id} className="group">
                  <Reveal delay={staggerDelay(index)} className="p-6">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-app-accent/15 rounded-xl">
                      <Database size={20} className="text-app-accent-light" />
                    </div>
                    <button type="button" onClick={() => toggleAssessmentActive(a.id!, !!a.active)} className="cursor-pointer transition-transform hover:scale-105 active:scale-95" title={`Click to ${a.active ? "disable" : "enable"} this battery`}><Badge tone={a.active ? "success" : "danger"}>{a.active ? "Operational" : "Disabled"}</Badge></button>
                  </div>
                  <h4 className="text-lg font-bold text-app-text-bright mb-1.5 tracking-tight">{a.title}</h4>
                  <p className="text-app-text-muted text-xs mb-5 line-clamp-2 leading-relaxed">{a.description}</p>

                  <div className="pt-5 border-t border-app-border flex items-center justify-between">
                    <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">{a.duration} Mins</span>
                    <div className="flex items-center gap-1">
                      <Link href={`/psych-battery/admin/assessment/${a.id}`} className="p-2 text-app-text-muted hover:text-app-text-bright transition-colors" title="Edit Protocol">
                        <Edit2 size={15} />
                      </Link>
                      <Link href={`/psych-battery/assessment/${a.id}`} className="p-2 text-app-accent hover:text-app-accent-light transition-colors" title="Test Protocol">
                        <Play size={15} />
                      </Link>
                      <button onClick={() => duplicateAssessment(a.id!)} className="p-2 text-app-text-muted hover:text-emerald-400 transition-colors cursor-pointer" title="Duplicate Protocol">
                        <Copy size={15} />
                      </button>
                      <button onClick={() => deleteAssessment(a.id!)} className="p-2 text-app-text-muted hover:text-red-400 transition-colors cursor-pointer" title="Delete Protocol">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  </Reveal>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "assignments" && (
        <div className="space-y-5 animate-in fade-in duration-500">
          {submissions.length === 0 ? (
            <Card><EmptyState icon={Database} title="No candidate assignments yet" /></Card>
          ) : (
            <>
              <Reveal delay={0.1} className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <SearchCombobox placeholder="Filter by name" value={nameFilter} onChange={setNameFilter} options={nameOptions} />
                <SearchCombobox placeholder="Filter by batch no" value={batchFilter} onChange={setBatchFilter} options={batchOptions} containerClassName="sm:max-w-[180px]" />
                <SearchCombobox placeholder="Filter by chest no" value={chestNoFilter} onChange={setChestNoFilter} options={chestNoOptions} containerClassName="sm:max-w-[180px]" />
                <SegmentedControl
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "PENDING", label: "Review Pending" },
                    { value: "COMPLETED", label: "Review Completed" },
                  ]}
                />
              </Reveal>

              {filteredSubmissions.length === 0 ? (
                <Card><EmptyState icon={Database} title="No candidates match your filters" /></Card>
              ) : (
            <TableShell minWidth={1100}>
              <thead>
                <tr>
                  <Th>Candidate</Th>
                  <Th>Batch No</Th>
                  <Th>Chest No</Th>
                  <Th align="center">Candidate Step</Th>
                  <Th align="center">Psych</Th>
                  <Th align="center">GTO</Th>
                  <Th align="center">IO</Th>
                  <Th align="center">TO</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((s) => {
                  const student = resolveStudent(s);
                  const studentName = student?.name || "Unknown Candidate";
                  const studentEmail = student?.email || "N/A";

                  // Candidate Step: PIQ 1 / PIQ 2 / Dossier tracked separately so
                  // admins/owner can see exactly which artifact a candidate
                  // uploaded and when, instead of one collapsed status badge.
                  // piqFiles mixes piq1/piq2 pages in one array — split by the
                  // filename prefix the upload route stamps them with.
                  const allPiqFiles = s.piqFiles || [];
                  const piq1Files = allPiqFiles.filter((f) => f.includes("/piq1_") || !f.includes("/piq2_"));
                  const piq2Files = allPiqFiles.filter((f) => f.includes("/piq2_"));
                  const dossierFiles = s.uploadedFiles || [];

                  const hasPiq1 = piq1Files.length > 0;
                  const hasPiq2 = piq2Files.length > 0;
                  const hasDossier = dossierFiles.length > 0;

                  // Dots rendering helper
                  const renderAssessorDot = (assigned: unknown, statusVal: string, name: string) => {
                    if (!assigned) {
                      return (
                        <div className="flex items-center justify-center" title="Not required for this candidate's course">
                          <span className="w-2.5 h-2.5 bg-app-border rounded-full inline-block" />
                        </div>
                      );
                    }
                    if (statusVal === "COMPLETED") {
                      return (
                        <div className="flex items-center justify-center" title={`${name}: Evaluation Finalized & Locked`}>
                          <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_6px_rgba(52,211,153,0.6)] inline-block" />
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center justify-center" title={`${name}: Assessment Pending`}>
                        <span className="w-2.5 h-2.5 bg-amber-400 rounded-full inline-block" />
                      </div>
                    );
                  };

                  return (
                    <Tr key={s.id}>
                      <Td>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-app-text-bright">{studentName}</span>
                          {s.testConductedVia && s.testConductedVia !== "WEBSITE_TIMED" && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                              title={s.testConductedVia === "LIVE_CALL" ? "Test conducted in live call/meeting" : "Dossier uploaded directly"}
                            >
                              {s.testConductedVia === "LIVE_CALL" ? "Live Call" : "Direct Upload"}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-app-text-muted">{studentEmail}</div>
                      </Td>
                      <Td>
                        <span className="px-1.5 py-0.5 rounded bg-app-card border border-app-border text-[10px] font-bold text-app-text-muted whitespace-nowrap">
                          {student?.batch || "--"}
                        </span>
                      </Td>
                      <Td>
                        <span className="px-1.5 py-0.5 rounded bg-app-card border border-app-border text-[10px] font-bold text-app-text-muted whitespace-nowrap">
                          {student?.chestNo || "--"}
                        </span>
                      </Td>
                      <Td align="center">
                        <div className="flex items-center justify-center gap-4">
                          <StepDot
                            label="PIQ 1"
                            uploaded={hasPiq1}
                            uploadedAt={s.piq1UploadedAt}
                            onOpen={() => {
                              // pip.request() must fire synchronously inside this
                              // click handler — see useDocumentPip's doc comment.
                              pip.request(`${studentName} — PIQ 1`);
                              setPipTarget({ submission: s, step: "piq1" });
                            }}
                          />
                          <StepDot
                            label="PIQ 2"
                            uploaded={hasPiq2}
                            uploadedAt={s.piq2UploadedAt}
                            onOpen={() => {
                              pip.request(`${studentName} — PIQ 2`);
                              setPipTarget({ submission: s, step: "piq2" });
                            }}
                          />
                          <StepDot
                            label="Dossier"
                            uploaded={hasDossier}
                            uploadedAt={s.dossierUploadedAt}
                            onOpen={() => {
                              pip.request(`${studentName} — Dossier`);
                              setPipTarget({ submission: s, step: "dossier" });
                            }}
                          />
                        </div>
                      </Td>
                      <Td align="center">{renderAssessorDot(student?.assignedPsych, s.psychStatus || "PENDING", assessorLabel("Psych"))}</Td>
                      <Td align="center">{renderAssessorDot(student?.assignedGTO, s.gtoStatus || "PENDING", assessorLabel("GTO"))}</Td>
                      <Td align="center">{renderAssessorDot(student?.assignedIO, s.ioStatus || "PENDING", assessorLabel("IO"))}</Td>
                      <Td align="center">{renderAssessorDot(student?.assignedTO, s.toStatus || "PENDING", assessorLabel("TO"))}</Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <IconButton
                            icon={UploadCloud}
                            size={16}
                            onClick={() => {
                              setUploadTarget(s);
                              setUploadMode("LIVE_CALL");
                              setUploadNotes("");
                              setSelectedFiles([]);
                            }}
                            title="Upload Dossier for Candidate (Live Call / DM)"
                          />
                          <IconButton icon={Eye} size={16} onClick={() => setSelectedSubmission(s)} title="Audit Scorecard Details" />
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </TableShell>
              )}
            </>
          )}
        </div>
      )}

      {/* ── SUPER ADMIN AUDIT DETAILS VIEW MODAL ──────────────────────────────── */}
      {selectedSubmission &&
        (() => {
          const s = selectedSubmission;
          const student = (s.student as UserProfile | undefined) || users.find((u) => u.uid === s.userId) || users.find((u) => u.id === s.userId);
          const studentName = student?.name || "Candidate";
          const studentEmail = student?.email || "N/A";

          // Audit broadcast completion check
          const isBroadcasted = s.status === "REPORT_RELEASED";

          const renderAuditAssessorCard = (type: "Psych" | "GTO" | "IO" | "TO", title: string, assignedId: unknown, statusVal: string, remarksVal: string) => {
            if (!assignedId) return null;

            const scoresMap = ((s as unknown as Record<string, AssessorScores | undefined>)[`${type.toLowerCase()}Scores`] || {}) as AssessorScores;
            const traitsList = ASSESSOR_TRAITS_CONFIG[type];
            const traitsScoreEntries = traitsList.filter((t) => scoresMap[t.id] !== undefined && scoresMap[t.id] > 0);
            const finalMarks = scoresMap.marks || 0;

            const isAssessorVisible = s.reportVisibility?.[type.toLowerCase() as "psych" | "io" | "gto" | "to"];

            const handleIndividualBroadcast = async () => {
              if (broadcasting) return;
              setBroadcasting(true);
              try {
                const response = await api.submissions.broadcast(s.id!, { assessorType: type.toLowerCase() });
                const updatedSub = response.submission;
                setSubmissions((prev) => prev.map((item) => (item.id === s.id ? { ...item, ...updatedSub } : item)));
                setSelectedSubmission((prev) => (prev && prev.id === s.id ? { ...prev, ...updatedSub } : prev));
                alert(`Success! ${type.toUpperCase()} qualitative remarks have been released/broadcasted to the candidate.`);
              } catch (err) {
                console.error("Failed to broadcast individual assessor result:", err);
                alert(err instanceof Error ? err.message : "Failed to broadcast result.");
              } finally {
                setBroadcasting(false);
              }
            };

            return (
              <Card className="p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-app-border pb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-app-text-bright tracking-widest">{title}</h4>
                    <span className="text-[10px] font-medium text-app-text-muted block mt-0.5">Assigned evaluator</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {!isBroadcasted && (
                      <Button
                        size="sm"
                        variant={isAssessorVisible ? "secondary" : "primary"}
                        icon={Send}
                        onClick={handleIndividualBroadcast}
                        disabled={broadcasting}
                      >
                        {isAssessorVisible ? "Rebroadcast" : "Broadcast"}
                      </Button>
                    )}
                    <Badge tone={statusVal === "COMPLETED" ? "success" : "warning"}>{statusVal}</Badge>
                  </div>
                </div>

                {/* Written Remarks */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-app-text-muted tracking-widest">Written Remarks &amp; Feedback</span>
                  <div className="bg-app-card border border-app-border p-3.5 rounded-xl max-h-[140px] overflow-y-auto leading-relaxed text-sm text-app-text-bright">
                    {remarksVal ? remarksVal : <span className="text-app-text-muted italic">No qualitative comments recorded yet.</span>}
                  </div>
                </div>

                {/* Ticks and Marks (Grades) */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase text-app-accent tracking-widest block">Scorecard Ticks &amp; Marks</span>
                  {traitsScoreEntries.length > 0 ? (
                    <div className="bg-app-card border border-app-border rounded-xl overflow-x-auto hide-scrollbar">
                      <table className="w-full border-collapse text-left table-fixed min-w-[700px]">
                        <thead>
                          {/* Factor Headers Row */}
                          <tr className="bg-black/25 border-b border-app-border divide-x divide-app-border/40 text-[10px] font-bold text-app-accent uppercase tracking-widest text-center">
                            {gridConfig.factors.map((f, i) => (
                              <th key={i} colSpan={f.colSpan} className="px-1 py-2 leading-tight">
                                {f.label}
                              </th>
                            ))}
                            <th rowSpan={2} className="w-[12%] px-1 py-3 text-center align-middle font-bold text-app-accent bg-app-accent/10 overflow-hidden text-ellipsis whitespace-nowrap">
                              MARKS
                            </th>
                          </tr>
                          {/* OLQ Codes Row */}
                          <tr className="bg-black/10 border-b border-app-border divide-x divide-app-border/40 text-xs font-bold text-app-text-bright uppercase tracking-wider text-center">
                            {gridConfig.traits.map((t) => (
                              <td key={t.id} className="w-[5.8%] px-1 py-2 font-mono text-xs hover:bg-black/20 group relative cursor-help overflow-hidden text-ellipsis whitespace-nowrap">
                                <span className="underline decoration-dotted decoration-app-text-muted/50">{t.code}</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black border border-app-border text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-2xl whitespace-nowrap z-50">
                                  {t.name}
                                </div>
                              </td>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="divide-x divide-app-border/40 hover:bg-black/10 transition-colors">
                            {gridConfig.traits.map((t) => (
                              <td key={t.id} className="p-0.5 text-center">
                                <div className="w-full text-center text-sm font-bold text-app-text-bright py-2 px-0.5">{scoresMap[t.id] ?? 0}</div>
                              </td>
                            ))}
                            <td className="p-0.5 text-center bg-app-accent/12">
                              <div className="w-full text-center text-sm font-bold text-app-accent py-2 px-1 font-mono">{finalMarks}</div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs italic text-app-text-muted bg-app-card p-4 rounded-xl text-center">No numeric traits graded yet.</div>
                  )}
                </div>
              </Card>
            );
          };

          return (
            <Dialog open onOpenChange={(open) => !open && setSelectedSubmission(null)}>
              <DialogContent maxWidth="max-w-6xl" className="flex flex-col">
                {/* Modal Header */}
                <div className="flex justify-between items-start border-b border-app-border p-6 shrink-0">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <DialogTitle className="text-2xl font-black text-app-text-bright tracking-tight">Audit: {studentName}</DialogTitle>
                      <Badge tone="accent">Batch {student?.batch || "--"} · Chest {student?.chestNo || "--"}</Badge>
                    </div>
                    <p className="text-xs text-app-text-muted">{studentEmail}</p>
                  </div>
                  <IconButton icon={X} onClick={() => setSelectedSubmission(null)} />
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 overflow-y-auto flex-grow">
                  {/* Scorecards Grid */}
                  <div className="flex flex-col gap-5">
                    {renderAuditAssessorCard("Psych", `${assessorLabel("Psych")} Report`, student?.assignedPsych, s.psychStatus || "PENDING", s.psychRemarks || "")}
                    {renderAuditAssessorCard("GTO", `${assessorLabel("GTO")} Report`, student?.assignedGTO, s.gtoStatus || "PENDING", s.gtoRemarks || "")}
                    {renderAuditAssessorCard("IO", `${assessorLabel("IO")} Report`, student?.assignedIO, s.ioStatus || "PENDING", s.ioRemarks || "")}
                    {renderAuditAssessorCard("TO", `${assessorLabel("TO")} Report`, student?.assignedTO, s.toStatus || "PENDING", s.toRemarks || "")}
                  </div>
                </div>

                {/* Modal Footer (Broadcast Switch) */}
                <div className="bg-black/25 border-t border-app-border p-6 shrink-0 flex flex-col md:flex-row items-center justify-between gap-6 rounded-b-3xl">
                  <div className="space-y-1 max-w-xl text-center md:text-left">
                    <h4 className="text-xs font-bold uppercase text-app-text-bright tracking-wider">Results Broadcasting Protocol</h4>
                    <p className="text-[11px] text-app-text-muted leading-relaxed">
                      Once broadcasted, the candidate&apos;s portfolio locks permanently. The student will instantly be granted access to <strong className="text-app-text-bright">only their qualitative written remarks</strong>{" "}
                      — strictly shielding all OLQ grades, traits score sheets, ticks, and numeric marks.
                    </p>
                  </div>

                  <div className="shrink-0 w-full md:w-auto">
                    {isBroadcasted ? (
                      <div className="px-5 py-3.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 w-full sm:w-auto">
                        <CheckCircle size={16} />
                        Final Results Broadcasted &amp; Released
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        icon={Send}
                        onClick={() => handleBroadcastSub(s.id!)}
                        disabled={broadcasting}
                        className="w-full md:w-auto"
                      >
                        {broadcasting ? "Broadcasting..." : "Broadcast Final Result to Student"}
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

      {/* ── ADMIN DOSSIER UPLOAD MODAL ────────────────────────────────────────── */}
      {uploadTarget &&
        (() => {
          const s = uploadTarget;
          const student = (s.student as UserProfile | undefined) || users.find((u) => u.uid === s.userId) || users.find((u) => u.id === s.userId);
          const studentName = student?.name || "Candidate";
          const studentBatch = student?.batch || "--";
          const studentChest = student?.chestNo || "--";

          return (
            <Dialog open={!!uploadTarget} onOpenChange={(open) => !open && !uploadingDossier && setUploadTarget(null)}>
              <DialogContent maxWidth="max-w-xl" className="p-6 sm:p-8 space-y-6">
                <div className="flex items-start justify-between gap-4 border-b border-app-border pb-4">
                  <div className="space-y-1">
                    <DialogTitle className="text-lg font-black text-app-text-bright tracking-tight flex items-center gap-2">
                      <UploadCloud size={20} className="text-app-accent" />
                      Upload Candidate Dossier
                    </DialogTitle>
                    <p className="text-xs text-app-text-muted">
                      Upload handwritten sheets for candidates who tested via live meeting or sent dossiers via DMs.
                    </p>
                  </div>
                  <IconButton
                    icon={X}
                    size={16}
                    onClick={() => !uploadingDossier && setUploadTarget(null)}
                    disabled={uploadingDossier}
                    title="Close"
                  />
                </div>

                {/* Candidate Info Summary */}
                <div className="p-3.5 bg-black/30 border border-app-border rounded-2xl flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-bold text-app-text-bright">{studentName}</div>
                    <div className="text-[11px] text-app-text-muted">{student?.email || "No email"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-app-card border border-app-border text-[10px] font-bold text-app-text-muted">
                      Batch: {studentBatch}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-app-card border border-app-border text-[10px] font-bold text-app-text-muted">
                      Chest: {studentChest}
                    </span>
                  </div>
                </div>

                {/* Test Origin / Mode Selection */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-app-text-muted">
                    Submission Source
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setUploadMode("LIVE_CALL")}
                      className={cn(
                        "p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3",
                        uploadMode === "LIVE_CALL"
                          ? "bg-app-accent/15 border-app-accent text-app-text-bright ring-1 ring-app-accent/40"
                          : "bg-app-card/40 border-app-border text-app-text-muted hover:border-app-accent/30"
                      )}
                    >
                      <Video size={18} className={uploadMode === "LIVE_CALL" ? "text-app-accent" : "text-app-text-muted"} />
                      <div>
                        <div className="text-xs font-bold text-app-text-bright">Live Meeting / Call</div>
                        <div className="text-[10px] text-app-text-muted leading-tight mt-0.5">
                          Candidate wrote test in a live Google Meet/Zoom session.
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUploadMode("DIRECT_UPLOAD")}
                      className={cn(
                        "p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3",
                        uploadMode === "DIRECT_UPLOAD"
                          ? "bg-app-accent/15 border-app-accent text-app-text-bright ring-1 ring-app-accent/40"
                          : "bg-app-card/40 border-app-border text-app-text-muted hover:border-app-accent/30"
                      )}
                    >
                      <MessageSquare size={18} className={uploadMode === "DIRECT_UPLOAD" ? "text-app-accent" : "text-app-text-muted"} />
                      <div>
                        <div className="text-xs font-bold text-app-text-bright">Direct DM / WhatsApp</div>
                        <div className="text-[10px] text-app-text-muted leading-tight mt-0.5">
                          Candidate sent dossier directly to team via WhatsApp/email.
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Optional Admin Note */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-app-text-muted">
                    Internal Notes / Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    placeholder="e.g. Conducted by Col. Sharma on 14 Oct live call"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-app-card border border-app-border text-xs text-app-text-bright placeholder:text-app-text-muted/60 focus:outline-none focus:border-app-accent"
                  />
                </div>

                {/* File Upload Box */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-app-text-muted">
                    Dossier PDF ({selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"} selected)
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        const nonPdf = newFiles.filter(
                          (f) => f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")
                        );
                        if (nonPdf.length > 0) {
                          alert("Only PDF files are accepted for candidate dossiers. Images are not allowed.");
                          e.target.value = "";
                          return;
                        }
                        const maxLimit = 5 * 1024 * 1024;
                        const oversized = newFiles.filter((f) => f.size > maxLimit);
                        if (oversized.length > 0) {
                          alert(`File size exceeds 5 MB limit: ${oversized.map((f) => f.name).join(", ")}`);
                          e.target.value = "";
                          return;
                        }
                        setSelectedFiles((prev) => [...prev, ...newFiles]);
                      }
                      e.target.value = "";
                    }}
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-app-border hover:border-app-accent/50 rounded-2xl p-6 text-center cursor-pointer bg-black/20 hover:bg-black/30 transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <FileUp size={24} className="text-app-accent" />
                    <div className="text-xs font-bold text-app-text-bright">
                      Click to browse or drop dossier PDF here
                    </div>
                    <div className="text-[10px] text-app-text-muted">
                      Supports PDF files only (Max 5MB per file)
                    </div>
                  </div>

                  {/* Selected Files List */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                      {selectedFiles.map((f, idx) => (
                        <div
                          key={`${f.name}-${idx}`}
                          className="flex items-center justify-between p-2 rounded-xl bg-app-card border border-app-border text-xs"
                        >
                          <span className="truncate max-w-[80%] text-app-text-bright font-medium">
                            {f.name} <span className="text-[10px] text-app-text-muted">({(f.size / 1024).toFixed(0)} KB)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-app-text-muted hover:text-red-400 p-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-app-border">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setUploadTarget(null)}
                    disabled={uploadingDossier}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    icon={uploadingDossier ? Loader2 : UploadCloud}
                    onClick={handleAdminDossierUpload}
                    disabled={uploadingDossier || selectedFiles.length === 0}
                  >
                    {uploadingDossier ? "Uploading to Cloud..." : "Upload & Transmit Dossier"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

      {/* ── CANDIDATE STEP FILE VIEWER (PIQ 1 / PIQ 2 / Dossier) ──────────────── */}
      {pipTarget &&
        (() => {
          const { submission: s, step } = pipTarget;
          const student = resolveStudent(s);
          const studentName = student?.name || "Candidate";
          const label = step === "piq1" ? "PIQ 1" : step === "piq2" ? "PIQ 2" : "Dossier";

          const allPiqFiles = s.piqFiles || [];
          const piq1Files = allPiqFiles.filter((f) => f.includes("/piq1_") || !f.includes("/piq2_"));
          const piq2Files = allPiqFiles.filter((f) => f.includes("/piq2_"));
          const rawFiles = step === "piq1" ? piq1Files : step === "piq2" ? piq2Files : s.uploadedFiles || [];
          const submissionId = String(s.id || s._id || "");
          // isPdf must be checked against the raw filename, not the resolved
          // URL — the db:// proxy URL has no file extension to check.
          const items = rawFiles.map((f) => ({ url: resolveFileUrl(submissionId, allPiqFiles, f), isPdf: isPdfPath(f) }));

          return (
            <PipContent
              pipWindow={pip.pipWindow}
              dialogOpen={pip.dialogOpen}
              onClose={() => {
                pip.close();
                setPipTarget(null);
              }}
              title={`${studentName} — ${label}`}
            >
              <FileGallery label={label} items={items} />
            </PipContent>
          );
        })()}
    </div>
  );
}
