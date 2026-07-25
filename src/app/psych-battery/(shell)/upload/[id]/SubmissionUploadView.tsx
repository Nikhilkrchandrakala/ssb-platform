"use client";

// Ported from psych_battery/src/pages/SubmissionUpload.tsx.
//
// Legacy bug fixed: `handleSubmit` never actually uploaded anything. It built
// fake `https://via.placeholder.com/...` URLs as stand-ins for the PIQ scan
// and each stimuli capture, then PATCHed the submission with those fake URLs
// and a hand-picked `status: 'UPLOADED'` — a "mock uploads" stub that was
// clearly meant to be swapped for the real thing later. This port does the
// real thing:
//   1. Each selected file (PIQ scan + stimuli captures) is uploaded via the
//      already-ported `api.upload.file()` (-> POST /api/psych/uploadBatteryImage,
//      backed by local-disk storage) to get a real URL.
//   2. The resulting URLs are POSTed as `{ fileUrls: [...] }` JSON to
//      /api/psych/submissions/:id/upload (see that route handler) — which is
//      the "client uploaded directly, just tell me the URLs" half of its dual
//      contract (the other half accepts raw multipart `files` and uploads
//      them itself; going through api.upload.file() first lets us reuse the
//      existing api.ts helper instead of hand-rolling multipart, and lets the
//      route's own status/notification side effects run exactly as designed).
//   That route already sets status to REVIEW_PENDING and notifies the
//   assigned assessors server-side, so the manual
//   `api.submissions.update(id, { status: 'UPLOADED', ... })` legacy used to
//   call afterwards is now redundant (and would have raced/duplicated the
//   route's own transition) — dropped.
//   `api.ts` has no dedicated `submissions.upload(...)` method (only the
//   generic single-file `upload.file`), so the final POST goes through a
//   plain `fetch` call here rather than the `api` client.
//
// Also fixed: `assessment = await api.assessments.get(subData.assessmentId)`
// assumed `assessmentId` was always a plain string id. The real
// GET /api/psych/submissions/:id route populates `assessmentId` with
// `{ _id, title }` (Mongoose populate), so passing it straight through built
// a request URL like `/api/psych/assessments/[object%20Object]`. Extract the
// id the same way StudentEntryView does.
//
// Architecture changes vs legacy:
// - `id` comes in as a prop (server-resolved route param) instead of
//   react-router's useParams().
// - `mainSiteUrl` cross-origin bounces -> same-origin router.push() (main
//   site's ProfileDashboard is a route in this same app now).
// - Dropped the `fetchPiqTemplate` cross-origin fetch to the old
//   `api.ssbwithisv.in` host (with its `isLocal` hostname-sniffing hack) —
//   the magazine/PDF catalogue this reads from was ported in Phase 3 as
//   `/api/allMagazinePdfs` (same origin now), and its `pdfFilePath` values are
//   already-absolute R2/CDN URLs (see ProfileDashboardClient.tsx's own usage),
//   so no base-URL prefixing is needed either.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/psych-battery/lib/api";
import { AssessmentSubmission, Assessment } from "@/app/psych-battery/types";
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft, Loader2, X } from "lucide-react";
import { cn } from "@/app/psych-battery/lib/utils";
import { Badge, Button, GlassCard, Reveal } from "@/app/psych-battery/components/ui/Primitives";

interface MagazinePdf {
  _id?: string;
  pdfTitle?: string;
  pdfFilePath?: string;
}

function extractAssessmentId(a: AssessmentSubmission["assessmentId"] | undefined): string | undefined {
  if (!a) return undefined;
  return typeof a === "string" ? a : a.id || a._id;
}

