import { getCurrentUser } from "@/server/auth";
import { requirePsychAssessorOrAdmin } from "@/server/psychAccess";
import MeetingsView from "./MeetingsView";

// Ported from psych_battery/src/pages/Meetings.tsx. Originally gated
// assessor-only (mirroring legacy's <ProtectedRoute allowedRoles={['assessor']} />),
// which meant an owner/admin had no way to see what date/time/link an
// assessor had actually set for a candidate's mock interview or psych 1:1
// feedback — the only place that data existed was this page. Widened
// 2026-08-14 (owner request) to requirePsychAssessorOrAdmin, matching the
// review page's own gate — /api/psych/meetings already returns every
// meeting with no filtering for admin/owner callers (it only restricts
// students to their own and assessors to their assigned role), so no
// backend change was needed, just the route guard. Legacy also hid the
// sidebar nav link for GTO assessors (Layout.tsx), but that was only ever a
// nav-visibility rule, never a route guard, so it is intentionally not
// reproduced here — a GTO assessor who navigates to this URL directly still
// reaches it, exactly as in legacy.
export default async function MeetingsPage() {
  const user = await getCurrentUser();
  requirePsychAssessorOrAdmin(user); // redirects to /psych-battery if role isn't assessor/admin/owner (or /SignIn if not logged in)
  return <MeetingsView />;
}
