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
