"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  BiUser,
  BiLogOut,
  BiSave,
  BiMap,
  BiPhone,
  BiEnvelope,
  BiChevronRight,
  BiEdit,
  BiArrowBack,
  BiBook,
  BiRupee,
  BiDownload,
  BiBrain,
  BiCalendar,
  BiTime,
  BiX,
} from "react-icons/bi";
import { FaCamera, FaCheckCircle, FaLock } from "react-icons/fa";
import "@/style/custom-theme.css";
import styles from "@/style/ProfileDashboard.module.css";
import ImageUploadPopup from "@/components/site/ImageUploadPopup";
import PdfViewer from "@/components/site/PdfViewer";
import { useSiteUser } from "@/components/site/SiteUserProvider";
import { resolveLegacyAssetUrl } from "@/lib/legacyAssets";
import { postJSON, ApiError } from "@/lib/authApi";
import { assessorLabel } from "@/lib/assessorLabels";
import type { RazorpayOptions } from "@/global";

// Razorpay's public key_id is not a secret (mirrors BatchesView.tsx's own
// checkout.js integration and the server-side RAZORPAY_KEY_ID env var).
const RAZORPAY_KEY_ID = "rzp_live_SdgMS7X9M3RZSi";

export interface DashboardUser {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  Address?: string;
  profileImage?: string;
  clinicalStage?: string | null;
  batch?: string;
  assignedPsych?: unknown;
  assignedGTO?: unknown;
  assignedIO?: unknown;
  assignedTO?: unknown;
}

interface DashboardSlot {
  _id: string;
  title?: string;
  price?: number;
  startTime?: string;
  endTime?: string;
  batchNo?: string;
  isFullCourse?: boolean;
}

interface DashboardInstallment {
  seq: number;
  amount: number;
  dueDate?: string;
  status: "pending" | "paid" | "overdue" | "failed";
  paymentMethod?: "razorpay" | "manual" | null;
  paymentReference?: string | null;
}

interface DashboardInstallmentPlan {
  _id: string;
  status: "active" | "completed" | "defaulted" | "cancelled";
  installments: DashboardInstallment[];
}

export interface DashboardOrder {
  _id: string;
  slotId?: DashboardSlot | null;
  price?: number;
  orderId?: string;
  paymentId?: string;
  couponCode?: string;
  referralCode?: string;
  bookingMethod?: string;
  selectedModules?: string[];
  createdAt?: string;
  installmentPlanId?: DashboardInstallmentPlan | null;
}

export interface DashboardMagazine {
  _id: string;
  pdfTitle: string;
  pdfFilePath: string;
  magazineFrontImage: string;
  tags: string;
  uploadDate?: string;
}

interface Submission {
  id?: string;
  _id?: string;
  status?: string;
  ioStatus?: string;
  piqFiles?: string[];
  piq1Status?: string;
  piq2Status?: string;
  piqStatus?: string;
  uploadedFiles?: string[];
  workflowStage?: string;
  reportVisibility?: { psych?: boolean; gto?: boolean; io?: boolean; to?: boolean };
  assessmentId?: { title?: string } | string;
  meetingDate?: string;
  meetingLink?: string;
  psychMeetingDate?: string;
  psychMeetingLink?: string;
  ioMeetingDate?: string;
  ioMeetingLink?: string;
  gtoMeetingDate?: string;
  gtoMeetingLink?: string;
  toMeetingDate?: string;
  toMeetingLink?: string;
  assessorRemarks?: string;
  psychRemarks?: string;
  gtoRemarks?: string;
  ioRemarks?: string;
  toRemarks?: string;
  releasedPsychRemarks?: string;
  releasedGtoRemarks?: string;
  releasedIoRemarks?: string;
  releasedToRemarks?: string;
}

const moduleNames: Record<string, React.ReactNode> = {
  full_course: "10 Days SSB Hackathon (Full Course)",
  ssb_ppdt: "Intro & PPDT (Stage 1 Process)",
  psych: "Psychology Test Preparation Program",
  interview: "Interview Theory Course and Mock Interview",
  group_testing: (
    <span>
      Group Testing Course on VTX<sup>TM</sup>
    </span>
  ),
};

function formatDate(dateString?: string) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(dateString?: string) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

type ActiveTab = "profile" | "batches" | "resources" | "psycheTest";

