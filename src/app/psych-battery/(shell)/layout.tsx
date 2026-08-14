"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  LogOut, User, Menu, X, Shield, Calendar, Users, LayoutDashboard, ArrowLeft, ExternalLink, Layers,
  PanelLeftClose, PanelLeft,
} from "lucide-react";
import { usePsychUser } from "@/components/psych/PsychUserProvider";
import { cn } from "../lib/utils";

// Slow ambient "breathing" glow orbs behind the floating glass panels — the
// depth/parallax layer the redesign asked for, kept purely decorative
// (aria-hidden, no pointer events) and skipped for reduced-motion users.
function AmbientBackground() {
  const reduceMotion = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <motion.div
        className="absolute -top-40 -left-32 w-[440px] h-[440px] rounded-full bg-app-accent/20 blur-[130px]"
        animate={reduceMotion ? undefined : { opacity: [0.6, 1, 0.6], scale: [1, 1.08, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full bg-app-accent-dark/25 blur-[150px]"
        animate={reduceMotion ? undefined : { opacity: [0.5, 0.9, 0.5], scale: [1.05, 1, 1.05] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-app-accent/10 blur-[130px]"
        animate={reduceMotion ? undefined : { opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-noise" />
    </div>
  );
}

// Ported from psych_battery/src/components/Layout.tsx. Sidebar chrome shared
// by every route except the fullscreen assessment/presentation/editor pages
// (those live outside this (shell) route group, matching legacy's separate
// "Fullscreen Routes (No Sidebar)" block in App.tsx).
function LayoutShell({ children }: { children: React.ReactNode }) {
  const { user, isAdminUser, logout } = usePsychUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const isStaff = user?.role === "assessor" || user?.role === "admin" || user?.role === "owner";
  const profileHref = isStaff ? "/admin/Profile" : "/ProfileDashboard";

  // Each item carries its own icon tint so the sidebar reads with more color
  // variety at a glance instead of one uniform gray/gold treatment.
  const navItems = [
    // Student-only: test dashboard
    { label: "My Dashboard", path: "/psych-battery", icon: LayoutDashboard, show: user?.role === "student", tint: "blue" as const },
    // Assessors only: candidate dossier list
    { label: "Candidates", path: "/psych-battery/assessor", icon: Users, show: user?.role === "assessor", tint: "purple" as const },
    // Assessors see their own meetings (GTO excluded, per legacy); admin/owner see every meeting.
    {
      label: "Meetings",
      path: "/psych-battery/meetings",
      icon: Calendar,
      show: (user?.role === "assessor" && user?.assessorType !== "GTO") || isAdminUser,
      tint: "amber" as const,
    },
    // Admin only: admin hub
    { label: "Admin Hub", path: "/psych-battery/admin?tab=progress", icon: Shield, show: isAdminUser, tint: "rose" as const },
    // Admin only: assessment catalogue
    { label: "Assessment Catalogue", path: "/psych-battery/admin?tab=catalogue", icon: Layers, show: isAdminUser, tint: "teal" as const },
  ];

  const NAV_TINTS = {
    blue: "bg-blue-500/25 text-blue-300",
    purple: "bg-purple-500/25 text-purple-300",
    amber: "bg-amber-500/25 text-amber-300",
    rose: "bg-rose-500/25 text-rose-300",
    teal: "bg-teal-500/25 text-teal-300",
  };

  const getIsActive = (path: string) => {
    if (path.includes("?")) {
      const [basePath, search] = path.split("?");
      return pathname === basePath && searchParams.toString() === search;
    }
    return pathname === path;
  };

  const activeItem = navItems.find((item) => getIsActive(item.path));

  return (
    <div className="min-h-screen app-mesh-bg text-app-text-main relative font-sans">
      <AmbientBackground />

      <div className="relative z-10 flex h-screen p-3 sm:p-4 gap-3 sm:gap-4 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          "hidden md:flex glass-card rounded-3xl shadow-glow flex-col shrink-0 transition-all duration-300 overflow-hidden",
          isSidebarCollapsed ? "w-0 p-0 border-0" : "w-64"
        )}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <img src="/assets/logo/ISV2.png" alt="Logo" className="w-10 h-10 object-contain rounded-full shadow-lg shadow-app-accent/20" />
            <span className="text-app-text-bright font-bold tracking-tight text-lg">SSB with ISV</span>
          </div>

          <nav className="space-y-1">
            {/* Back to Profile / Back to Admin Panel */}
            {/* Inline color (not just the text-app-text-muted class) — this
                is an <a> tag crossing over to the legacy portal, and the browser's default link
                color/underline was winning over the utility class in some
                loads. An inline style always wins the cascade regardless of
                layer ordering, so it's a guaranteed fix rather than another
                class-specificity guess. We use a standard <a> instead of Next Link to ensure
                a fresh document load free of cross-portal stylesheet conflicts. */}
            <a
              href={profileHref}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group font-medium text-sm no-underline hover:text-app-accent hover:bg-app-card mb-4"
              style={{ color: "var(--color-app-text-muted)", textDecoration: "none" }}
            >
              <ArrowLeft size={18} className="group-hover:text-app-accent transition-colors" />
              <span>{isStaff ? "Back to Admin Panel" : "Return to Profile"}</span>
              <ExternalLink size={12} className="ml-auto opacity-40" />
            </a>

            <div className="px-3 py-2 text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em] mb-3">Platform Suite</div>
            {navItems
              .filter((item) => item.show)
              .map((item) => {
                const Icon = item.icon;
                const isActive = getIsActive(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={cn(
                      "flex items-center gap-3 pl-2 pr-3 py-2 rounded-xl transition-all group font-semibold text-sm border no-underline",
                      isActive
                        ? "bg-app-card border-app-border text-app-text-bright"
                        : "border-transparent text-app-text-muted hover:text-app-text-bright hover:bg-app-card/60"
                    )}
                    style={{ color: `var(--color-app-text-${isActive ? "bright" : "muted"})`, textDecoration: "none" }}
                  >
                    <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all", NAV_TINTS[item.tint])}>
                      <Icon size={16} />
                    </span>
                    <span>{item.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-app-accent ml-auto shrink-0" />}
                  </Link>
                );
              })}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-app-border bg-black/20">
          {user && !isStaff && (
            <div className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 rounded-full bg-app-card border border-app-border flex items-center justify-center shrink-0 overflow-hidden">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-app-text-muted" />
                )}
              </div>
              <div className="flex-grow min-w-0">
                <div className="text-xs font-bold text-app-text-bright truncate">{user?.name}</div>
                <div className="text-[10px] text-app-text-muted uppercase font-black tracking-widest truncate">{user?.role}</div>
              </div>
              <button onClick={() => logout()} className="p-1.5 text-app-text-muted hover:text-red-400 transition-colors" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0 relative gap-3 sm:gap-4 overflow-hidden">
        {/* Header */}
        <header className="h-16 shrink-0 glass-card shadow-glow rounded-2xl flex items-center justify-between px-6 sm:px-8 z-40">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button className="md:hidden p-2 text-app-text-muted hover:bg-white/5 rounded-lg cursor-pointer" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <Menu size={22} />
            </button>
            {/* Desktop Sidebar Toggle */}
            <button
              className="hidden md:block p-2 text-app-text-muted hover:bg-white/5 hover:text-app-text-bright rounded-lg transition-colors cursor-pointer"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <PanelLeft size={19} /> : <PanelLeftClose size={19} />}
            </button>
            <h1 className="text-xs font-bold text-app-text-bright flex items-center gap-1.5 uppercase tracking-[0.14em]">
              <span className="text-app-text-muted font-medium">Section /</span> {activeItem?.label || "Overview"}
            </h1>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-app-text-muted">
            {isStaff ? (
              <div className="flex items-center gap-3 py-1.5 pl-3 pr-1.5 bg-app-card rounded-full border border-app-border">
                <div className="text-right">
                  <div className="text-xs font-bold text-app-text-bright leading-tight">{user?.name}</div>
                  <div className="text-[9px] text-app-accent font-bold uppercase tracking-widest leading-none mt-1">
                    {user?.assessorType ? `${user.assessorType} Assessor` : user?.role === "owner" ? "OWNER" : user?.role === "admin" ? "SUPER ADMIN" : "Assessor"}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-app-sidebar border border-app-border flex items-center justify-center overflow-hidden shrink-0">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} className="text-app-text-muted" />
                  )}
                </div>
              </div>
            ) : (
              <span className="hidden sm:inline bg-app-card px-3 py-1 rounded-full border border-app-border shadow-inner">SESSION: 2026 Q2</span>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-grow overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 h-full">{children}</div>
        </main>
      </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-app-sidebar p-6 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <img src="/assets/logo/ISV2.png" alt="Logo" className="w-8 h-8 object-contain rounded-full" />
                <span className="text-app-text-bright font-bold tracking-tight text-lg">SSB with ISV</span>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 text-app-text-muted">
                <X size={24} />
              </button>
            </div>

            <nav className="space-y-4">
              {navItems
                .filter((item) => item.show)
                .map((item) => {
                  const isActive = getIsActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={cn("flex items-center gap-4 font-semibold text-lg transition-all no-underline", isActive ? "text-app-text-bright" : "text-app-text-muted")}
                      style={{ color: `var(--color-app-text-${isActive ? "bright" : "muted"})`, textDecoration: "none" }}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", NAV_TINTS[item.tint])}>
                        <item.icon size={20} />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              <div className="pt-4 mt-4 border-t border-app-border space-y-4">
                <a
                  href={profileHref}
                  className="flex items-center gap-4 font-medium text-lg no-underline"
                  style={{ color: "var(--color-app-accent)", textDecoration: "none" }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <ArrowLeft size={24} />
                  {isStaff ? "Back to Admin Panel" : "Return to Profile"}
                </a>
              </div>
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function PsychBatteryShellLayout({ children }: { children: React.ReactNode }) {
  return <LayoutShell>{children}</LayoutShell>;
}
