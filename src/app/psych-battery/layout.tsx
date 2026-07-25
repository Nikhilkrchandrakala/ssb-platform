import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth";
import { requirePsychUser } from "@/server/psychAccess";
import { PsychUserProvider, type PsychUser } from "@/components/psych/PsychUserProvider";

// theme.css now imported from the root src/app/globals.css instead of here —
// see the comment there for why (per-segment CSS chunk caused a real
// unstyled flash on first client-side navigation into this route tree).

export const metadata: Metadata = {
  title: "Candidate Evaluation | SSB with ISV",
  icons: { icon: "/assets/logo/ISV2.png" },
};

// Outer shell for the entire /psych-battery segment (both the sidebar-shell
// routes and the fullscreen assessment/presentation/editor routes) — the
// coarse auth gate (any logged-in student/assessor/admin/owner), matching
// legacy's bare <ProtectedRoute /> wrapping every route in App.tsx. Per-role
// gates (assessor-only, admin-only) happen per-page via src/server/psychAccess.ts.
export default async function PsychBatteryLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  requirePsychUser(user);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=JetBrains+Mono:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      <PsychUserProvider initialUser={user as PsychUser}>{children}</PsychUserProvider>
    </>
  );
}