export default function ProfileDashboardClient({
  user: initialUser,
  orders,
  magazines,
}: {
  user: DashboardUser;
  orders: DashboardOrder[];
  magazines: DashboardMagazine[];
}) {
  const router = useRouter();
  const { logout } = useSiteUser();

  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // ---- Profile field state ----
  const [previewData, setPreviewData] = useState<DashboardUser>(initialUser);
  const [formData, setFormData] = useState<DashboardUser>(initialUser);
  const [isSaving, setIsSaving] = useState(false);

  // ---- Avatar upload popup ----
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showImagePopup, setShowImagePopup] = useState(false);

  // ---- Email/Phone OTP popup ----
  const [otpField, setOtpField] = useState<"phone" | "email" | null>(null);
  const [oldValue, setOldValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [reqId, setReqId] = useState("");
  const [otpError, setOtpError] = useState("");

  // ---- Resources tab ----
  const [selectedTag, setSelectedTag] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [viewingPdf, setViewingPdf] = useState<{ id: string; url: string; title: string } | null>(null);

  // ---- Candidate Evaluation tab ----
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingPsych, setLoadingPsych] = useState(false);
  const [isPiqUploading, setIsPiqUploading] = useState(false);
  const [isDossierUploading, setIsDossierUploading] = useState(false);
  // IO-only candidates only ever get step 2 (PIQ Upload) in the tab bar —
  // step 1 requires hasFullOrPsych, so defaulting to 1 for them would leave
  // no step content ever matching evalActiveStep, i.e. a blank tab panel.
  const [evalActiveStep, setEvalActiveStep] = useState(() => {
    const initialStages = (initialUser?.clinicalStage || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const initialHasFullOrPsych =
      initialStages.includes("full_course") || initialStages.includes("psych") || initialStages.includes("psychology");
    const initialHasInterview = initialStages.includes("interview");
    return initialHasInterview && !initialHasFullOrPsych ? 2 : 1;
  });
  const [uploadPiqType, setUploadPiqType] = useState<"piq1" | "piq2">("piq1");
  const [hasCompletedTheory, setHasCompletedTheory] = useState(false);
  const [isRegisteringConsent, setIsRegisteringConsent] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const piqInputRef = useRef<HTMLInputElement>(null);
  const dossierInputRef = useRef<HTMLInputElement>(null);

  // Sales Phase 3 — tracks which installment's "Pay Now" button is mid-flow
  // (keyed `${installmentPlanId}:${seq}`), so only that one button spinners.
  const [payingInstallmentKey, setPayingInstallmentKey] = useState<string | null>(null);

  const userProfile = previewData;
  const userStages = (userProfile?.clinicalStage || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const hasFullOrPsych = userStages.includes("full_course") || userStages.includes("psych") || userStages.includes("psychology");
  const hasGTO = userStages.includes("group_testing") || userStages.includes("gto");
  const hasInterview = userStages.includes("interview");
  const isGTOOnly = hasGTO && !hasInterview && !hasFullOrPsych;
  const isIOOnly = hasInterview && !hasFullOrPsych;

  useEffect(() => {
    if (activeTab === "psycheTest" && submissions.length === 0 && !loadingPsych) {
      void fetchSubmissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Sales Phase 3 — student-side "Pay Now" for a pending installment. Opens
  // Razorpay checkout scoped to that installment's amount, same pattern as
  // BatchesView's self-serve purchase flow. `/api/webhooks/razorpay` is the
  // authoritative confirmation path; `/api/installments/verifyPayment` here
  // only re-confirms with Razorpay directly for instant UI feedback (never
  // trusts the redirect alone) — router.refresh() re-pulls the now-updated
  // installment status from the server once either path has landed.
  async function payInstallment(installmentPlanId: string, seq: number, amount: number) {
    const key = `${installmentPlanId}:${seq}`;
    if (typeof window === "undefined" || !window.Razorpay) {
      toast.error("Payment gateway is still loading. Please try again in a moment.");
      return;
    }
    setPayingInstallmentKey(key);
    try {
      const razorOrder = await postJSON<{ orderId: string; amount: number }>("/api/installments/payOrder", {
        installmentPlanId,
        seq,
      });

      const options: RazorpayOptions = {
        key: RAZORPAY_KEY_ID,
        amount: razorOrder.amount,
        currency: "INR",
        order_id: razorOrder.orderId,
        name: "SSB with ISV",
        description: `Installment payment — ₹${amount}`,
        prefill: { name: userProfile?.name, email: userProfile?.email, contact: userProfile?.phone },
        handler: async (response) => {
          try {
            await postJSON("/api/installments/verifyPayment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              installmentPlanId,
              seq,
            });
            toast.success("Payment received!");
            router.refresh();
          } catch {
            toast.error("Payment received but confirmation is still processing — refresh in a moment.");
          } finally {
            setPayingInstallmentKey(null);
          }
        },
        modal: {
          ondismiss: () => setPayingInstallmentKey(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not start payment");
      setPayingInstallmentKey(null);
    }
  }

  async function fetchSubmissions() {
    setLoadingPsych(true);
    try {
      const res = await fetch("/api/psych/submissions");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch submissions", err);
    } finally {
      setLoadingPsych(false);
    }
  }

  const activeSub = submissions.length > 0 ? submissions[0] : null;

  const activeSubMeetings: { role: string; date?: string; link: string }[] = activeSub
    ? (
        [
          activeSub.psychMeetingLink && { role: assessorLabel("Psych"), date: activeSub.psychMeetingDate, link: activeSub.psychMeetingLink },
          activeSub.ioMeetingLink && { role: assessorLabel("IO"), date: activeSub.ioMeetingDate, link: activeSub.ioMeetingLink },
          activeSub.gtoMeetingLink && { role: assessorLabel("GTO"), date: activeSub.gtoMeetingDate, link: activeSub.gtoMeetingLink },
          activeSub.toMeetingLink && { role: assessorLabel("TO"), date: activeSub.toMeetingDate, link: activeSub.toMeetingLink },
        ].filter(Boolean) as { role: string; date?: string; link: string }[]
      )
    : [];
  if (activeSubMeetings.length === 0 && activeSub?.meetingLink) {
    activeSubMeetings.push({ role: "Assessor", date: activeSub.meetingDate, link: activeSub.meetingLink });
  }

  // ---- Resources filtering/pagination ----
  const sortedMagazines = useMemo(
    () => [...magazines].sort((a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime()),
    [magazines]
  );
  const filteredMagazines = selectedTag === "all" ? sortedMagazines : sortedMagazines.filter((m) => m.tags === selectedTag);
  const indexOfLastItem = currentPage * itemsPerPage;
  const currentMagazines = filteredMagazines.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
  const totalPages = Math.ceil(filteredMagazines.length / itemsPerPage);
  const defaultCategories = ["Magazine", "Books", "SSBPrep"];
  const uniqueCategories =
    magazines.length > 0 ? Array.from(new Set([...defaultCategories, ...magazines.map((m) => m.tags).filter(Boolean)])) : defaultCategories;

  function handleTagChange(tag: string) {
    setSelectedTag(tag);
    setCurrentPage(1);
  }

  async function handleViewPdf(pdfPath: string, title: string, id: string) {
    const url = pdfPath.startsWith("/assets") ? pdfPath : resolveLegacyAssetUrl(pdfPath);
    setViewingPdf({ id, url, title: title || "Resource" });
    try {
      await fetch("/api/trackDownload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magazineId: id }),
      });
    } catch {
      // best-effort tracking only
    }
  }

  // ---- Avatar upload ----
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a valid image file (JPEG, JPG, PNG, GIF, WEBP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleImageUpload() {
    if (!selectedImage) return;
    setIsUploading(true);
    try {
      const body = new FormData();
      body.append("profileImage", selectedImage);
      const res = await fetch("/api/user/profile", { method: "PUT", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setPreviewData((prev) => ({ ...prev, profileImage: data.user?.profileImage }));
      setShowImagePopup(false);
      setSelectedImage(null);
      setImagePreview(null);
      toast.success("Profile image updated successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleCancelImage() {
    setShowImagePopup(false);
    setSelectedImage(null);
    setImagePreview(null);
  }

  // ---- Name / Address edit (no OTP required — matches legacy handleSave) ----
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name, Address: formData.Address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      setPreviewData((prev) => ({ ...prev, name: formData.name, Address: formData.Address }));
      toast.success("Profile updated successfully!");
      setIsEditMode(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setFormData(previewData);
    setIsEditMode(false);
  }

  // ---- Email / Phone change via OTP (uses the generic, unauthenticated
  // /api/signup/send-*-otp + verify-*-otp pair — the only OTP endpoints in
  // this app that aren't scoped to admin/franchise password recovery). ----
  function handleFieldClick(field: "phone" | "email") {
    setOtpField(field);
    setOldValue(previewData?.[field] || "");
    setNewValue("");
    setOtpSent(false);
    setOtp("");
    setReqId("");
    setOtpError("");
  }

  async function handleSendOtp() {
    if (!newValue) {
      setOtpError(`Please enter a valid ${otpField === "phone" ? "phone number" : "email"}`);
      return;
    }
    if (newValue === oldValue) {
      setOtpError(`New ${otpField === "phone" ? "phone number" : "email"} must be different from current`);
      return;
    }
    if (otpField === "phone" && newValue.replace(/\D/g, "").length !== 10) {
      setOtpError("Please enter a valid 10-digit phone number");
      return;
    }
    if (otpField === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newValue)) {
      setOtpError("Please enter a valid email address");
      return;
    }

    setIsVerifying(true);
    setOtpError("");
    try {
      const endpoint = otpField === "email" ? "/api/signup/send-email-otp" : "/api/signup/send-phone-otp";
      const body = otpField === "email" ? { email: newValue } : { phone: newValue };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setReqId(data.reqId || "");
        toast.success(`OTP sent to your new ${otpField === "phone" ? "phone number" : "email"}`);
      } else {
        setOtpError(data.message || "Failed to send OTP");
      }
    } catch {
      setOtpError("Failed to send OTP. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp || otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP");
      return;
    }
    setIsVerifying(true);
    setOtpError("");
    try {
      const endpoint = otpField === "email" ? "/api/signup/verify-email-otp" : "/api/signup/verify-phone-otp";
      const body = otpField === "email" ? { email: newValue, otp } : { phone: newValue, otp, reqId };
      const verifyRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        setOtpError(verifyData.message || "Invalid OTP");
        setIsVerifying(false);
        return;
      }

      const updateRes = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [otpField as string]: newValue }),
      });
      const updateData = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateData.message || "Failed to update profile");

      setPreviewData((prev) => ({ ...prev, [otpField as string]: newValue }));
      setFormData((prev) => ({ ...prev, [otpField as string]: newValue }));
      toast.success(`${otpField === "phone" ? "Phone number" : "Email"} updated successfully!`);
      setOtpField(null);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "OTP verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  function handleCloseOtpPopup() {
    setOtpField(null);
    setOldValue("");
    setNewValue("");
    setOtp("");
    setOtpSent(false);
    setReqId("");
    setOtpError("");
  }

  // ---- Logout: session cookie is httpOnly, cleared server-side via
  // SiteUserProvider's logout() -> POST /api/logout. No localStorage to clear. ----
  async function handleLogout() {
    await logout();
  }

  // ---- Candidate evaluation: PIQ / Dossier upload ----
  async function handlePiqFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    const maxLimit = 500 * 1024;
    const oversized = files.filter((f) => f.size > maxLimit);
    if (oversized.length > 0) {
      toast.error(`File size exceeds the 500 KB limit for: ${oversized.map((f) => f.name).join(", ")}`);
      e.target.value = "";
      return;
    }
    await uploadPiq(files, uploadPiqType);
    e.target.value = "";
  }

  async function uploadPiq(files: File[], piqType: "piq1" | "piq2") {
    setIsPiqUploading(true);
    try {
      let submissionId = activeSub?.id || activeSub?._id;
      if (!submissionId) {
        const assessmentsRes = await fetch("/api/psych/assessments");
        const assessments = await assessmentsRes.json();
        const assessmentId = Array.isArray(assessments) && assessments.length > 0 ? assessments[0]._id || assessments[0].id : null;
        if (!assessmentId) {
          toast.error("No active psychological assessments found.");
          return;
        }
        const subRes = await fetch("/api/psych/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentId }),
        });
        const sub = await subRes.json();
        submissionId = sub.id || sub._id;
      }

      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append("piqType", piqType);

      const res = await fetch(`/api/psych/submissions/${submissionId}/piq?piqType=${piqType}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      toast.success(`${piqType === "piq2" ? "PIQ 2 (Final)" : "PIQ 1 (Initial)"} Form uploaded successfully!`);
      await fetchSubmissions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload PIQ Form.");
    } finally {
      setIsPiqUploading(false);
    }
  }

  async function handleDossierFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    const maxLimit = 2 * 1024 * 1024;
    const oversized = files.filter((f) => f.size > maxLimit);
    if (oversized.length > 0) {
      toast.error(`File size exceeds the 2 MB limit for: ${oversized.map((f) => f.name).join(", ")}`);
      e.target.value = "";
      return;
    }
    const submissionId = activeSub?.id || activeSub?._id;
    if (!submissionId) {
      toast.error("No active session found to upload dossier.");
      return;
    }
    setIsDossierUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const res = await fetch(`/api/psych/submissions/${submissionId}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      toast.success("Dossier uploaded successfully!");
      await fetchSubmissions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload Dossier.");
    } finally {
      setIsDossierUploading(false);
      e.target.value = "";
    }
  }

  async function handleStartEvaluation() {
    if (!hasCompletedTheory) {
      toast.error("Please confirm that you have completed the theory sessions first.");
      return;
    }
    const confirmStart = window.confirm(
      "Are you absolutely sure you want to start the Psychology Test Evaluation now? Once started, your attempt will be recorded and cannot be reset."
    );
    if (!confirmStart) return;

    setIsRegisteringConsent(true);
    try {
      const res = await fetch("/api/user/register-psych-consent", { method: "PUT" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to record consent");
      }
      toast.success("Consent recorded. Your evaluation module will open shortly.");
      // Use window.location.href instead of router.push to ensure a clean document
      // reload when transitioning from the legacy Bootstrap portal into the Tailwind
      // psych-battery suite, ensuring the clean styling appears instantly on first click.
      window.location.href = "/psych-battery";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record your consent. Please try again.");
    } finally {
      setIsRegisteringConsent(false);
    }
  }

  const piq1Files = (activeSub?.piqFiles || []).filter((f) => f.includes("/piq1_") || !f.includes("/piq2_"));
  const piq2Files = (activeSub?.piqFiles || []).filter((f) => f.includes("/piq2_"));
  const piq1Status = activeSub?.piq1Status || (activeSub?.piqFiles && activeSub.piqFiles.length > 0 ? "VERIFIED" : "PENDING");
  const piq2Status = activeSub?.piq2Status || "PENDING";
  const isPiq1Uploaded = piq1Status === "VERIFIED" || piq1Status === "PROCESSING";
  const isPiq2Uploaded = piq2Status === "VERIFIED" || piq2Status === "PROCESSING";
  const isPiq1Verified = piq1Status === "VERIFIED";
  const isPiq2Verified = piq2Status === "VERIFIED";
  const isTestCompleted =
    activeSub?.status === "COMPLETED" ||
    activeSub?.status === "REVIEW_PENDING" ||
    activeSub?.status === "TEST_COMPLETED" ||
    activeSub?.status === "PENDING_UPLOAD" ||
    activeSub?.workflowStage === "EVALUATION_COMPLETED";
  const hasDossier = !!(activeSub?.uploadedFiles && activeSub.uploadedFiles.length > 0);
  const hasBatch = !!(userProfile?.batch && userProfile.batch.trim() !== "");
  const hasAssessor = !!(userProfile?.assignedPsych || userProfile?.assignedGTO || userProfile?.assignedIO || userProfile?.assignedTO);
  const allowedStagesForEval = ["full_course", "psych", "psychology", "interview", "gto", "group_testing"];
  const hasEligibleCourse = userStages.some((stage) => allowedStagesForEval.includes(stage));
  const isEligibleToStart = !!(hasBatch && hasAssessor && hasEligibleCourse);
  const hasAnyFeedbackVisible =
    !!activeSub &&
    (activeSub.status === "REPORT_RELEASED" ||
      !!activeSub.reportVisibility?.psych ||
      !!activeSub.reportVisibility?.gto ||
      !!activeSub.reportVisibility?.io ||
      !!activeSub.reportVisibility?.to);

  const evalSteps = [
    { num: 1, label: "PIQ Form" },
    { num: 2, label: "PIQ Upload" },
    { num: 3, label: "Evaluation" },
    { num: 4, label: "Dossier" },
  ].filter((step) => {
    if (hasFullOrPsych) return true;
    if (hasInterview) return step.num === 2;
    return false;
  });

  const piqDoc =
    magazines.find((m) => m.pdfTitle?.toLowerCase().includes("personal information")) ||
    magazines.find((m) => m.pdfTitle?.toLowerCase().includes("piq"));
  const dossierDoc = magazines.find((m) => m.pdfTitle?.toLowerCase().includes("dossier"));

  return (
    <>
      <section className={styles.pageSection}>
        <div className={`${styles.sidebar} ${isMobileMenuOpen ? styles.mobileOpen : ""}`}>
          <div className={styles.logoSection}>
            <img src="/assets/logo/ISV.webp" alt="SSB with ISV" className={styles.logo} />
          </div>

          <nav className={styles.navTabs}>
            {(
              [
                { key: "profile", label: "Profile", icon: <BiUser /> },
                { key: "batches", label: "My Batches", icon: <BiBook /> },
                { key: "resources", label: "My Resources", icon: <BiBook /> },
                { key: "psycheTest", label: "Candidate Evaluation", icon: <BiBrain /> },
              ] as { key: ActiveTab; label: string; icon: React.ReactNode }[]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`${styles.navTab} ${activeTab === tab.key ? styles.active : ""}`}
                onClick={() => {
                  setActiveTab(tab.key);
                  setIsMobileMenuOpen(false);
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <BiChevronRight className={styles.chevron} />
              </button>
            ))}
          </nav>

          <div className={styles.rightActions}>
            <div className={styles.profileSummary}>
              <div className={styles.profileHeader}>
                <div className={styles.avatarWrapper} onClick={() => setShowImagePopup(true)} style={{ cursor: "pointer" }}>
                  <img src={previewData?.profileImage || "/assets/profileImage.png"} alt="profile" />
                  <div className={styles.onlineIndicator}></div>
                  <div className={styles.avatarOverlay}>
                    <FaCamera />
                    <span>Change Photo</span>
                  </div>
                </div>
                <div className={styles.profileTitle}>
                  <h3>{previewData?.name}</h3>
                  <p>{previewData?.email}</p>
                </div>
              </div>
            </div>

            <button className={styles.logoutBtn} onClick={handleLogout} type="button">
              <BiLogOut /> Logout
            </button>
          </div>
        </div>

        <div>
          <div className="container position-relative z-1">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 20 }}>
              <div onClick={() => router.back()} className="arrow_button_two" style={{ cursor: "pointer" }}>
                <BiArrowBack />
              </div>
              <button
                className={styles.mobileMenuToggle}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                style={{ position: "static" }}
                type="button"
              >
                <BiUser style={{ color: "white" }} />
                <span>Menu</span>
              </button>
            </div>

            <div className={styles.dashboardContainer}>
              <div className={styles.mainContent}>
                {activeTab === "profile" && (
                  <div className={styles.tabContent}>
                    <div className={styles.tabHeader}>
                      <h2>
                        <BiUser className={styles.tabIcon} />
                        Profile Information
                      </h2>
                      {!isEditMode && (
                        <button className={styles.editBtn} onClick={() => setIsEditMode(true)} title="Edit Profile" type="button">
                          <BiEdit />
                        </button>
                      )}
                    </div>

                    {!isEditMode ? (
                      <div className={styles.infoCards}>
                        <div className={styles.infoCard}>
                          <div className={styles.cardIcon}>
                            <BiUser />
                          </div>
                          <div className={styles.cardContent}>
                            <label>Full Name</label>
                            <p>{previewData?.name}</p>
                          </div>
                        </div>

                        <div className={styles.infoCard}>
                          <div className={styles.cardIcon}>
                            <BiEnvelope />
                          </div>
                          <div className={styles.cardContent}>
                            <label>Email Address</label>
                            <div className={styles.fieldWithEdit}>
                              <p>{previewData?.email}</p>
                              <button className={styles.editFieldBtn} onClick={() => handleFieldClick("email")} title="Edit Email" type="button">
                                <BiEdit />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className={styles.infoCard}>
                          <div className={styles.cardIcon}>
                            <BiPhone />
                          </div>
                          <div className={styles.cardContent}>
                            <label>Phone Number</label>
                            <div className={styles.fieldWithEdit}>
                              <p>{previewData?.phone}</p>
                              <button className={styles.editFieldBtn} onClick={() => handleFieldClick("phone")} title="Edit Phone Number" type="button">
                                <BiEdit />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className={styles.infoCard}>
                          <div className={styles.cardIcon}>
                            <BiMap />
                          </div>
                          <div className={styles.cardContent}>
                            <label>Address</label>
                            <p>{previewData?.Address}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.editForm}>
                        <div className={styles.formGroup}>
                          <label>Full Name</label>
                          <input
                            type="text"
                            name="name"
                            className="form-control thm-input"
                            value={formData.name || ""}
                            onChange={handleInputChange}
                            placeholder="Enter your full name"
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label>Address</label>
                          <textarea
                            name="Address"
                            className="form-control thm-input"
                            value={formData.Address || ""}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="Enter your address"
                          />
                        </div>

                        <div className={styles.formActions}>
                          <button className={styles.cancelBtn} onClick={handleCancel} type="button">
                            Cancel
                          </button>
                          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving} type="button">
                            <BiSave /> {isSaving ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "batches" && (
                  <div className={styles.tabContent}>
                    <div className={styles.tabHeader}>
                      <h2>
                        <BiBook className={styles.tabIcon} />
                        My Purchased Batches
                      </h2>
                    </div>

                    <div className={styles.coursesContent}>
                      {orders.length > 0 ? (
                        <div className={styles.coursesGrid}>
                          {orders.map((order) => (
                            <div key={order._id} className={styles.courseCard}>
                              <div className={styles.courseDetails}>
                                <div className={styles.courseTitle}>
                                  <h3>Start: {formatDate(order.slotId?.startTime)}</h3>
                                  <h3>
                                    {order.slotId?.title || "Batch Session"} {order.slotId?.batchNo ? `(#${order.slotId.batchNo})` : ""}
                                  </h3>
                                </div>
                                <div className={styles.courseMeta}>
                                  <div className={styles.coursePrice}>
                                    <BiRupee />
                                    <span>{Number(order.price || 0).toFixed(2)}</span>
                                  </div>
                                  <div className={styles.courseDate}>Purchased on {formatDate(order.createdAt)}</div>
                                </div>

                                <div style={{ marginTop: 16, marginBottom: 16 }}>
                                  <span style={{ color: "#d2a100", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                                    Enrolled Courses / Modules:
                                  </span>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {order.selectedModules && order.selectedModules.length > 0 ? (
                                      order.selectedModules.map((modId) => (
                                        <span
                                          key={modId}
                                          style={{
                                            background: "rgba(210, 161, 0, 0.1)",
                                            color: "#d2a100",
                                            border: "1px solid rgba(210, 161, 0, 0.3)",
                                            padding: "4px 10px",
                                            borderRadius: 6,
                                            fontSize: "0.78rem",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {moduleNames[modId] || modId}
                                        </span>
                                      ))
                                    ) : (
                                      <span style={{ background: "rgba(210, 161, 0, 0.1)", color: "#d2a100", border: "1px solid rgba(210, 161, 0, 0.3)", padding: "4px 10px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600 }}>
                                        {order.slotId?.isFullCourse ? "10 Days SSB Hackathon (Full Course)" : "General Batch Access"}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {order.installmentPlanId && order.installmentPlanId.installments.length > 0 && (
                                  <div style={{ marginTop: 16, marginBottom: 16 }}>
                                    <span
                                      style={{
                                        color: "#d2a100",
                                        fontSize: "0.8rem",
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        display: "block",
                                        marginBottom: 8,
                                      }}
                                    >
                                      Installments:
                                    </span>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                      {order.installmentPlanId.installments.map((inst) => {
                                        const key = `${order.installmentPlanId!._id}:${inst.seq}`;
                                        const isPaid = inst.status === "paid";
                                        return (
                                          <div
                                            key={inst.seq}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "space-between",
                                              gap: 12,
                                              padding: "8px 12px",
                                              borderRadius: 6,
                                              background: "rgba(255,255,255,0.03)",
                                              border: "1px solid rgba(255,255,255,0.08)",
                                            }}
                                          >
                                            <div>
                                              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                                                Installment {inst.seq} — ₹{Number(inst.amount).toFixed(2)}
                                              </div>
                                              <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                                                {isPaid ? "Paid" : `Due ${formatDate(inst.dueDate)}`}
                                                {inst.status === "overdue" && " — Overdue"}
                                              </div>
                                              {isPaid && inst.paymentMethod && (
                                                <div style={{ fontSize: "0.7rem", opacity: 0.6, marginTop: 2 }}>
                                                  Paid via {inst.paymentMethod === "manual" ? "Manual (offline)" : "Razorpay"}
                                                  {inst.paymentReference ? ` — Ref: ${inst.paymentReference}` : ""}
                                                </div>
                                              )}
                                            </div>
                                            {isPaid ? (
                                              <FaCheckCircle style={{ color: "#2ecc71" }} title="Paid" />
                                            ) : (
                                              <button
                                                type="button"
                                                className={styles.browseCoursesBtn}
                                                disabled={payingInstallmentKey === key}
                                                onClick={() => payInstallment(order.installmentPlanId!._id, inst.seq, inst.amount)}
                                                style={{ padding: "6px 14px", fontSize: "0.85rem" }}
                                              >
                                                {payingInstallmentKey === key ? "Processing…" : "Pay Now"}
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                <div className={styles.courseOrderInfo}>
                                  <span className={styles.orderIdLabel}>Order ID:</span>
                                  <span className={styles.orderIdValue}>{order.orderId || "Manual booking/System created"}</span>
                                </div>
                                {order.paymentId && (
                                  <div className={styles.courseOrderInfo}>
                                    <span className={styles.orderIdLabel}>Payment ID:</span>
                                    <span className={styles.orderIdValue}>{order.paymentId}</span>
                                  </div>
                                )}
                                {order.couponCode && (
                                  <div className={styles.courseOrderInfo}>
                                    <span className={styles.orderIdLabel}>Coupon Used:</span>
                                    <span className={styles.orderIdValue}>{order.couponCode}</span>
                                  </div>
                                )}
                                {order.referralCode && (
                                  <div className={styles.courseOrderInfo}>
                                    <span className={styles.orderIdLabel}>Referral Code:</span>
                                    <span className={styles.orderIdValue}>{order.referralCode}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.emptyState}>
                          <BiBook className={styles.emptyIcon} />
                          <h3>No Batches Purchased Yet</h3>
                          <p>You haven&apos;t purchased any batches. Browse our batches and start learning today!</p>
                          <button className={styles.browseCoursesBtn} onClick={() => router.push("/Batches")} type="button">
                            Browse Batches
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "resources" && (
                  <div className={styles.tabContent}>
                    <div className={styles.tabHeader} style={{ display: "flex", flexWrap: "wrap", gap: 15, justifyContent: "space-between", alignItems: "center" }}>
                      <h2>
                        <BiBook className={styles.tabIcon} />
                        My Resources
                      </h2>
                      <div className="form-group" style={{ margin: 0, minWidth: 200 }}>
                        <select
                          className="form-select w-100"
                          value={selectedTag}
                          onChange={(e) => handleTagChange(e.target.value)}
                          style={{ background: "rgba(255, 255, 255, 0.05)", color: "#fff", border: "1px solid rgba(210, 161, 0, 0.3)", borderRadius: 8, padding: 10 }}
                        >
                          <option value="all">All Resources</option>
                          {uniqueCategories.map((cat) => {
                            let displayName = cat;
                            if (cat === "Magazine") displayName = "Current Affairs Magazine";
                            else if (cat === "SSBPrep") displayName = "SSB Prep Material";
                            return (
                              <option key={cat} value={cat}>
                                {displayName}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {filteredMagazines.length > 0 ? (
                      <>
                        <div className={styles.downloadsGrid}>
                          {currentMagazines.map((mag) => (
                            <div key={mag._id} className={styles.downloadCard}>
                              <div className={styles.magImage}>
                                <img
                                  src={
                                    mag.magazineFrontImage?.startsWith("/assets")
                                      ? mag.magazineFrontImage
                                      : resolveLegacyAssetUrl(mag.magazineFrontImage)
                                  }
                                  alt={mag.pdfTitle}
                                />
                              </div>
                              <div className={styles.magInfo}>
                                <h4>{mag.pdfTitle}</h4>
                                <p className={styles.magTags}>{mag.tags}</p>
                                <button
                                  onClick={() => handleViewPdf(mag.pdfFilePath, mag.pdfTitle, mag._id)}
                                  className={styles.downloadLink}
                                  style={{ border: "none", cursor: "pointer" }}
                                  type="button"
                                >
                                  <BiBook /> Read Online
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {totalPages > 1 && (
                          <div className="pdf-pagination-container">
                            <button className="pdf-pagination-btn" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} type="button">
                              Prev
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                              <button
                                key={pageNum}
                                className={`pdf-pagination-btn ${currentPage === pageNum ? "active" : ""}`}
                                onClick={() => setCurrentPage(pageNum)}
                                type="button"
                              >
                                {pageNum}
                              </button>
                            ))}
                            <button
                              className="pdf-pagination-btn"
                              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              type="button"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={styles.emptyState}>
                        <BiBook className={styles.emptyIcon} />
                        <h3>No Resources Found</h3>
                        <p>There are no resources available at the moment.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "psycheTest" && (
                  <div className={styles.tabContent}>
                    <div className={styles.tabHeader}>
                      <h2>
                        <BiBrain className={styles.tabIcon} />
                        Candidate Evaluation
                      </h2>
                    </div>

                    <div className={styles.psycheTestPanel}>
                      {hasFullOrPsych && (
                        <>
                          <p className={styles.evalIntroText}>
                            Comprehensive timed evaluation simulating real SSB conditions — including TAT, WAT, SRT and SDT modules. Follow the
                            steps below to complete your evaluation journey.
                          </p>
                          <div className={styles.evalFeatureRow}>
                            <div className={styles.evalFeatureBox}>
                              <strong>Timed Automatic Slides</strong>
                              <p>Simulates real SSB test conditions with precise timing</p>
                            </div>
                            <div className={styles.evalFeatureBox}>
                              <strong>Handwritten Answer Upload</strong>
                              <p>Write your answers on paper and upload scanned copies</p>
                            </div>
                            <div className={styles.evalFeatureBox}>
                              <strong>Expert Assessor Review</strong>
                              <p>Personalized feedback from qualified psychologists</p>
                            </div>
                            <div className={styles.evalFeatureBox}>
                              <strong>Detailed Evaluation Report</strong>
                              <p>Comprehensive psychological profile &amp; improvement areas</p>
                            </div>
                          </div>
                        </>
                      )}

                      {isGTOOnly && (
                        <p className={styles.evalIntroText}>
                          Welcome to your Group Testing (GTO) Portal. Here you can access details of your enrolled Group Testing Course, view
                          scheduled meetings, and check your assessor remarks.
                        </p>
                      )}

                      {isIOOnly && (
                        <p className={styles.evalIntroText}>
                          Welcome to your Mock Interview &amp; Interview Prep Portal. Follow the steps below to download and upload your PIQ
                          form, join your mock interview sessions, and view assessor feedback.
                        </p>
                      )}

                      <div className={styles.psycheTimelineContainer}>
                        <h4 className={styles.timelineHeader}>Evaluation Journey</h4>

                        {!isEligibleToStart ? (
                          <div className={styles.evalLockedContainer}>
                            <div className={styles.evalLockedHeader}>
                              <div className={styles.evalLockedIconWrapper}>
                                <FaLock className={styles.evalLockedIcon} />
                              </div>
                              <h3>Evaluation Portal Locked</h3>
                              <p>
                                {isGTOOnly
                                  ? "To access your scheduled GTO meetings and assessor reviews, you must have a batch and an assessor assigned to your profile."
                                  : isIOOnly
                                    ? "To access your PIQ upload, scheduled Mock Interviews, and assessor reviews, you must have a batch and an assessor assigned to your profile."
                                    : "Your candidate evaluation space is currently restricted. To access your PIQ forms, timed psychological evaluations, and assessor reviews, you must have an eligible course, a batch, and an assessor assigned to your profile."}
                              </p>
                            </div>

                            <div className={styles.evalLockedStatusList}>
                              <div className={`${styles.evalLockedStatusCard} ${hasEligibleCourse ? styles.statusSuccess : styles.statusPending}`}>
                                <div className={styles.statusCardIcon}>{hasEligibleCourse ? <FaCheckCircle /> : <FaLock />}</div>
                                <div className={styles.statusCardDetails}>
                                  <h4>Course Eligibility</h4>
                                  <p>{hasEligibleCourse ? "Eligible course assigned" : "Requires allocation of an eligible course"}</p>
                                </div>
                              </div>
                              <div className={`${styles.evalLockedStatusCard} ${hasBatch ? styles.statusSuccess : styles.statusPending}`}>
                                <div className={styles.statusCardIcon}>{hasBatch ? <FaCheckCircle /> : <FaLock />}</div>
                                <div className={styles.statusCardDetails}>
                                  <h4>Batch Allocation</h4>
                                  <p>{hasBatch ? `Assigned to Batch #${userProfile.batch}` : "Pending batch allocation by administrator"}</p>
                                </div>
                              </div>
                              <div className={`${styles.evalLockedStatusCard} ${hasAssessor ? styles.statusSuccess : styles.statusPending}`}>
                                <div className={styles.statusCardIcon}>{hasAssessor ? <FaCheckCircle /> : <FaLock />}</div>
                                <div className={styles.statusCardDetails}>
                                  <h4>Assessor Configuration</h4>
                                  <p>{hasAssessor ? "Assessors configured on your profile" : "Pending assessor allocation for test review"}</p>
                                </div>
                              </div>
                            </div>

                            <div className={styles.evalLockedFooter}>
                              <span>For assistance, please contact SSB With ISV Support or your administrator.</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            {evalSteps.length > 0 && (
                              <div className={styles.evalTabBar}>
                                {evalSteps.map((step) => {
                                  const stepCompleted: Record<number, boolean> = {
                                    1: true,
                                    2: hasInterview && !hasFullOrPsych ? isPiq1Uploaded : isPiq1Uploaded && isPiq2Uploaded,
                                    3: isTestCompleted,
                                    4: hasDossier,
                                  };
                                  const isActive = evalActiveStep === step.num;
                                  const isCompleted = stepCompleted[step.num];
                                  let tabClass = styles.evalTab;
                                  if (isActive) tabClass += ` ${styles.evalTabActive}`;
                                  if (isCompleted && !isActive) tabClass += ` ${styles.evalTabCompleted}`;
                                  return (
                                    <button key={step.num} type="button" className={tabClass} onClick={() => setEvalActiveStep(step.num)}>
                                      <span className={styles.evalTabNum}>{isCompleted ? <FaCheckCircle style={{ fontSize: "0.7rem" }} /> : step.num}</span>
                                      {step.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            <div className={styles.evalTabContent}>
                              {hasGTO && !hasInterview && !hasFullOrPsych && (
                                <div className={styles.evalStepCard}>
                                  <h5>Group Testing Course</h5>
                                  <p>
                                    The timed psychological test battery and PIQ forms are not required for your enrolled course (Group Testing
                                    Course on VTX<sup>TM</sup>).
                                  </p>
                                  <p style={{ color: "#aaa", fontSize: "0.9rem", marginTop: 10 }}>
                                    You can join your scheduled GTO meetings and access your assessor remarks under Final Assessment Remarks once
                                    released.
                                  </p>
                                </div>
                              )}

                              {evalActiveStep === 1 && hasFullOrPsych && (
                                <div className={styles.evalStepCard}>
                                  <h5>Download PIQ Form</h5>
                                  <p>Download and print your empty Personal Information Questionnaire. Fill it out by hand and keep it ready for the next step.</p>
                                  <div className={styles.evalStepActions}>
                                    {piqDoc ? (
                                      <a href={resolveLegacyAssetUrl(piqDoc.pdfFilePath)} target="_blank" rel="noopener noreferrer" className={styles.stepDownloadLink} download="Blank_PIQ_Form.pdf">
                                        <BiDownload /> Download PIQ Form
                                      </a>
                                    ) : (
                                      <span style={{ color: "#aaa" }}>PIQ form not available yet.</span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {evalActiveStep === 2 && (hasFullOrPsych || hasInterview) && (
                                <div className={styles.evalStepCard}>
                                  <h5>{isIOOnly ? "PIQ Document Upload" : "PIQ Document Uploads"}</h5>

                                  {isIOOnly && (
                                    <div style={{ background: "rgba(210, 161, 0, 0.05)", border: "1px solid rgba(210, 161, 0, 0.2)", padding: 16, borderRadius: 12 }}>
                                      <h6 style={{ color: "#d2a100", margin: "0 0 6px 0", fontSize: "0.95rem", fontWeight: "bold" }}>About PIQ 1 (Initial Assessment PIQ):</h6>
                                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#ccc", lineHeight: 1.4 }}>
                                        This form is crucial for your Mock Interview. It helps the Interviewing Officer (IO) understand your
                                        educational background, accomplishments, hobbies, and sports activities to formulate highly personalized
                                        questions.
                                      </p>
                                    </div>
                                  )}

                                  <p>
                                    {isIOOnly
                                      ? "For your Mock Interview, you must upload your Initial Assessment PIQ (PIQ 1). (Max size: 500 KB per file)"
                                      : "Each candidate must upload two PIQs: Initial Assessment (PIQ 1) and Final/Interview Preparation (PIQ 2). (Max size: 500 KB per file)"}
                                  </p>

                                  {isIOOnly && (
                                    <div className={styles.evalStepActions}>
                                      {piqDoc ? (
                                        <a
                                          href={resolveLegacyAssetUrl(piqDoc.pdfFilePath)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={styles.stepDownloadLink}
                                          download="Blank_PIQ_Form.pdf"
                                        >
                                          <BiDownload /> Download Blank PIQ Form
                                        </a>
                                      ) : (
                                        <span style={{ color: "#aaa" }}>PIQ form not available yet.</span>
                                      )}
                                      <button
                                        className={styles.stepActionButton}
                                        style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
                                        type="button"
                                        onClick={() => router.push("/Batches")}
                                      >
                                        Browse More Courses
                                      </button>
                                    </div>
                                  )}

                                  <input
                                    type="file"
                                    ref={piqInputRef}
                                    style={{ display: "none" }}
                                    accept="image/*,application/pdf"
                                    multiple
                                    onChange={handlePiqFileSelected}
                                  />

                                  <div style={{ display: "flex", flexDirection: "column", gap: 25, marginTop: 20 }}>
                                    <div style={{ padding: 15, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
                                      <h6 style={{ color: "#d2a100", margin: "0 0 8px 0" }}>PIQ 1: Initial Assessment PIQ</h6>
                                      <div className={styles.evalStepActions}>
                                        <button
                                          className={styles.stepActionButton}
                                          type="button"
                                          onClick={() => {
                                            setUploadPiqType("piq1");
                                            setTimeout(() => piqInputRef.current?.click(), 50);
                                          }}
                                          disabled={isPiqUploading || isPiq1Uploaded}
                                        >
                                          {isPiqUploading && uploadPiqType === "piq1" ? "Uploading..." : isPiq1Uploaded ? "PIQ 1 Uploaded" : "Upload PIQ 1"}
                                        </button>
                                      </div>
                                      {isPiq1Uploaded && (
                                        <div style={{ marginTop: 10 }}>
                                          <div className={styles.evalStepCompleted}>
                                            <FaCheckCircle style={{ color: isPiq1Verified ? "green" : "orange" }} />{" "}
                                            {isPiq1Verified ? "PIQ 1 Verified" : "PIQ 1 Uploaded (Verification Pending)"}
                                          </div>
                                          {piq1Files.length > 0 && (
                                            <div style={{ marginTop: 10, fontSize: "0.8rem", color: "#888" }}>{piq1Files.length} file(s) uploaded</div>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {!isIOOnly && (
                                      <div
                                        style={{
                                          padding: 15,
                                          border: "1px solid rgba(255,255,255,0.1)",
                                          borderRadius: 12,
                                          background: "rgba(255,255,255,0.02)",
                                          opacity: isPiq1Verified ? 1 : 0.5,
                                        }}
                                      >
                                        <h6 style={{ color: "#d2a100", margin: "0 0 8px 0" }}>PIQ 2: Final/Interview Preparation PIQ</h6>
                                        <div className={styles.evalStepActions}>
                                          <button
                                            className={styles.stepActionButton}
                                            type="button"
                                            onClick={() => {
                                              if (!isPiq1Verified) {
                                                toast.error("PIQ 2 can only be uploaded after PIQ 1 has been verified.");
                                                return;
                                              }
                                              setUploadPiqType("piq2");
                                              setTimeout(() => piqInputRef.current?.click(), 50);
                                            }}
                                            disabled={isPiqUploading || !isPiq1Verified || isPiq2Uploaded}
                                          >
                                            {isPiqUploading && uploadPiqType === "piq2" ? "Uploading..." : isPiq2Uploaded ? "PIQ 2 Uploaded" : "Upload PIQ 2"}
                                          </button>
                                        </div>
                                        {isPiq2Uploaded && (
                                          <div style={{ marginTop: 10 }}>
                                            <div className={styles.evalStepCompleted}>
                                              <FaCheckCircle style={{ color: isPiq2Verified ? "green" : "orange" }} /> {isPiq2Verified ? "PIQ 2 Verified" : "PIQ 2 Uploaded"}
                                            </div>
                                            {piq2Files.length > 0 && (
                                              <div style={{ marginTop: 10, fontSize: "0.8rem", color: "#888" }}>{piq2Files.length} file(s) uploaded</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {evalActiveStep === 3 && hasFullOrPsych && (
                                <div className={styles.evalStepCard}>
                                  <h5>Candidate Evaluation</h5>
                                  <p>Download the blank Psychology Dossier sheet to write your answers during the evaluation. Then, start and complete your timed online psychological test.</p>
                                  <div className={styles.evalStepActions} style={{ marginBottom: 20 }}>
                                    {dossierDoc ? (
                                      <a href={resolveLegacyAssetUrl(dossierDoc.pdfFilePath)} target="_blank" rel="noopener noreferrer" className={styles.stepDownloadLink} download="Blank_Sheet_Psychology.pdf">
                                        <BiDownload /> Download Psychology Dossier
                                      </a>
                                    ) : (
                                      <span style={{ color: "#aaa" }}>Dossier sheet not available yet.</span>
                                    )}
                                  </div>

                                  {isTestCompleted ? (
                                    <button className={styles.stepActionButton} style={{ backgroundColor: "green", cursor: "not-allowed", opacity: 0.8 }} disabled type="button">
                                      Evaluation Completed
                                    </button>
                                  ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 15, width: "100%" }}>
                                      <div style={{ padding: 15, background: "rgba(210, 161, 0, 0.05)", border: "1px solid rgba(210, 161, 0, 0.2)", borderRadius: 12 }}>
                                        <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", margin: 0 }}>
                                          <input
                                            type="checkbox"
                                            checked={hasCompletedTheory}
                                            onChange={(e) => setHasCompletedTheory(e.target.checked)}
                                            style={{ marginTop: 5, width: 18, height: 18 }}
                                          />
                                          <span style={{ fontSize: "0.9rem", color: "#ccc", lineHeight: 1.5 }}>
                                            <strong style={{ color: "#d2a100", display: "block", marginBottom: 4 }}>Psychology Test Attempt Confirmation:</strong>
                                            I confirm that I have completed the theory sessions of Psychology Tests and consent to start my official evaluation.
                                          </span>
                                        </label>
                                      </div>
                                      <div>
                                        <button
                                          className={styles.stepActionButton}
                                          type="button"
                                          onClick={handleStartEvaluation}
                                          disabled={!hasCompletedTheory || isRegisteringConsent}
                                        >
                                          {isRegisteringConsent ? "Starting..." : "Start Candidate Evaluation"}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {evalActiveStep === 4 && hasFullOrPsych && (
                                <div className={styles.evalStepCard}>
                                  <h5>Dossier Management</h5>
                                  <p>Once the evaluation is completed, upload your handwritten dossier sheets here. (Max size: 2 MB per file)</p>

                                  {isTestCompleted && (
                                    <div className={styles.evalStepActions} style={{ marginTop: 20 }}>
                                      {!hasDossier ? (
                                        <>
                                          <input
                                            type="file"
                                            ref={dossierInputRef}
                                            style={{ display: "none" }}
                                            accept="image/*,application/pdf"
                                            multiple
                                            onChange={handleDossierFileSelected}
                                          />
                                          <button className={styles.stepActionButton} type="button" onClick={() => dossierInputRef.current?.click()} disabled={isDossierUploading}>
                                            {isDossierUploading ? "Uploading..." : "Upload Completed Dossier"}
                                          </button>
                                        </>
                                      ) : (
                                        <div className={styles.evalStepCompleted}>
                                          <FaCheckCircle /> Dossier uploaded successfully
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {isTestCompleted && hasDossier && (
                                    <div style={{ marginTop: 25, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                                      <h6 style={{ color: "#d2a100", marginBottom: 8 }}>Assessor Review Status</h6>
                                      <div className={styles.evalStepActions}>
                                        {activeSub?.status === "REPORT_RELEASED" ? (
                                          <div className={styles.evalStepCompleted}>
                                            <FaCheckCircle /> Your evaluation report has been released
                                          </div>
                                        ) : (
                                          <div className={styles.evalStepPending}>⏳ Waiting for evaluation / assessor review to complete</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {hasAnyFeedbackVisible && (
                              <div style={{ marginTop: 35, textAlign: "center" }}>
                                <button className={styles.finalRemarksBtn} type="button" onClick={() => setShowFeedbackModal(true)}>
                                  <BiBrain /> Final Assessment Remarks
                                </button>
                              </div>
                            )}

                            {!isGTOOnly && activeSub && (
                              <div className={styles.submissionsSection}>
                                {!isIOOnly && <h4 className={styles.submissionsSectionTitle}>Your Psych Tests</h4>}
                                <div className={styles.submissionCard}>
                                  <div className={styles.submissionCardHeader}>
                                    <h5>
                                      {isIOOnly
                                        ? "Mock Interview Status"
                                        : (typeof activeSub.assessmentId === "object" ? activeSub.assessmentId?.title : undefined) ||
                                          "Psychological Test Battery"}
                                    </h5>
                                    <span
                                      className={`${styles.submissionStatusPill} ${
                                        (isIOOnly ? activeSub.ioStatus : activeSub.status) === "COMPLETED" ? styles.statusDone : styles.statusWaiting
                                      }`}
                                    >
                                      {(isIOOnly ? activeSub.ioStatus : activeSub.status) || "PENDING"}
                                    </span>
                                  </div>

                                  {activeSubMeetings.map((m, idx) => (
                                    <div key={idx} className={styles.meetingCard}>
                                      <div className={styles.meetingCardInfo}>
                                        <div className={styles.meetingCardIcon}>
                                          <BiCalendar />
                                        </div>
                                        <div>
                                          <h6>
                                            {m.role === assessorLabel("IO") ? `${m.role} Mock Interview` : `${m.role} Feedback Session`}
                                          </h6>
                                          {m.date ? (
                                            <p>
                                              <BiTime /> Scheduled: {formatDate(m.date)} at {formatTime(m.date)}
                                            </p>
                                          ) : (
                                            <p style={{ fontStyle: "italic" }}>Meeting schedule pending</p>
                                          )}
                                        </div>
                                      </div>
                                      <a href={m.link} target="_blank" rel="noopener noreferrer" className={styles.joinMeetingBtn}>
                                        Join Meeting
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {loadingPsych && (
                        <div className={styles.loadingState}>
                          <div className="spinner-border text-warning" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <ImageUploadPopup
        isOpen={showImagePopup}
        onClose={handleCancelImage}
        onSave={handleImageUpload}
        previewImage={imagePreview}
        existingImage={previewData?.profileImage}
        selectedImage={selectedImage}
        onImageChange={handleImageChange}
        isUploading={isUploading}
      />

      {otpField && (
        <div className={styles.overlay}>
          <div className={styles.popup}>
            <button className={styles.closeBtn} onClick={handleCloseOtpPopup} type="button">
              ×
            </button>
            <div className={styles.header}>
              <h3>Update {otpField === "phone" ? "Phone Number" : "Email Address"}</h3>
            </div>
            <div className={styles.content}>
              <div className={styles.valueDisplay}>
                <span className={styles.label}>Current {otpField === "phone" ? "Phone" : "Email"}:</span>
                <span className={styles.value}>{oldValue}</span>
              </div>

              {!otpSent ? (
                <div className={styles.form}>
                  <div className={styles.formGroup}>
                    <label>New {otpField === "phone" ? "Phone Number" : "Email Address"}</label>
                    <input
                      type={otpField === "phone" ? "tel" : "email"}
                      className={styles.input}
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder={otpField === "phone" ? "10-digit phone number" : "you@example.com"}
                      disabled={isVerifying}
                    />
                  </div>
                  {otpError && <p className={styles.errorMessage}>{otpError}</p>}
                  <button className={styles.submitBtn} onClick={handleSendOtp} disabled={isVerifying} type="button">
                    {isVerifying ? "Sending..." : "Send OTP"}
                  </button>
                </div>
              ) : (
                <div className={styles.form}>
                  <p className={styles.note}>Enter the 6-digit OTP sent to {newValue}</p>
                  <div className={styles.otpInputGroup}>
                    <input
                      type="text"
                      className={styles.otpInput}
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      disabled={isVerifying}
                    />
                  </div>
                  {otpError && <p className={styles.errorMessage}>{otpError}</p>}
                  <button className={styles.submitBtn} onClick={handleVerifyOtp} disabled={isVerifying} type="button">
                    {isVerifying ? "Verifying..." : "Verify & Update"}
                  </button>
                  <button className={styles.resendBtn} onClick={handleSendOtp} disabled={isVerifying} type="button">
                    Resend OTP
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal &&
        (() => {
          const sub = activeSub;
          const psychRemarks = sub?.releasedPsychRemarks || sub?.psychRemarks || sub?.assessorRemarks || "";
          const gtoRemarks = sub?.releasedGtoRemarks || sub?.gtoRemarks || "";
          const ioRemarks = sub?.releasedIoRemarks || sub?.ioRemarks || "";
          const toRemarks = sub?.releasedToRemarks || sub?.toRemarks || "";

          const hasPsych = !!(userProfile?.assignedPsych && psychRemarks && (sub?.status === "REPORT_RELEASED" || sub?.reportVisibility?.psych));
          const hasGto = !!(userProfile?.assignedGTO && gtoRemarks && (sub?.status === "REPORT_RELEASED" || sub?.reportVisibility?.gto));
          const hasIo = !!(userProfile?.assignedIO && ioRemarks && (sub?.status === "REPORT_RELEASED" || sub?.reportVisibility?.io));
          const hasTo = !!(userProfile?.assignedTO && toRemarks && (sub?.status === "REPORT_RELEASED" || sub?.reportVisibility?.to));
          const anySection = hasPsych || hasGto || hasIo || hasTo;

          return (
            <div className={styles.feedbackOverlay} onClick={() => setShowFeedbackModal(false)}>
              <div className={styles.feedbackModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.feedbackModalHeader}>
                  <div>
                    <h2>Final Assessor Feedback</h2>
                    <span>SSB Evaluation Portfolio</span>
                  </div>
                  <button className={styles.feedbackModalClose} onClick={() => setShowFeedbackModal(false)} type="button">
                    <BiX />
                  </button>
                </div>
                <div className={styles.feedbackModalBody}>
                  {hasPsych && (
                    <div className={styles.feedbackSection}>
                      <h4 className={styles.feedbackSectionTitle}>{assessorLabel("Psych")} Remarks</h4>
                      <p className={styles.feedbackSectionBody}>{psychRemarks}</p>
                    </div>
                  )}
                  {hasGto && (
                    <div className={styles.feedbackSection}>
                      <h4 className={styles.feedbackSectionTitle}>{assessorLabel("GTO")} Remarks</h4>
                      <p className={styles.feedbackSectionBody}>{gtoRemarks}</p>
                    </div>
                  )}
                  {hasIo && (
                    <div className={styles.feedbackSection}>
                      <h4 className={styles.feedbackSectionTitle}>{assessorLabel("IO")} Remarks</h4>
                      <p className={styles.feedbackSectionBody}>{ioRemarks}</p>
                    </div>
                  )}
                  {hasTo && (
                    <div className={styles.feedbackSection}>
                      <h4 className={styles.feedbackSectionTitle}>{assessorLabel("TO")} Remarks</h4>
                      <p className={styles.feedbackSectionBody}>{toRemarks}</p>
                    </div>
                  )}
                  {!anySection && (
                    <div className={styles.feedbackEmpty}>Your evaluation report has been released, but no written remarks are available yet.</div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {viewingPdf && (
        <div className={styles.overlay} style={{ zIndex: 99999 }}>
          <div className={styles.popup} style={{ maxWidth: "900px", width: "95%", height: "90vh", display: "flex", flexDirection: "column" }}>
            <button className={styles.closeBtn} onClick={() => setViewingPdf(null)} type="button">
              ×
            </button>
            <div className={styles.header}>
              <h3>{viewingPdf.title}</h3>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <PdfViewer url={viewingPdf.url} title={viewingPdf.title} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
