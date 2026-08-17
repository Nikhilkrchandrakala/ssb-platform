"use client";

import { createContext, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";

export interface SiteUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  role?: string;
  // Set by getCurrentUser() (src/server/auth.ts) — rawRole preserves "lead"
  // before it's normalized to "student" for checkout, and hasPassword tells
  // a genuinely signed-up/paid account apart from a bare quickJoin lead
  // session. Use isSignedUpSiteUser() (src/lib/siteAccess.ts) rather than
  // reading these two fields directly.
  rawRole?: string;
  hasPassword?: boolean;
}

interface SiteUserContextValue {
  user: SiteUser | null;
  logout: () => Promise<void>;
}

const SiteUserContext = createContext<SiteUserContextValue | null>(null);

export function useSiteUser() {
  const ctx = useContext(SiteUserContext);
  if (!ctx) throw new Error("useSiteUser must be used within SiteUserProvider");
  return ctx;
}

// Server-resolved user (from getCurrentUser() in the (site) layout) is handed
// down as `initialUser` — there is no client-side token to read anymore, so
// no client fetch/loading state is needed for the common case.
export function SiteUserProvider({
  initialUser,
  children,
}: {
  initialUser: SiteUser | null;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const value = useMemo<SiteUserContextValue>(
    () => ({
      user: initialUser,
      logout: async () => {
        await fetch("/api/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      },
    }),
    [initialUser, router]
  );

  return <SiteUserContext.Provider value={value}>{children}</SiteUserContext.Provider>;
}
