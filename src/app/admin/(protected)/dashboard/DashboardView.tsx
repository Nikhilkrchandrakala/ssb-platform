"use client";

import { useEffect, useRef, useState } from "react";
import "@/app/admin/styles/legacy-dashboard.css";

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

  // Initial load — mirrors legacy fetchEntries() + fetchContactSettings() + fetchAuthDisplaySettings()
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

  // Smooth scroll to auth display card if hash matches (legacy checkHashAndScroll)
  useEffect(() => {
    const checkHashAndScroll = () => {
      if (window.location.hash === "#authDisplaySettingsCard" && authCardRef.current) {
        const card = authCardRef.current;
        setTimeout(() => {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.style.transition = "box-shadow 0.5s ease-in-out, border-color 0.5s ease-in-out";
          card.style.boxShadow = "0 0 20px rgba(224, 194, 20, 0.4)";
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
          title: `Switched to ${mode} mode`,
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
        title: `Slideshow will now rotate every ${transitionValue} ${transitionUnit}`,
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
    <div className="container" style={{ maxWidth: 1200, margin: "40px auto", padding: "0 20px" }}>
      <div className="admin-page-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <i className="fas fa-tachometer-alt me-2"></i> Platform Statistics
          </h1>
          <p className="text-muted mb-0">Control the counter numbers displayed on the frontend landing page</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="card-header border-0 bg-transparent px-0 pb-3">
          <h4 className="mb-0 text-white">
            <i className="fas fa-edit me-2 text-warning"></i> Monitor Display Values
          </h4>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Candidates Recommended</th>
                <th>Track Record (Years)</th>
                <th>Expertise (Years)</th>
                <th>Total Faculty</th>
                <th style={{ width: 150 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {entriesLoading ? (
                <tr>
                  <td colSpan={5} className="text-center p-5 opacity-50">
                    Syncing values from server...
                  </td>
                </tr>
              ) : entriesError ? (
                <tr>
                  <td colSpan={5} className="text-center p-5 text-danger">
                    {entriesError}
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-5 opacity-50">
                    No statistics entries found
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry._id}>
                    <td>
                      <input
                        type="text"
                        className="admin-input py-1"
                        value={entry.officerSelection}
                        onChange={(e) => updateEntryField(entry._id, "officerSelection", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="admin-input py-1"
                        value={entry.yearService}
                        onChange={(e) => updateEntryField(entry._id, "yearService", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="admin-input py-1"
                        value={entry.facultyExperience}
                        onChange={(e) => updateEntryField(entry._id, "facultyExperience", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="admin-input py-1"
                        value={entry.totalFaculty}
                        onChange={(e) => updateEntryField(entry._id, "totalFaculty", e.target.value)}
                      />
                    </td>
                    <td>
                      <button className="thm-btn py-1 px-3" onClick={() => saveEntry(entry._id)}>
                        <i className="fas fa-save me-1"></i> Save
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div
          className="mt-4 p-3 rounded"
          style={{ background: "rgba(224, 194, 20, 0.05)", border: "1px solid rgba(224, 194, 20, 0.1)" }}
        >
          <p className="mb-0 small text-muted">
            <i className="fas fa-info-circle me-1"></i> Changes made here reflect immediately on the main website
            counters. Please ensure values are accurate.
          </p>
        </div>
      </div>

      <div className="admin-card mt-4">
        <div className="card-header border-0 bg-transparent px-0 pb-3">
          <h4 className="mb-0 text-white">
            <i className="fas fa-phone-alt me-2 text-warning"></i> Support Contact Settings
          </h4>
        </div>
        <div className="p-3" style={{ background: "#2a291f", borderRadius: 8, border: "1px solid #3b3930" }}>
          <form onSubmit={submitContactSettings}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label text-white">
                  WhatsApp Support Number (10 digits, e.g. 8420422821)
                </label>
                <input
                  type="text"
                  className="admin-input form-control"
                  placeholder="Enter 10 digit WhatsApp number"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label text-white">
                  Phone Call Support Number (10 digits, e.g. 7483617249)
                </label>
                <input
                  type="text"
                  className="admin-input form-control"
                  placeholder="Enter 10 digit phone call number"
                  required
                  value={callNumber}
                  onChange={(e) => setCallNumber(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="thm-btn py-2 px-4 mt-2">
              <i className="fas fa-save me-1"></i> Save Support Info
            </button>
          </form>
        </div>
      </div>

      <div className="admin-card mt-4" id="authDisplaySettingsCard" ref={authCardRef}>
        <div className="card-header border-0 bg-transparent px-0 pb-3">
          <h4 className="mb-0 text-white">
            <i className="fas fa-images me-2 text-warning"></i> Auth Split-Screen Graphic Settings
          </h4>
        </div>
        <div className="p-3" style={{ background: "#2a291f", borderRadius: 8, border: "1px solid #3b3930" }}>
          <div className="mb-4">
            <label className="form-label text-white d-block fw-bold">Select Active Graphic Mode</label>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="authDisplayMode"
                id="modeSlideshow"
                checked={authMode === "slideshow"}
                onChange={() => toggleAuthMode("slideshow")}
              />
              <label className="form-check-label text-white" htmlFor="modeSlideshow">
                <i className="fas fa-play-circle me-1 text-warning"></i> General Slideshow (up to 10 rotating images)
              </label>
            </div>
            <div className="form-check form-check-inline ms-3">
              <input
                className="form-check-input"
                type="radio"
                name="authDisplayMode"
                id="modeAd"
                checked={authMode === "ad"}
                onChange={() => toggleAuthMode("ad")}
              />
              <label className="form-check-label text-white" htmlFor="modeAd">
                <i className="fas fa-ad me-1 text-warning"></i> Business Advertisement (Single ad image with custom
                link)
              </label>
            </div>
          </div>

          <hr style={{ borderColor: "rgba(255,255,255,0.1)" }} />

          {authMode === "slideshow" && (
            <div id="slideshowSection" className="auth-config-section">
              <h5 className="text-warning mb-3">
                <i className="fas fa-photo-video me-1"></i> Slideshow Management
              </h5>
              <form className="mb-4" onSubmit={submitSlideshowUpload}>
                <div className="row align-items-end">
                  <div className="col-md-9 mb-3 mb-md-0">
                    <label className="form-label text-white">
                      Upload New Slideshow Images (Multiple allowed, maximum 10 images total)
                    </label>
                    <input
                      type="file"
                      className="form-control admin-input"
                      accept="image/*"
                      multiple
                      required
                      ref={slideshowFilesInputRef}
                    />
                  </div>
                  <div className="col-md-3">
                    <button type="submit" className="thm-btn py-2 w-100">
                      <i className="fas fa-upload me-1"></i> Upload Images
                    </button>
                  </div>
                </div>
              </form>

              <div
                className="p-3 mb-4 rounded"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <form onSubmit={submitTransition}>
                  <div className="row align-items-end">
                    <div className="col-md-5 mb-3 mb-md-0">
                      <label className="form-label text-white">Slideshow Transition Duration Value</label>
                      <input
                        type="number"
                        min={1}
                        className="form-control admin-input"
                        placeholder="5"
                        required
                        value={transitionValue}
                        onChange={(e) => setTransitionValue(Number(e.target.value))}
                      />
                    </div>
                    <div className="col-md-5 mb-3 mb-md-0">
                      <label className="form-label text-white">Slideshow Transition Time Unit</label>
                      <select
                        className="form-select admin-input"
                        style={{ background: "#2a291f", borderColor: "#3b3930", color: "#fff" }}
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
                    <div className="col-md-2">
                      <button type="submit" className="thm-btn py-2 w-100">
                        <i className="fas fa-save me-1"></i> Save Time
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <label className="form-label text-white fw-bold mb-2">Current Slideshow Images</label>
              <div className="row g-3">
                {slideshowImages.length === 0 ? (
                  <div className="col-12 text-muted small">No slideshow images uploaded yet.</div>
                ) : (
                  slideshowImages.map((imgUrl, index) => (
                    <div className="col-md-3 col-sm-6 text-center position-relative mb-3" key={imgUrl + index}>
                      <div
                        style={{
                          border: "1px solid #3b3930",
                          borderRadius: 8,
                          overflow: "hidden",
                          background: "#1a1a1a",
                          padding: 5,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt=""
                          style={{ height: 100, maxWidth: "100%", objectFit: "cover", borderRadius: 4 }}
                        />
                        <button
                          type="button"
                          className="btn btn-danger btn-sm w-100 mt-2"
                          onClick={() => deleteSlideshowImage(imgUrl)}
                        >
                          <i className="fas fa-trash-alt me-1"></i> Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {authMode === "ad" && (
            <div id="adSection" className="auth-config-section">
              <h5 className="text-warning mb-3">
                <i className="fas fa-bullhorn me-1"></i> Business Advertisement
              </h5>
              <form onSubmit={submitAdUpload}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-white">Upload Ad Banner Image</label>
                    <input
                      type="file"
                      className="form-control admin-input"
                      accept="image/*"
                      required={!adImage}
                      ref={adFileInputRef}
                    />
                    {adImage && (
                      <div className="mt-3 text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={adImage}
                          alt="Ad Banner"
                          style={{
                            maxHeight: 150,
                            borderRadius: 8,
                            border: "1px solid #3b3930",
                            maxWidth: "100%",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-white">Advertisement Click-through Link (Destination URL)</label>
                    <input
                      type="url"
                      className="form-control admin-input"
                      placeholder="https://ssbwithisv.in/special-course"
                      required
                      value={adLink}
                      onChange={(e) => setAdLink(e.target.value)}
                    />
                    <div className="mt-4 text-end">
                      <button type="submit" className="thm-btn py-2 px-4">
                        <i className="fas fa-save me-1"></i> Save Advertisement Info
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
