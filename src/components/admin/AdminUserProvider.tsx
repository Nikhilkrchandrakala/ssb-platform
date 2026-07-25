"use client";

import { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface AdminUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string; // owner | admin | franchise | assessor
  permissions?: string[];
  assessorType?: string | null;
  // Sales module (salesimplementation.md Phase 1) — only meaningful when permissions includes "sales".
  salesRole?: "executive" | "head" | null;
}

interface AdminUserContextValue {
  user: AdminUser | null;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AdminUserContext = createContext<AdminUserContextValue | null>(null);

export function useAdminUser() {
  const ctx = useContext(AdminUserContext);
  if (!ctx) throw new Error("useAdminUser must be used within AdminUserProvider");
  return ctx;
}

/**
 * Server-resolved user (from getCurrentUser() in the protected admin layout)
 * is handed down as `initialUser`. Also re-fetches /api/profile once on
 * mount, mirroring legacy admin-header.js's real-time permission sync — an
 * admin whose permissions were just edited by an owner sees the update
 * without a full page reload.
 */
export function AdminUserProvider({ initialUser, children }: { initialUser: AdminUser | null; children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);

  const refreshProfile = useCallback(async () => {
    const res = await fetch("/api/profile");
    if (res.status === 401) {
      router.push("/admin");
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    if (data?.user) {
      setUser((prev) => ({ ...prev, ...data.user }));
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((res) => {
        if (res.status === 401) {
          router.push("/admin");
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (!cancelled && data?.user) {
          setUser((prev) => ({ ...prev, ...data.user }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AdminUserContextValue>(
    () => ({
      user,
      logout: async () => {
        await fetch("/api/logout", { method: "POST" });
        router.push("/admin");
        router.refresh();
      },
      refreshProfile,
    }),
    [user, router, refreshProfile]
  );

  return <AdminUserContext.Provider value={value}>{children}</AdminUserContext.Provider>;
}