export default function SubmissionUploadView({ id }: { id: string }) {
  const router = useRouter();

  const [submission, setSubmission] = useState<AssessmentSubmission | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [piqFile, setPiqFile] = useState<File | null>(null);
  const [, setPiqPreview] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>("https://api.ssbwithisv.in/assets/Blank_PIQ_Form.pdf");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/allMagazinePdfs")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Failed to fetch PIQ template"))))
      .then((magazines: MagazinePdf[]) => {
        if (cancelled) return;
        const piqDoc = magazines?.find(
          (m) => m?.pdfTitle?.toLowerCase().includes("personal information questionnaire") || m?.pdfTitle?.toLowerCase().includes("piq")
        );
        if (piqDoc?.pdfFilePath) {
          setDownloadUrl(piqDoc.pdfFilePath);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch PIQ template URL:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.submissions
      .get(id)
      .then((subData: AssessmentSubmission) => {
        if (cancelled) return null;
        setSubmission(subData);
        const assessmentId = extractAssessmentId(subData.assessmentId);
        if (!assessmentId) return null;
        return api.assessments.get(assessmentId);
      })
      .then((assessData: Assessment | null) => {
        if (cancelled || !assessData) return;
        setAssessment(assessData);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch submission for upload:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePiqChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const maxLimit = 500 * 1024; // 500 KB
      if (file.size > maxLimit) {
        setError("PIQ form file size must not exceed 500 KB.");
        e.target.value = "";
        return;
      }
      setError(null);
      setPiqFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => setPiqPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setPiqPreview("PDF_ICON");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const maxLimit = 2 * 1024 * 1024; // 2 MB
      const oversized = newFiles.filter((f) => f.size > maxLimit);
      if (oversized.length > 0) {
        setError(`The following file(s) exceed the 2 MB limit: ${oversized.map((f) => f.name).join(", ")}`);
        e.target.value = "";
        return;
      }
      setError(null);
      setFiles((prev) => [...prev, ...newFiles]);

      // Generate previews
      newFiles.forEach((file: File) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviews((prev) => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        } else {
          setPreviews((prev) => [...prev, "PDF_ICON"]);
        }
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!piqFile) {
      setError("PIQ Form is mandatory. Please upload your filled PIQ questionnaire first.");
      return;
    }
    if (files.length === 0) {
      setError("Please select at least one stimuli capture.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const piqUpload = await api.upload.file(piqFile);
      const answerUploads = await Promise.all(files.map((f) => api.upload.file(f)));
      const fileUrls = [piqUpload.url, ...answerUploads.map((u) => u.url)];

      const response = await fetch(`/api/psych/submissions/${id}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrls }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Upload failed");
      }

      router.push("/psych-battery");
    } catch (err) {
      console.error("Failed to upload files:", err);
      setError(err instanceof Error ? err.message : "Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent"></div>
      </div>
    );

  if (!submission || !assessment) return <div className="text-app-text-bright p-12 text-center">Submission data not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Reveal className="space-y-3">
        <button
          onClick={() => router.push("/ProfileDashboard?tab=psycheTest")}
          className="text-[10px] font-bold text-app-text-muted hover:text-app-text-bright flex items-center gap-2 transition-colors uppercase tracking-[0.2em] cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Profile
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-app-text-bright">Dossier Upload</h1>
          <Badge tone="warning">Pending Action</Badge>
        </div>
        <p className="text-app-text-muted text-sm max-w-2xl">
          Submit your handwritten responses for {assessment.title}. High-resolution images or PDF documents required.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* PIQ Upload Slot - Priority */}
          <GlassCard
            className={cn(
              "border-dashed p-6 flex flex-col items-center text-center relative overflow-hidden",
              !piqFile ? "border-amber-500/30" : "border-emerald-500/30"
            )}
          >
            {!piqFile && (
              <div className="absolute top-5 right-5">
                <Badge tone="warning">Mandatory</Badge>
              </div>
            )}

            <div className="flex items-center gap-4 mb-5 self-start">
              <div
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center border shrink-0",
                  !piqFile ? "bg-amber-500/20 border-amber-400/40 text-amber-300" : "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                )}
              >
                <FileText size={19} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-bold text-app-text-bright">PIQ Form Submission</h3>
                <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">Priority requirement</p>
              </div>
            </div>

            {piqFile ? (
              <div className="w-full bg-app-card border border-app-border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <CheckCircle2 size={17} className="text-emerald-400" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold text-app-text-bright truncate max-w-[150px]">{piqFile.name}</p>
                    <p className="text-[9px] font-bold text-app-text-muted uppercase">Form received</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPiqFile(null);
                    setPiqPreview(null);
                  }}
                  className="text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-300 transition-colors cursor-pointer shrink-0"
                >
                  Replace
                </button>
              </div>
            ) : (
              <div className="space-y-3 w-full">
                <input type="file" id="piq-upload" className="hidden" onChange={handlePiqChange} accept="image/*,application/pdf" />
                <label
                  htmlFor="piq-upload"
                  className="flex flex-col items-center justify-center border border-app-border border-dashed rounded-xl p-7 hover:bg-white/[0.03] cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Upload size={22} className="text-app-text-muted mb-2" />
                  <span className="text-xs font-bold text-app-text-bright">Attach Handwritten PIQ</span>
                  <span className="text-[9px] font-bold text-app-text-muted uppercase tracking-widest mt-1">Images or PDF (Max 500 KB)</span>
                </label>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <span className="text-[10px] font-bold text-app-text-muted uppercase">Missing form?</span>
                  <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-app-accent uppercase tracking-widest hover:underline">
                    Download PIQ Form
                  </a>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Upload Dropzone */}
          <GlassCard className="border-dashed p-10 text-center transition-all group">
            <input type="file" id="file-upload" multiple className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <div className="w-16 h-16 bg-app-card rounded-2xl mx-auto flex items-center justify-center mb-5 border border-app-border group-hover:bg-app-accent/12 transition-all">
                <Upload size={28} className="text-app-accent" />
              </div>
              <h3 className="text-xl font-bold text-app-text-bright mb-1.5">Import Stimuli Captures</h3>
              <p className="text-app-text-muted text-sm">
                Drag &amp; drop or <span className="text-app-accent font-semibold">browse filesystem</span>
              </p>
              <p className="text-[9px] font-bold text-app-text-muted uppercase tracking-widest mt-2">Max 2 MB per file</p>
            </label>
          </GlassCard>

          {/* File Previews */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-app-text-muted uppercase tracking-widest border-b border-app-border pb-2">
                <span>Queue Information</span>
                <span>{files.length} Entries Ready</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {files.map((file, idx) => (
                  <div key={idx} className="bg-app-card border border-app-border rounded-xl overflow-hidden group relative h-40">
                    {previews[idx] === "PDF_ICON" ? (
                      <div className="flex flex-col items-center justify-center h-full bg-app-sidebar">
                        <FileText size={32} className="text-app-accent" />
                        <span className="text-[10px] font-bold text-app-text-muted mt-2 truncate w-full px-3 text-center">{file.name}</span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previews[idx]} alt="Preview" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                    )}
                    <button onClick={() => removeFile(idx)} className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 backdrop-blur rounded-lg text-white hover:bg-red-500 transition-colors cursor-pointer">
                      <X size={13} />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent">
                      <span className="text-[9px] font-bold text-white/80 uppercase tracking-widest truncate block">IMG_{file.name.slice(0, 8)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6 space-y-6 sticky top-24" hoverLift={false}>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-app-text-bright tracking-tight">Summary</h3>
              <div className="text-[10px] uppercase font-bold text-app-text-muted tracking-widest border-b border-app-border pb-3">Session Ledger</div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-app-text-muted">Battery ID</span>
                <span className="text-app-text-bright font-mono">{(assessment.id || assessment._id || "").slice(0, 8)}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-app-text-muted">Started</span>
                <span className="text-app-text-bright">
                  {submission.startedAt || submission.createdAt
                    ? new Date((submission.startedAt || submission.createdAt) as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-app-text-muted">Status</span>
                <span className="text-amber-400">Waiting for Data</span>
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-red-500/20 border border-red-400/40 rounded-xl flex gap-2.5 text-red-300 text-xs font-medium leading-relaxed">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              icon={uploading ? undefined : CheckCircle2}
              onClick={handleSubmit}
              disabled={uploading || files.length === 0 || !piqFile}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processing...
                </>
              ) : (
                "Transmit Dossier"
              )}
            </Button>

            <p className="text-[10px] text-app-text-muted leading-relaxed">
              By transmitting, you confirm that these images represent your original handwritten responses for the specific battery conducted.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
