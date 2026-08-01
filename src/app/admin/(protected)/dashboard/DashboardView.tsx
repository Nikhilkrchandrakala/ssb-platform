"use client";

import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  LineChart,
  AlertTriangle,
  Award,
  History,
  Presentation,
  Users,
  Save,
  Headset,
  MessageCircle,
  Phone,
  CheckCircle2,
  Boxes,
  PlayCircle,
  Check,
  Megaphone,
  PlusCircle,
  UploadCloud,
  Clock,
  Images,
  Trash2,
} from "lucide-react";
import "@/app/admin/styles/legacy-dashboard.css";

const ICON_STYLE = { verticalAlign: -2 };

interface NumberMonitorEntry {
  _id: string;
  officerSelection: string | number;
  yearService: string | number;
  facultyExperience: string | number;
  totalFaculty: string | number;
}

interface AuthDisplaySettings {
  mode: "slideshow" | "ad";
  slideshowImages: string[];
  adImage: string;
  adLink: string;
  transitionValue: number;
  transitionUnit: "seconds" | "minutes" | "hours" | "days";
}

async function putJSON(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    // no-op
  }
  if (!res.ok) {
    throw new Error((data?.message as string) || "Request failed");
  }
  return data;
}

export default function DashboardView() {
  // ── Number Monitor (platform stat counters) ──
  const [entries, setEntries] = useState<NumberMonitorEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  // ── Contact Settings ──
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [callNumber, setCallNumber] = useState("");

  // ── Auth Display Settings ──
  const [authMode, setAuthMode] = useState<"slideshow" | "ad">("slideshow");
  const [slideshowImages, setSlideshowImages] = useState<string[]>([]);
  const [adImage, setAdImage] = useState("");
  const [adLink, setAdLink] = useState("");
  const [transitionValue, setTransitionValue] = useState(5);
  const [transitionUnit, setTransitionUnit] = useState<"seconds" | "minutes" | "hours" | "days">("seconds");
  const slideshowFilesInputRef = useRef<HTMLInputElement>(null);
  const adFileInputRef = useRef<HTMLInputElement>(null);
  const authCardRef = useRef<HTMLDivElement>(null);

  const reloadEntries = () => {
    setEntriesLoading(true);
    fetch("/api/allNumberMonitors")
      .then((res) => res.json())
      .then((data: NumberMonitorEntry[]) => {
        setEntries(Array.isArray(data) ? data : []);
        setEntriesError(null);
      })
      .catch((err) => setEntriesError(err instanceof Error ? err.message : "Failed to load statistics"))
      .finally(() => setEntriesLoading(false));
  };

  const reloadContactSettings = () => {
    fetch("/api/contactSettings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setWhatsappNumber(data.whatsappNumber || "");
          setCallNumber(data.callNumber || "");
        }
      })
      .catch((err) => console.error("Error fetching contact settings:", err));
  };

  const reloadAuthDisplaySettings = () => {
    fetch("/api/authDisplaySettings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AuthDisplaySettings | null) => {
        if (data) {
          setAuthMode(data.mode || "slideshow");
          setSlideshowImages(data.slideshowImages || []);
          setAdImage(data.adImage || "");
          setAdLink(data.adLink || "");
          setTransitionValue(data.transitionValue !== undefined ? data.transitionValue : 5);
          setTransitionUnit(data.transitionUnit || "seconds");
        }
      })
      .catch((err) => console.error("Error fetching auth display settings:", err));
  };

  // Initial load
  useEffect(() => {
    let cancelled = false;

    fetch("/api/allNumberMonitors")
      .then((res) => res.json())
      .then((data: NumberMonitorEntry[]) => {
        if (cancelled) return;
        setEntries(Array.isArray(data) ? data : []);
        setEntriesError(null);
      })
      .catch((err) => {
        if (!cancelled) setEntriesError(err instanceof Error ? err.message : "Failed to load statistics");
      })
      .finally(() => {
        if (!cancelled) setEntriesLoading(false);
      });

    fetch("/api/contactSettings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setWhatsappNumber(data.whatsappNumber || "");
        setCallNumber(data.callNumber || "");
      })
      .catch((err) => console.error("Error fetching contact settings:", err));

    fetch("/api/authDisplaySettings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AuthDisplaySettings | null) => {
        if (cancelled || !data) return;
        setAuthMode(data.mode || "slideshow");
        setSlideshowImages(data.slideshowImages || []);
        setAdImage(data.adImage || "");
        setAdLink(data.adLink || "");
        setTransitionValue(data.transitionValue !== undefined ? data.transitionValue : 5);
        setTransitionUnit(data.transitionUnit || "seconds");
      })
      .catch((err) => console.error("Error fetching auth display settings:", err));

    return () => {
      cancelled = true;
    };
  }, []);

  // Smooth scroll to auth display card if hash matches
  useEffect(() => {
    const checkHashAndScroll = () => {
      if (window.location.hash === "#authDisplaySettingsCard" && authCardRef.current) {
        const card = authCardRef.current;
        setTimeout(() => {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.style.transition = "box-shadow 0.5s ease-in-out, border-color 0.5s ease-in-out";
          card.style.boxShadow = "0 0 25px rgba(224, 194, 20, 0.5)";
          card.style.borderColor = "var(--primary-gold)";
          setTimeout(() => {
            card.style.boxShadow = "";
            card.style.borderColor = "";
          }, 2000);
        }, 300);
      }
    };
    window.addEventListener("hashchange", checkHashAndScroll);
    checkHashAndScroll();
    return () => window.removeEventListener("hashchange", checkHashAndScroll);
  }, []);

  const updateEntryField = (id: string, field: keyof NumberMonitorEntry, value: string) => {
    setEntries((prev) => prev.map((e) => (e._id === id ? { ...e, [field]: value } : e)));
  };

  const saveEntry = async (id: string) => {
    const entry = entries.find((e) => e._id === id);
    if (!entry) return;
    try {
      const res = await fetch(`/api/updateNumberMonitor/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officerSelection: entry.officerSelection,
          yearService: entry.yearService,
          facultyExperience: entry.facultyExperience,
          totalFaculty: entry.totalFaculty,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Update failed");
      window.Swal?.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Stats updated successfully",
        showConfirmButton: false,
        timer: 2000,
        background: "#1a1a1a",
        color: "#fff",
      });
      reloadEntries();
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Save Failed",
        text: error instanceof Error ? error.message : "Update failed",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  };

  const submitContactSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await putJSON("/api/contactSettings", { whatsappNumber, callNumber });
      window.Swal?.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Contact settings updated successfully",
        showConfirmButton: false,
        timer: 2000,
        background: "#1a1a1a",
        color: "#fff",
      });
      reloadContactSettings();
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Save Failed",
        text: error instanceof Error ? error.message : "Update failed",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  };

  const toggleAuthMode = async (mode: "slideshow" | "ad") => {
    setAuthMode(mode);
    try {
      const res = await fetch("/api/authDisplaySettings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        window.Swal?.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: `Switched to ${mode.toUpperCase()} display mode`,
          showConfirmButton: false,
          timer: 1500,
          background: "#1a1a1a",
          color: "#fff",
        });
      }
    } catch (error) {
      console.error("Error saving mode selection:", error);
    }
  };

  const submitTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitionValue || transitionValue < 1) {
      window.Swal?.fire({
        icon: "warning",
        title: "Invalid Value",
        text: "Please enter a transition duration of at least 1.",
        background: "#1a1a1a",
        color: "#fff",
      });
      return;
    }
    try {
      await putJSON("/api/authDisplaySettings", { transitionValue, transitionUnit });
      window.Swal?.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `Slideshow will rotate every ${transitionValue} ${transitionUnit}`,
        showConfirmButton: false,
        timer: 2000,
        background: "#1a1a1a",
        color: "#fff",
      });
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Save Failed",
        text: error instanceof Error ? error.message : "Failed to save transition settings",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  };

  const submitSlideshowUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const files = slideshowFilesInputRef.current?.files;
    if (!files || files.length === 0) return;

    if (slideshowImages.length + files.length > 10) {
      window.Swal?.fire({
        icon: "error",
        title: "Limit Exceeded",
        text: `You can only upload up to 10 images total. Current: ${slideshowImages.length}, Selected: ${files.length}.`,
        background: "#1a1a1a",
        color: "#fff",
      });
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("images", files[i]);
    }

    window.Swal?.fire({
      title: "Uploading...",
      text: "Please wait while we save your slideshow images",
      allowOutsideClick: false,
      didOpen: () => window.Swal?.showLoading(),
      background: "#1a1a1a",
      color: "#fff",
    });

    try {
      const res = await fetch("/api/authDisplaySettings/uploadSlideshow", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Upload failed");
      window.Swal?.fire({
        icon: "success",
        title: "Uploaded!",
        text: "Slideshow images successfully added.",
        background: "#1a1a1a",
        color: "#fff",
      });
      if (slideshowFilesInputRef.current) slideshowFilesInputRef.current.value = "";
      reloadAuthDisplaySettings();
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Upload Failed",
        text: error instanceof Error ? error.message : "Upload failed",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  };

  const deleteSlideshowImage = async (imageUrl: string) => {
    const confirm = await window.Swal?.fire({
      title: "Are you sure?",
      text: "This image will be permanently removed from the slideshow.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      background: "#1a1a1a",
      color: "#fff",
      confirmButtonColor: "#dc3545",
    });
    if (!confirm?.isConfirmed) return;

    try {
      const res = await fetch("/api/authDisplaySettings/deleteSlideshowImage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (!res.ok) throw new Error("Failed to delete slideshow image");
      window.Swal?.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Image deleted successfully",
        showConfirmButton: false,
        timer: 1500,
        background: "#1a1a1a",
        color: "#fff",
      });
      reloadAuthDisplaySettings();
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Delete Failed",
        text: error instanceof Error ? error.message : "Failed to delete slideshow image",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  };

  const submitAdUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    window.Swal?.fire({
      title: "Saving Advertisement...",
      text: "Please wait while we save your ad configuration",
      allowOutsideClick: false,
      didOpen: () => window.Swal?.showLoading(),
      background: "#1a1a1a",
      color: "#fff",
    });

    try {
      const files = adFileInputRef.current?.files;
      if (files && files.length > 0) {
        const fileFormData = new FormData();
        fileFormData.append("image", files[0]);
        const uploadRes = await fetch("/api/authDisplaySettings/uploadAd", {
          method: "POST",
          body: fileFormData,
        });
        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json();
          throw new Error(uploadErr.message || "Failed to upload advertisement image");
        }
      }

      const linkRes = await fetch("/api/authDisplaySettings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adLink }),
      });
      const result = await linkRes.json();
      if (!linkRes.ok) throw new Error(result.message || "Link update failed");

      window.Swal?.fire({
        icon: "success",
        title: "Saved!",
        text: "Advertisement configured successfully.",
        background: "#1a1a1a",
        color: "#fff",
      });
      if (adFileInputRef.current) adFileInputRef.current.value = "";
      reloadAuthDisplaySettings();
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Save Failed",
        text: error instanceof Error ? error.message : "Save failed",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  };

  return (
    <div className="dashboard-container">
      {/* Main Page Title */}
      <header className="dashboard-header">
        <div className="dashboard-title-area">
          <h1>
            <LayoutDashboard size={20} style={{ ...ICON_STYLE, color: "var(--primary-gold)" }} /> Executive Content Dashboard
          </h1>
          <p className="dashboard-subtitle">
            Manage live public landing page metrics, support channels, and authentication screen visual branding.
          </p>
        </div>
      </header>

      {/* ── Section 1: Number Monitor (Platform Statistics Grid) ── */}
      <section className="mb-5">
        <h2 className="dashboard-section-title">
          <LineChart size={18} style={{ ...ICON_STYLE, color: "var(--primary-gold)" }} /> Live Landing Page Stat Counters
        </h2>

        {entriesLoading ? (
          <div className="dashboard-card text-center py-5">
            <div className="spinner-border text-warning mb-3" role="status"></div>
            <p className="text-muted mb-0">Synchronizing live statistical metrics...</p>
          </div>
        ) : entriesError ? (
          <div className="dashboard-card text-center py-5 border-danger">
            <AlertTriangle size={48} className="text-danger mb-3" />
            <p className="text-danger fw-bold mb-0">{entriesError}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="dashboard-card text-center py-5">
            <p className="text-muted mb-0">No statistical records initialized yet.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry._id}>
              <div className="stat-cards-grid">
                {/* Card 1: Candidates Recommended */}
                <div className="stat-card-item">
                  <div className="stat-card-header">
                    <div className="stat-icon-box">
                      <Award size={20} />
                    </div>
                    <h3 className="stat-card-label">Candidates Recommended</h3>
                  </div>
                  <div className="stat-card-body">
                    <input
                      type="text"
                      className="stat-input-field"
                      value={entry.officerSelection}
                      onChange={(e) => updateEntryField(entry._id, "officerSelection", e.target.value)}
                      title="Total Recommended Officers"
                    />
                  </div>
                </div>

                {/* Card 2: Track Record */}
                <div className="stat-card-item">
                  <div className="stat-card-header">
                    <div className="stat-icon-box">
                      <History size={20} />
                    </div>
                    <h3 className="stat-card-label">Track Record (Years)</h3>
                  </div>
                  <div className="stat-card-body">
                    <input
                      type="number"
                      className="stat-input-field"
                      value={entry.yearService}
                      onChange={(e) => updateEntryField(entry._id, "yearService", e.target.value)}
                      title="Years of Proven Excellence"
                    />
                  </div>
                </div>

                {/* Card 3: Faculty Experience */}
                <div className="stat-card-item">
                  <div className="stat-card-header">
                    <div className="stat-icon-box">
                      <Presentation size={20} />
                    </div>
                    <h3 className="stat-card-label">Faculty Expertise (Years)</h3>
                  </div>
                  <div className="stat-card-body">
                    <input
                      type="number"
                      className="stat-input-field"
                      value={entry.facultyExperience}
                      onChange={(e) => updateEntryField(entry._id, "facultyExperience", e.target.value)}
                      title="Combined Faculty Wisdom"
                    />
                  </div>
                </div>

                {/* Card 4: Total Faculty */}
                <div className="stat-card-item">
                  <div className="stat-card-header">
                    <div className="stat-icon-box">
                      <Users size={20} />
                    </div>
                    <h3 className="stat-card-label">Total Faculty Strength</h3>
                  </div>
                  <div className="stat-card-body">
                    <input
                      type="number"
                      className="stat-input-field"
                      value={entry.totalFaculty}
                      onChange={(e) => updateEntryField(entry._id, "totalFaculty", e.target.value)}
                      title="Number of Specialist Assessors"
                    />
                  </div>
                </div>
              </div>

              <div className="text-end">
                <button
                  type="button"
                  className="thm-btn py-3 px-5 fw-bold"
                  style={{ borderRadius: "12px", fontSize: "1rem" }}
                  onClick={() => saveEntry(entry._id)}
                >
                  <Save size={16} className="me-2" style={ICON_STYLE} /> Save All Public Counters
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <hr style={{ borderColor: "rgba(224, 194, 20, 0.15)", margin: "45px 0" }} />

      {/* ── Section 2: Support Contact Channels ── */}
      <section className="mb-5">
        <h2 className="dashboard-section-title">
          <Headset size={18} style={{ ...ICON_STYLE, color: "var(--primary-gold)" }} /> Support & Hotline Channels
        </h2>
        <div className="dashboard-card mb-0">
          <form onSubmit={submitContactSettings}>
            <div className="support-channels-grid">
              <div className="support-input-box">
                <div className="support-channel-header whatsapp">
                  <MessageCircle size={18} style={{ ...ICON_STYLE, color: "#2ed573" }} />
                  <span>WhatsApp Support Hotline</span>
                </div>
                <label className="admin-form-label d-block text-muted mb-2" style={{ fontSize: "0.82rem" }}>
                  10-Digit Mobile Number (e.g., 8420422821)
                </label>
                <input
                  type="text"
                  className="admin-input"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    padding: "12px 16px",
                    borderRadius: "10px",
                  }}
                  placeholder="Enter 10 digit WhatsApp number"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                />
              </div>

              <div className="support-input-box">
                <div className="support-channel-header phone">
                  <Phone size={18} style={{ ...ICON_STYLE, color: "var(--primary-gold)" }} />
                  <span>Voice Call Support Number</span>
                </div>
                <label className="admin-form-label d-block text-muted mb-2" style={{ fontSize: "0.82rem" }}>
                  10-Digit Helpline Number (e.g., 7483617249)
                </label>
                <input
                  type="text"
                  className="admin-input"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    padding: "12px 16px",
                    borderRadius: "10px",
                  }}
                  placeholder="Enter 10 digit phone number"
                  required
                  value={callNumber}
                  onChange={(e) => setCallNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="text-end mt-3">
              <button
                type="submit"
                className="thm-btn py-3 px-5 fw-bold"
                style={{ borderRadius: "12px", fontSize: "0.95rem" }}
              >
                <CheckCircle2 size={16} className="me-2" style={ICON_STYLE} /> Update Support Contacts
              </button>
            </div>
          </form>
        </div>
      </section>

      <hr style={{ borderColor: "rgba(224, 194, 20, 0.15)", margin: "45px 0" }} />

      {/* ── Section 3: Auth Split-Screen Graphic Settings ── */}
      <section id="authDisplaySettingsCard" ref={authCardRef}>
        <h2 className="dashboard-section-title">
          <Boxes size={18} style={{ ...ICON_STYLE, color: "var(--primary-gold)" }} /> Auth Portal Graphic & Marketing Hub
        </h2>
        <div className="dashboard-card">
          <p className="text-muted mb-4" style={{ fontSize: "0.9rem" }}>
            Customize the live high-definition split-screen graphics seen by candidates and staff during Login and Registration.
          </p>

          {/* Interactive Mode Choice Cards Grid */}
          <div className="mode-cards-grid">
            <div
              className={`mode-choice-card${authMode === "slideshow" ? " active" : ""}`}
              onClick={() => toggleAuthMode("slideshow")}
            >
              <div className="mode-info">
                <PlayCircle size={24} className="mode-icon" />
                <div>
                  <h3 className="mode-title">General Slideshow</h3>
                  <p className="mode-desc">Rotate up to 10 visual highlights during login</p>
                </div>
              </div>
              <div className="mode-active-badge" title={authMode === "slideshow" ? "Active Mode" : "Select Mode"}>
                <Check size={12} />
              </div>
            </div>

            <div
              className={`mode-choice-card${authMode === "ad" ? " active" : ""}`}
              onClick={() => toggleAuthMode("ad")}
            >
              <div className="mode-info">
                <Megaphone size={24} className="mode-icon" />
                <div>
                  <h3 className="mode-title">Business Advertisement</h3>
                  <p className="mode-desc">Showcase a single promo banner with clickable target URL</p>
                </div>
              </div>
              <div className="mode-active-badge" title={authMode === "ad" ? "Active Mode" : "Select Mode"}>
                <Check size={12} />
              </div>
            </div>
          </div>

          {/* ── Slideshow Configuration Panel ── */}
          {authMode === "slideshow" && (
            <div>
              <div className="config-toolbar mb-4">
                <h4 style={{ fontSize: "1.02rem", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>
                  <PlusCircle size={16} className="me-2 text-warning" style={{ ...ICON_STYLE, color: "var(--primary-gold)" }} />
                  Upload Additional Carousel Images
                </h4>
                <form onSubmit={submitSlideshowUpload}>
                  <div className="row g-3 align-items-center">
                    <div className="col-md-9">
                      <input
                        type="file"
                        className="form-control admin-input"
                        style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.15)", color: "#fff" }}
                        accept="image/*"
                        multiple
                        required
                        ref={slideshowFilesInputRef}
                      />
                    </div>
                    <div className="col-md-3">
                      <button type="submit" className="thm-btn py-2 w-100 fw-bold" style={{ borderRadius: "8px" }}>
                        <UploadCloud size={16} className="me-2" style={ICON_STYLE} /> Add to Slideshow
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <div className="config-toolbar mb-4">
                <h4 style={{ fontSize: "1.02rem", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>
                  <Clock size={16} className="me-2" style={{ ...ICON_STYLE, color: "var(--primary-gold)" }} />
                  Slideshow Rotation Speed
                </h4>
                <form onSubmit={submitTransition}>
                  <div className="row g-3 align-items-end">
                    <div className="col-md-5">
                      <label className="text-muted small d-block mb-1">Duration Value</label>
                      <input
                        type="number"
                        min={1}
                        className="form-control admin-input"
                        style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.15)", color: "#fff" }}
                        placeholder="5"
                        required
                        value={transitionValue}
                        onChange={(e) => setTransitionValue(Number(e.target.value))}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="text-muted small d-block mb-1">Time Unit</label>
                      <select
                        className="form-select admin-input"
                        style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.15)", color: "#fff" }}
                        required
                        value={transitionUnit}
                        onChange={(e) => setTransitionUnit(e.target.value as typeof transitionUnit)}
                      >
                        <option value="seconds">Seconds</option>
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <button type="submit" className="thm-btn py-2 w-100 fw-bold" style={{ borderRadius: "8px" }}>
                        <Save size={16} className="me-2" style={ICON_STYLE} /> Save Rotation
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#ccc", margin: "24px 0 12px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Active Gallery Highlights ({slideshowImages.length} / 10)
              </h4>

              {slideshowImages.length === 0 ? (
                <div className="text-center p-5 rounded" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.15)" }}>
                  <Images size={32} className="text-muted mb-2" />
                  <p className="text-muted mb-0">No pictures currently loaded in the login slideshow.</p>
                </div>
              ) : (
                <div className="gallery-grid">
                  {slideshowImages.map((imgUrl, index) => (
                    <div className="gallery-card" key={imgUrl + index}>
                      <div className="gallery-img-wrapper">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgUrl} alt="Slideshow Item" className="gallery-img" />
                      </div>
                      <div className="gallery-actions">
                        <button type="button" className="delete-img-btn" onClick={() => deleteSlideshowImage(imgUrl)}>
                          <Trash2 size={14} className="me-1" style={ICON_STYLE} /> Remove Image
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Business Advertisement Configuration Panel ── */}
          {authMode === "ad" && (
            <div className="config-toolbar mt-2">
              <form onSubmit={submitAdUpload}>
                <div className="row g-4 align-items-start">
                  <div className="col-lg-6">
                    <label className="text-white fw-bold d-block mb-2">Upload Ad Banner Graphic</label>
                    <input
                      type="file"
                      className="form-control admin-input mb-3"
                      style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.15)", color: "#fff" }}
                      accept="image/*"
                      required={!adImage}
                      ref={adFileInputRef}
                    />
                    {adImage ? (
                      <div className="text-center p-3 rounded" style={{ background: "#0a0a0a", border: "1px solid rgba(224,194,20,0.3)" }}>
                        <p className="small text-muted mb-2 text-start">Current Active Ad Banner:</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={adImage}
                          alt="Ad Banner"
                          style={{ maxHeight: 180, maxWidth: "100%", objectFit: "contain", borderRadius: "8px" }}
                        />
                      </div>
                    ) : (
                      <div className="text-center p-4 rounded text-muted small" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                        No advertisement graphic currently deployed.
                      </div>
                    )}
                  </div>

                  <div className="col-lg-6">
                    <label className="text-white fw-bold d-block mb-2">Target Destination Click-through URL</label>
                    <input
                      type="url"
                      className="form-control admin-input mb-3"
                      style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.15)", color: "#fff" }}
                      placeholder="https://ssbwithisv.in/special-course"
                      required
                      value={adLink}
                      onChange={(e) => setAdLink(e.target.value)}
                    />
                    <p className="text-muted small mb-4">
                      When users click on the promotion graphic on the login screen, they will be seamlessly redirected to this landing URL.
                    </p>

                    <div className="text-end mt-4">
                      <button type="submit" className="thm-btn py-3 px-5 fw-bold w-100" style={{ borderRadius: "12px", fontSize: "1rem" }}>
                        <Megaphone size={16} className="me-2" style={ICON_STYLE} /> Deploy Advertisement Settings
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
