"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminUser } from "@/components/admin/AdminUserProvider";
import "@/app/admin/styles/legacy-profile.css";

const ASSESSOR_LABELS: Record<string, string> = {
  Psych: "Psychologist",
  GTO: "GTO",
  IO: "Interviewing Officer",
  TO: "Technical Officer",
};

function roleLabelFor(user: { role?: string; permissions?: string[]; assessorType?: string | null } | null) {
  if (!user) return "Staff User";
  if (user.role === "owner") return "OWNER";
  if (user.role === "admin") {
    return (user.permissions || []).includes("super_admin") ? "SUPER ADMIN" : "System Admin";
  }
  if (user.role === "franchise") return "Franchise Partner";
  if (user.role === "assessor") {
    return ASSESSOR_LABELS[user.assessorType || ""] || "Assessor";
  }
  return "Staff User";
}

export default function ProfileView() {
  const { user, refreshProfile } = useAdminUser();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  const [avatarSrc, setAvatarSrc] = useState("/assets/admin/admin-img.jpg");
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Load locally-persisted avatar preview once on mount
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const saved = window.localStorage.getItem("profile_avatar");
      if (saved) setAvatarSrc(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      window.Swal?.fire({
        icon: "error",
        title: "File Too Large",
        text: "Please select an image smaller than 2MB.",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64Data = evt.target?.result as string;
      window.localStorage.setItem("profile_avatar", base64Data);
      setAvatarSrc(base64Data);
      window.Swal?.fire({
        icon: "success",
        title: "Avatar Updated",
        text: "Your profile picture has been updated on this device!",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
        timer: 1500,
        showConfirmButton: false,
      });
    };
    reader.readAsDataURL(file);
  };

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update profile");

      await refreshProfile();

      window.Swal?.fire({
        icon: "success",
        title: "Saved",
        text: "Your profile details have been saved successfully!",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#e0c214",
      });
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Error",
        text: error instanceof Error ? error.message : "Failed to update profile",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#ff6b6b",
      });
    } finally {
      setSaving(false);
    }
  };

  const displayName = user?.name || "SSB Staff";
  const roleLabel = roleLabelFor(user);

  return (
    <div className="profile-container">
      {/* Premium Hero Banner & Avatar */}
      <div className="profile-banner-card">
        <div className="profile-banner"></div>
        <div className="profile-header-content">
          <div className="profile-avatar-container">
            <div className="profile-avatar-wrapper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarSrc}
                alt="Profile Avatar"
                className="profile-avatar-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/120";
                }}
              />
              <div className="profile-avatar-overlay" onClick={() => avatarFileInputRef.current?.click()}>
                <i className="fas fa-camera fa-lg mb-1"></i>
                <span>Upload Image</span>
              </div>
            </div>
            <div className="profile-status-badge" title="Active Staff Online"></div>
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              ref={avatarFileInputRef}
              onChange={handleAvatarChange}
            />
          </div>

          <div className="profile-title-area">
            <div className="profile-name-row">
              <h1 className="profile-display-name">{displayName}</h1>
              <i className="fas fa-circle-check profile-verified-icon" title="Verified Professional Account"></i>
            </div>
            <div className="profile-role-sub">
              <span>{roleLabel}</span>
              <div style={{ width: 4, height: 4, background: "rgba(255,255,255,0.3)", borderRadius: "50%" }}></div>
              <span className="profile-active-pulse">
                <i className="fas fa-signal-perfect me-1"></i> Active Now
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Essential Details & Security Grid */}
      <div className="profile-grid">
        <div className="admin-card profile-details-card">
          <div className="profile-card-header">
            <i className="fas fa-user-edit fa-lg"></i>
            <h2>Personal Details</h2>
          </div>
          <form onSubmit={submitDetails} className="profile-form">
            <div className="admin-form-group">
              <label className="admin-form-label">Full Name</label>
              <input
                type="text"
                className="admin-input"
                required
                placeholder="Enter full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Email Address</label>
              <input
                type="email"
                className="admin-input"
                readOnly
                disabled
                value={user?.email || ""}
                style={{
                  background: "#141414",
                  borderColor: "#2a2a2a",
                  color: "#888",
                  cursor: "not-allowed",
                  opacity: 0.9,
                }}
              />
              <span className="small text-muted mt-2 d-block" style={{ fontSize: "0.8rem", color: "#aaa" }}>
                <i className="fas fa-lock text-warning me-1" style={{ color: "var(--primary-gold)" }}></i> Primary account email is permanent and protected.
              </span>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Phone Number</label>
              <input
                type="text"
                className="admin-input"
                required
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <button type="submit" className="thm-btn w-100 mt-4 py-3 justify-content-center profile-save-btn" disabled={saving}>
              <i className="fas fa-save me-2"></i> {saving ? "Saving Changes..." : "Save Profile Details"}
            </button>
          </form>
        </div>

        <div className="admin-card profile-security-card">
          <div className="profile-card-header">
            <i className="fas fa-shield-halved fa-lg"></i>
            <h2>Security Settings</h2>
          </div>
          <div className="security-card-body">
            <div className="security-status-box mb-4">
              <i className="fas fa-user-shield security-big-icon"></i>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", margin: "0 0 4px 0" }}>Account Protection Active</h3>
                <p style={{ fontSize: "0.82rem", color: "#aaa", margin: 0 }}>Your admin privileges are secured via encrypted authentication.</p>
              </div>
            </div>
            <p className="text-muted mb-4" style={{ fontSize: "0.88rem", lineHeight: 1.6, color: "#bbb" }}>
              Need to change your credentials? Initiate password modifications securely using our integrated account verification flow.
            </p>
            <a
              href="/admin/AccountRecovery"
              className="thm-btn secondary w-100 py-3 justify-content-center"
              style={{ display: "flex", textDecoration: "none", alignItems: "center", borderRadius: "8px", fontWeight: 600 }}
            >
              <i className="fas fa-key me-2"></i> Reset Password
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
