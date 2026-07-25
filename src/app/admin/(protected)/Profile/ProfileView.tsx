"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminUser } from "@/components/admin/AdminUserProvider";
import "@/app/admin/styles/legacy-profile.css";

interface NotificationItem {
  _id: string;
  id?: string;
  title: string;
  message: string;
  isRead: boolean;
  type?: string;
  createdAt: string;
}

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

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  const [avatarSrc, setAvatarSrc] = useState("/assets/admin/admin-img.jpg");
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Load locally-persisted avatar preview once on mount (legacy is client-only,
  // no backend endpoint exists for a profile picture — see report notes).
  // Deferred through a microtask (matching the codebase's "no direct setState
  // in an effect body" convention) rather than reading localStorage inline.
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

  // Reusable reload (called from the delete-notification handler — not an effect).
  const reloadNotifications = () => {
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load notifications"))))
      .then((data: NotificationItem[]) => {
        setNotifications(Array.isArray(data) ? data : []);
        setNotificationsError(null);
      })
      .catch((err) => {
        setNotificationsError(err instanceof Error ? err.message : "Failed to load notifications");
      });
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load notifications"))))
      .then((data: NotificationItem[]) => {
        if (!cancelled) {
          setNotifications(Array.isArray(data) ? data : []);
          setNotificationsError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setNotificationsError(err instanceof Error ? err.message : "Failed to load notifications");
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

  const deleteNotification = async (id?: string) => {
    if (!id) return;
    const result = await window.Swal?.fire({
      title: "Delete Notification?",
      text: "Are you sure you want to dismiss this?",
      icon: "warning",
      showCancelButton: true,
      background: "#1a1a1a",
      color: "#fff",
      confirmButtonColor: "#e0c214",
      cancelButtonColor: "#ff6b6b",
      confirmButtonText: "Yes, delete it!",
    });
    if (!result?.isConfirmed) return;

    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete notification.");
      window.Swal?.fire({
        icon: "success",
        title: "Deleted!",
        text: "Notification removed.",
        background: "#1a1a1a",
        color: "#fff",
        timer: 1500,
        showConfirmButton: false,
      });
      reloadNotifications();
    } catch (error) {
      window.Swal?.fire({
        icon: "error",
        title: "Oops...",
        text: error instanceof Error ? error.message : "Failed to delete notification.",
        background: "#1a1a1a",
        color: "#fff",
      });
    }
  };

  const displayName = user?.name || "SSB Staff";
  const roleLabel = roleLabelFor(user);

  return (
    <div className="profile-container">
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

      <div className="profile-grid">
        <div className="d-flex flex-column gap-4">
          <div className="admin-card">
            <div className="profile-card-header">
              <i className="fas fa-id-card fa-lg"></i>
              <h2>Personal Details</h2>
            </div>
            <form onSubmit={submitDetails}>
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
                    background: "#171717",
                    borderColor: "#333",
                    color: "#777",
                    cursor: "not-allowed",
                    opacity: 0.8,
                  }}
                />
                <span className="small text-muted mt-1 d-block">
                  <i className="fas fa-info-circle text-warning"></i> Primary email cannot be modified.
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

              <button type="submit" className="thm-btn w-100 mt-4 py-2 justify-content-center" disabled={saving}>
                <i className="fas fa-save me-2"></i> {saving ? "Saving..." : "Save Profile Details"}
              </button>
            </form>
          </div>

          <div className="admin-card notifications-feed-card">
            <div className="profile-card-header">
              <i className="fas fa-bell fa-lg"></i>
              <h2>Recent Notifications</h2>
            </div>
            <div className="notification-timeline">
              {notificationsError ? (
                <div style={{ color: "#ff6b6b", fontSize: 13, textAlign: "center", padding: 20 }}>
                  {notificationsError}
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>
                  No recent notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <div className={`notification-item${n.isRead ? "" : " unread"}`} key={n._id || n.id}>
                    <div className="notification-marker">
                      <i className={`fas ${n.type === "ALLOTMENT" ? "fa-user-plus" : "fa-info"}`}></i>
                    </div>
                    <div
                      className="notification-content"
                      style={
                        !n.isRead
                          ? { borderColor: "rgba(224, 194, 20, 0.4)", background: "rgba(224, 194, 20, 0.05)" }
                          : undefined
                      }
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="notification-icon-col" style={!n.isRead ? { color: "#fff" } : undefined}>
                          {n.title}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="notification-relative-time">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                          <button
                            className="btn btn-sm text-danger p-0 m-0"
                            onClick={() => deleteNotification(n._id || n.id)}
                            title="Delete Notification"
                            style={{ background: "none", border: "none", outline: "none", boxShadow: "none" }}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </div>
                      <p className="notification-desc">{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="admin-card">
            <div className="profile-card-header">
              <i className="fas fa-shield-halved fa-lg"></i>
              <h2>Security Settings</h2>
            </div>
            <p className="text-muted mb-4" style={{ fontSize: 13, lineHeight: 1.6 }}>
              Initiate password modifications securely using our integrated account verification flow.
            </p>
            <a
              href="/admin/AccountRecovery"
              className="thm-btn secondary w-100 py-2 justify-content-center"
              style={{ display: "flex", textDecoration: "none" }}
            >
              <i className="fas fa-key me-2"></i> Reset Password
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
