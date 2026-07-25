"use client";

import { createContext, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { hasAdminPermission } from "@/server/adminAccess";

export interface PsychUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string; // student | assessor | admin | owner
  permissions?: string[];
  assessorType?: "GTO" | "TO" | "Psych" | "IO" | null;
  profileImage?: string;
}

interface PsychUserContextValue {
  user: PsychUser | null;
  isAdminUser: boolean;
  logout: () => Promise<void>;
}

const PsychUserContext = createContext<PsychUserContextValue | null>(null);

export function usePsychUser() {
  const ctx = useContext(PsychUserContext);
  if (!ctx) throw new Error("usePsychUser must be used within PsychUserProvider");
  return ctx;
}

/**
 * Server-resolved user (from getCurrentUser() in app/psych-battery/layout.tsx)
 * is handed down as `initialUser` — replaces legacy AuthProvider's client-side
 * `api.auth.me()` fetch-on-mount entirely. No loading state needed: the
 * outer layout already redirected unauthenticated visitors to /SignIn before
 * any of this renders.
 */
export function PsychUserProvider({ initialUser, children }: { initialUser: PsychUser | null; children: React.ReactNode }) {
  const router = useRouter();

  const value = useMemo<PsychUserContextValue>(() => {
    const isAdminUser = hasAdminPermission(initialUser, "evaluations");
    return {
      user: initialUser,
      isAdminUser,
      logout: async () => {
        await fetch("/api/logout", { method: "POST" });
        const administrative = initialUser?.role === "assessor" || isAdminUser;
        router.push(administrative ? "/admin" : "/SignIn");
        router.refresh();
      },
    };
  }, [initialUser, router]);

  return <PsychUserContext.Provider value={value}>{children}</PsychUserContext.Provider>;
}
