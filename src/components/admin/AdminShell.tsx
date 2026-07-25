"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminUser } from "./AdminUserProvider";
import { hasAdminPermission } from "@/server/adminAccess";

interface NotificationItem {
  id?: string;
  _id?: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, { text: string; color: string }> = {
  owner: { text: "OWNER", color: "#ff4757" },
  franchise: { text: "FRANCHISE PARTNER", color: "var(--primary-gold)" },
};

const ASSESSOR_LABELS: Record<string, string> = {
  Psych: "PSYCHOLOGIST",
  GTO: "GTO",
  IO: "INTERVIEWING OFFICER",
  TO: "TECHNICAL OFFICER",
};

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`admin-dashboard-link${active ? " active" : ""}`}>
      {children}
    </Link>
  );
}

function NotificationBell({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const load = async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) setNotifications(data);
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setNotifications(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const toggle = async () => {
    const opening = !open;
    onToggle();
    if (opening && unreadCount > 0) {
      await fetch("/api/notifications/read-all", { method: "PUT" });
      await load();
    }
  };

  const markRead = async (id?: string) => {
    if (!id) return;
    await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
    await load();
  };

  return (
    <div className={`admin-dropdown notification-dropdown${open ? " show" : ""}`}>
      <div
        className="admin-dashboard-link dropdown-toggle"
        style={{ position: "relative", padding: "0 15px", cursor: "pointer" }}
        onClick={toggle}
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "0px",
              background: "#e74c3c",
              color: "white",
              fontSize: "10px",
              padding: "2px 5px",
              borderRadius: "10px",
              fontWeight: "bold",
              lineHeight: 1,
            }}
          >
            {unreadCount}
          </span>
        )}
      </div>
      <div
        className="dropdown-menu"
        style={{ width: 300, maxHeight: 400, overflowY: "auto", padding: 0, left: "auto", right: 0 }}
      >
        {notifications.length === 0 ? (
          <div style={{ padding: 15, fontSize: "0.85rem", color: "#aaa", textAlign: "center", background: "var(--surface-light)" }}>
            No notifications
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id || n._id}
              style={{
                padding: "12px 15px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                background: n.isRead ? "var(--surface-light)" : "rgba(224, 194, 20, 0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <strong style={{ fontSize: "0.85rem", color: n.isRead ? "#ccc" : "#fff" }}>{n.title}</strong>
                {!n.isRead && (
                  <button
                    onClick={() => markRead(n.id || n._id)}
                    title="Mark as read"
                    style={{ background: "none", border: "none", color: "var(--primary-gold)", cursor: "pointer", padding: "0 0 0 10px" }}
                  >
                    <i className="fas fa-check"></i>
                  </button>
                )}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#aaa", lineHeight: 1.4 }}>{n.message}</div>
              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
                {new Date(n.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

type DropdownKey = "notifications" | "content" | "management";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAdminUser();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null);

  // Matches legacy admin-header.js's "Multi-Dropdown Toggle Hooking": clicking
  // a dropdown toggle opens it and closes any other open dropdown; clicking
  // anywhere outside every `.admin-dropdown` closes whichever is open.
  useEffect(() => {
    if (!openDropdown) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest(".admin-dropdown")) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [openDropdown]);

  const toggleDropdown = (key: DropdownKey) => setOpenDropdown((current) => (current === key ? null : key));

  const role = user?.role || "";
  const displayName = user?.name || (role === "franchise" ? "Franchise Partner" : "SSB Admin");
  const roleLabel =
    role === "admin" && (user?.permissions || []).includes("super_admin")
      ? { text: "SUPER ADMIN", color: "var(--primary-gold)" }
      : role === "assessor"
        ? { text: ASSESSOR_LABELS[user?.assessorType || ""] || "ASSESSOR", color: "#9b59b6" }
        : ROLE_LABELS[role] || { text: role.toUpperCase() || "ADMIN", color: "var(--primary-gold)" };

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <header className="admin-dashboard-navbar">
        <div className="admin-dashboard-left">
          <button className="admin-mobile-toggle" onClick={() => setMobileOpen((v) => !v)}>
            <i className={mobileOpen ? "fas fa-times" : "fas fa-bars"}></i>
          </button>
          <img
            src="/assets/logo/ISV2.png"
            alt="SSB Seal"
            className="admin-navbar-seal"
            style={{ height: 38, width: 38, objectFit: "contain", filter: "drop-shadow(0 0 5px rgba(224, 194, 20, 0.25))", marginRight: 5 }}
          />
          <div style={{ width: 1, height: 26, background: "rgba(255, 255, 255, 0.15)", margin: "0 10px" }}></div>
          <img
            src="/assets/admin/admin-img.jpg"
            alt="Admin"
            className="admin-dashboard-image"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/45";
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>Welcome, {displayName}</span>
            <span style={{ fontSize: "0.72rem", color: roleLabel.color, fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase", marginTop: 2 }}>
              {roleLabel.text}
            </span>
          </div>
        </div>

        <div className={`admin-dashboard-right${mobileOpen ? " show" : ""}`}>
          <NotificationBell open={openDropdown === "notifications"} onToggle={() => toggleDropdown("notifications")} />

          {role === "franchise" ? (
            <>
              <NavLink href="/admin/FranchiseDashboard" active={isActive("/admin/FranchiseDashboard")}>
                Franchise Dashboard
              </NavLink>
              <NavLink href="/admin/Profile" active={isActive("/admin/Profile")}>
                Profile
              </NavLink>
            </>
          ) : (
            <>
              {(hasAdminPermission(user ?? null, "dashboard") ||
                hasAdminPermission(user ?? null, "magazine") ||
                hasAdminPermission(user ?? null, "blogs") ||
                hasAdminPermission(user ?? null, "gallery") ||
                hasAdminPermission(user ?? null, "candidates")) && (
                <div className={`admin-dropdown${openDropdown === "content" ? " show" : ""}`}>
                  <div className="admin-dashboard-link dropdown-toggle" onClick={() => toggleDropdown("content")}>
                    Content
                  </div>
                  <div className="dropdown-menu">
                    {hasAdminPermission(user ?? null, "dashboard") && (
                      <NavLink href="/admin/dashboard" active={isActive("/admin/dashboard")}>
                        Dashboard
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "magazine") && (
                      <NavLink href="/admin/magazine" active={isActive("/admin/magazine")}>
                        Magazine
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "blogs") && (
                      <NavLink href="/admin/BlogList" active={pathname?.includes("Blog") ?? false}>
                        Blogs
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "gallery") && (
                      <NavLink href="/admin/Gallery" active={isActive("/admin/Gallery")}>
                        Gallery
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "candidates") && (
                      <NavLink href="/admin/candidate" active={isActive("/admin/candidate")}>
                        REC Candidates
                      </NavLink>
                    )}
                  </div>
                </div>
              )}

              {(hasAdminPermission(user ?? null, "courses") ||
                hasAdminPermission(user ?? null, "franchise") ||
                hasAdminPermission(user ?? null, "sales") ||
                hasAdminPermission(user ?? null, "coupons") ||
                hasAdminPermission(user ?? null, "leads") ||
                hasAdminPermission(user ?? null, "roles") ||
                hasAdminPermission(user ?? null, "students") ||
                hasAdminPermission(user ?? null, "allotment") ||
                hasAdminPermission(user ?? null, "admin")) && (
                <div className={`admin-dropdown${openDropdown === "management" ? " show" : ""}`}>
                  <div className="admin-dashboard-link dropdown-toggle" onClick={() => toggleDropdown("management")}>
                    Management
                  </div>
                  <div className="dropdown-menu">
                    {hasAdminPermission(user ?? null, "courses") && (
                      <NavLink href="/admin/Courses" active={isActive("/admin/Courses")}>
                        Courses
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "franchise") && (
                      <NavLink href="/admin/Franchise" active={isActive("/admin/Franchise")}>
                        Franchise
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "sales") && (
                      <NavLink href="/admin/TotalSales" active={isActive("/admin/TotalSales")}>
                        Total Sales
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "sales") && (
                      <NavLink href="/admin/Sales" active={isActive("/admin/Sales")}>
                        Sales
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "coupons") && (
                      <NavLink href="/admin/CouponManagement" active={isActive("/admin/CouponManagement")}>
                        Coupons
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "leads") && (
                      <NavLink href="/admin/leads" active={isActive("/admin/leads")}>
                        Leads
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "roles") && (
                      <NavLink href="/admin/RolesManagement" active={isActive("/admin/RolesManagement")}>
                        Roles & Permissions
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "students") && (
                      <NavLink href="/admin/StudentRoster" active={isActive("/admin/StudentRoster")}>
                        Candidates
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "allotment") && (
                      <NavLink href="/admin/Allotment" active={isActive("/admin/Allotment")}>
                        Assessor Allotment
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "admin") && (
                      <NavLink href="/admin/all-users" active={isActive("/admin/all-users")}>
                        Users
                      </NavLink>
                    )}
                  </div>
                </div>
              )}

              {(role === "assessor" || hasAdminPermission(user ?? null, "evaluations")) && (
                // Use a standard <a> tag instead of client-side NavLink/Link for transitioning
                // between the legacy Bootstrap admin layout and the Tailwind psych-battery suite.
                // An SPA transition leaves Bootstrap CDN styling in the document <head>, which
                // ruins the layout of /psych-battery until a hard reload.
                <a
                  href="/psych-battery"
                  className={`admin-dashboard-link${pathname?.startsWith("/psych-battery") ? " active" : ""}`}
                >
                  Candidate Evaluation
                </a>
              )}

              <NavLink href="/admin/Profile" active={isActive("/admin/Profile")}>
                Profile
              </NavLink>
            </>
          )}

          <button id="logoutBtn" onClick={() => logout()}>
            Logout
          </button>
        </div>
      </header>

      {children}
    </>
  );
}
