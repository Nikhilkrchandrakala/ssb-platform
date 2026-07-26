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

function NavLink({
  href,
  active,
  icon,
  children,
  onClick,
  title,
}: {
  href: string;
  active: boolean;
  icon?: string;
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <Link
      href={href}
      className={`admin-nav-link${active ? " active" : ""}`}
      onClick={onClick}
      title={title || (typeof children === "string" ? children : "")}
    >
      {icon && <i className={icon}></i>}
      <span className="admin-nav-label">{children}</span>
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
        className="notification-bell-btn"
        style={{ position: "relative", cursor: "pointer" }}
        onClick={toggle}
        title="Notifications"
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && <span className="notification-badge-count">{unreadCount}</span>}
      </div>
      <div
        className="dropdown-menu"
        style={{ width: 320, maxHeight: 420, overflowY: "auto", padding: 0, left: "auto", right: 0 }}
      >
        {notifications.length === 0 ? (
          <div style={{ padding: 18, fontSize: "0.88rem", color: "#aaa", textAlign: "center", background: "var(--surface-light)" }}>
            No notifications
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id || n._id}
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: n.isRead ? "var(--surface-light)" : "rgba(224, 194, 20, 0.10)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <strong style={{ fontSize: "0.88rem", color: n.isRead ? "#ccc" : "#fff" }}>{n.title}</strong>
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
              <div style={{ fontSize: "0.78rem", color: "#aaa", lineHeight: 1.4 }}>{n.message}</div>
              <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState("/assets/admin/admin-img.jpg");

  // Persisted avatar and sidebar collapse state load
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const savedAvatar = window.localStorage.getItem("profile_avatar");
      if (savedAvatar) setAvatarSrc(savedAvatar);
      const savedCollapse = window.localStorage.getItem("admin_sidebar_collapsed");
      if (savedCollapse === "true") setIsCollapsed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Multi-dropdown toggle hooking: click outside closes open menus
  useEffect(() => {
    if (!openDropdown) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        !(e.target instanceof Element) ||
        (!e.target.closest(".admin-dropdown") && !e.target.closest(".admin-nav-dropdown") && !e.target.closest(".admin-sidebar"))
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [openDropdown]);

  const toggleDropdown = (key: DropdownKey) => {
    if (isCollapsed && (key === "content" || key === "management")) {
      setIsCollapsed(false);
      try {
        window.localStorage.setItem("admin_sidebar_collapsed", "false");
      } catch {}
    }
    setOpenDropdown((current) => (current === key ? null : key));
  };

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("admin_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const closeMobile = () => setMobileOpen(false);

  const role = user?.role || "";
  const displayName = user?.name || (role === "franchise" ? "Franchise Partner" : "SSB Admin");
  const roleLabel =
    role === "admin" && user?.salesRole === "head"
      ? { text: "SALES HEAD", color: "#3498db" }
      : role === "admin" && user?.salesRole === "executive"
        ? { text: "SALES EXECUTIVE", color: "#3498db" }
        : role === "admin" && (user?.permissions || []).includes("super_admin")
          ? { text: "SUPER ADMIN", color: "var(--primary-gold, #e0c214)" }
          : role === "assessor"
            ? { text: ASSESSOR_LABELS[user?.assessorType || ""] || "ASSESSOR", color: "#9b59b6" }
            : ROLE_LABELS[role] || { text: role.toUpperCase() || "ADMIN", color: "var(--primary-gold, #e0c214)" };

  const isActive = (path: string) => pathname === path;

  const hasContentPermissions =
    hasAdminPermission(user ?? null, "dashboard") ||
    hasAdminPermission(user ?? null, "magazine") ||
    hasAdminPermission(user ?? null, "blogs") ||
    hasAdminPermission(user ?? null, "gallery") ||
    hasAdminPermission(user ?? null, "candidates");

  const hasManagementPermissions =
    hasAdminPermission(user ?? null, "courses") ||
    hasAdminPermission(user ?? null, "franchise") ||
    hasAdminPermission(user ?? null, "sales") ||
    hasAdminPermission(user ?? null, "coupons") ||
    hasAdminPermission(user ?? null, "leads") ||
    hasAdminPermission(user ?? null, "roles") ||
    hasAdminPermission(user ?? null, "students") ||
    hasAdminPermission(user ?? null, "allotment") ||
    hasAdminPermission(user ?? null, "admin");

  return (
    <div className="admin-shell-layout">
      {/* Mobile Backdrop Overlay */}
      <div className={`admin-mobile-backdrop${mobileOpen ? " show" : ""}`} onClick={closeMobile} />

      {/* Left Collapsible Navigation Sidebar */}
      <aside className={`admin-sidebar${isCollapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
        <div className="admin-sidebar-header">
          <Link href="/admin/Profile" className="admin-sidebar-brand" onClick={closeMobile}>
            <img src="/assets/logo/ISV2.png" alt="SSB Seal" className="admin-sidebar-seal" />
            <div className="admin-sidebar-title-area">
              <span className="admin-sidebar-title">SSB PORTAL</span>
              <span className="admin-sidebar-subtitle">ADMIN EDITION</span>
            </div>
          </Link>
        </div>

        <nav className="admin-sidebar-nav">
          <div className="admin-nav-section-label">Navigation</div>

          {role === "franchise" ? (
            <>
              <NavLink href="/admin/FranchiseDashboard" active={isActive("/admin/FranchiseDashboard")} icon="fas fa-chart-pie" onClick={closeMobile}>
                Franchise Dashboard
              </NavLink>
              <NavLink href="/admin/Profile" active={isActive("/admin/Profile")} icon="fas fa-user-circle" onClick={closeMobile}>
                Profile
              </NavLink>
            </>
          ) : (
            <>
              {hasContentPermissions && (
                <div className={`admin-nav-dropdown${openDropdown === "content" ? " open" : ""}`}>
                  <div className="admin-nav-dropdown-toggle" onClick={() => toggleDropdown("content")} title="Content Management">
                    <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, overflow: "hidden" }}>
                      <i className="fas fa-layer-group"></i>
                      <span className="admin-nav-label">Content</span>
                    </div>
                    <i className="fas fa-chevron-down dropdown-chevron"></i>
                  </div>
                  <div className="admin-nav-submenu">
                    {hasAdminPermission(user ?? null, "dashboard") && (
                      <NavLink href="/admin/dashboard" active={isActive("/admin/dashboard")} icon="fas fa-gauge-high" onClick={closeMobile}>
                        Dashboard
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "magazine") && (
                      <NavLink href="/admin/magazine" active={isActive("/admin/magazine")} icon="fas fa-book-open" onClick={closeMobile}>
                        Magazine
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "blogs") && (
                      <NavLink href="/admin/BlogList" active={pathname?.includes("Blog") ?? false} icon="fas fa-newspaper" onClick={closeMobile}>
                        Blogs
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "gallery") && (
                      <NavLink href="/admin/Gallery" active={isActive("/admin/Gallery")} icon="fas fa-images" onClick={closeMobile}>
                        Gallery
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "candidates") && (
                      <NavLink href="/admin/candidate" active={isActive("/admin/candidate")} icon="fas fa-id-card" onClick={closeMobile}>
                        REC Candidates
                      </NavLink>
                    )}
                  </div>
                </div>
              )}

              {hasManagementPermissions && (
                <div className={`admin-nav-dropdown${openDropdown === "management" ? " open" : ""}`}>
                  <div className="admin-nav-dropdown-toggle" onClick={() => toggleDropdown("management")} title="Administration & Sales">
                    <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, overflow: "hidden" }}>
                      <i className="fas fa-briefcase"></i>
                      <span className="admin-nav-label">Management</span>
                    </div>
                    <i className="fas fa-chevron-down dropdown-chevron"></i>
                  </div>
                  <div className="admin-nav-submenu">
                    {hasAdminPermission(user ?? null, "courses") && (
                      <NavLink href="/admin/Courses" active={isActive("/admin/Courses")} icon="fas fa-graduation-cap" onClick={closeMobile}>
                        Courses
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "franchise") && (
                      <NavLink href="/admin/Franchise" active={isActive("/admin/Franchise")} icon="fas fa-store" onClick={closeMobile}>
                        Franchise
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "sales") && user?.salesRole !== "executive" && (
                      <NavLink href="/admin/TotalSales" active={isActive("/admin/TotalSales")} icon="fas fa-coins" onClick={closeMobile}>
                        Total Sales
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "sales") && (
                      <NavLink href="/admin/Sales" active={isActive("/admin/Sales")} icon="fas fa-receipt" onClick={closeMobile}>
                        Sales
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "coupons") && (
                      <NavLink href="/admin/CouponManagement" active={isActive("/admin/CouponManagement")} icon="fas fa-ticket" onClick={closeMobile}>
                        Coupons
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "leads") && (
                      <NavLink href="/admin/leads" active={isActive("/admin/leads")} icon="fas fa-users-viewfinder" onClick={closeMobile}>
                        Leads
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "roles") && (
                      <NavLink href="/admin/RolesManagement" active={isActive("/admin/RolesManagement")} icon="fas fa-user-shield" onClick={closeMobile}>
                        Roles & Permissions
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "students") && (
                      <NavLink href="/admin/StudentRoster" active={isActive("/admin/StudentRoster")} icon="fas fa-user-graduate" onClick={closeMobile}>
                        Candidates
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "allotment") && (
                      <NavLink href="/admin/Allotment" active={isActive("/admin/Allotment")} icon="fas fa-clipboard-check" onClick={closeMobile}>
                        Assessor Allotment
                      </NavLink>
                    )}
                    {hasAdminPermission(user ?? null, "admin") && (
                      <NavLink href="/admin/all-users" active={isActive("/admin/all-users")} icon="fas fa-users-gear" onClick={closeMobile}>
                        Users
                      </NavLink>
                    )}
                  </div>
                </div>
              )}

              {(role === "assessor" || hasAdminPermission(user ?? null, "evaluations")) && (
                // Use a standard <a> tag instead of client-side NavLink/Link for transitioning
                // between the legacy Bootstrap admin layout and the Tailwind psych-battery suite.
                <a
                  href="/psych-battery"
                  className={`admin-nav-link${pathname?.startsWith("/psych-battery") ? " active" : ""}`}
                  onClick={closeMobile}
                  title="Candidate Evaluation"
                >
                  <i className="fas fa-brain"></i>
                  <span className="admin-nav-label">Candidate Evaluation</span>
                </a>
              )}

              <NavLink href="/admin/Profile" active={isActive("/admin/Profile")} icon="fas fa-user" onClick={closeMobile}>
                Profile
              </NavLink>
            </>
          )}
        </nav>

        <div className="admin-sidebar-footer">
          <Link href="/admin/Profile" className="admin-user-strip" onClick={closeMobile} title="Account Profile">
            <div className="admin-user-avatar-wrap">
              <img
                src={avatarSrc}
                alt="Admin"
                className="admin-user-avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/45";
                }}
              />
              <div className="admin-user-status-dot" title="Active Staff Online"></div>
            </div>
            <div className="admin-user-info">
              <span className="admin-user-name">{displayName}</span>
              <span className="admin-user-role" style={{ color: roleLabel.color }}>
                {roleLabel.text}
              </span>
            </div>
          </Link>

          <button id="logoutBtn" className="admin-sidebar-logout-btn" onClick={() => logout()} title="Logout">
            <i className="fas fa-power-off"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main App Column */}
      <div className={`admin-shell-main${isCollapsed ? " collapsed-sidebar" : ""}`}>
        <header className="admin-top-header">
          <div className="admin-header-left">
            <button
              className="admin-sidebar-toggle-btn"
              onClick={() => {
                if (window.innerWidth <= 1024) {
                  setMobileOpen((v) => !v);
                } else {
                  toggleCollapse();
                }
              }}
              title={isCollapsed ? "Expand Navigation Sidebar" : "Collapse Navigation Sidebar"}
              aria-label="Toggle Navigation Sidebar"
            >
              <i className={mobileOpen ? "fas fa-times" : isCollapsed ? "fas fa-indent" : "fas fa-outdent"}></i>
            </button>
            <div className="admin-header-title">
              <span>Welcome, {displayName}</span>
              <span className="admin-header-badge" style={{ borderColor: roleLabel.color, color: roleLabel.color }}>
                {roleLabel.text}
              </span>
            </div>
          </div>

          <div className="admin-header-right">
            <NotificationBell open={openDropdown === "notifications"} onToggle={() => toggleDropdown("notifications")} />
          </div>
        </header>

        <main className="admin-shell-content">{children}</main>
      </div>
    </div>
  );
}
