import { getCurrentUser } from "@/server/auth";
import { requirePsychAssessor } from "@/server/psychAccess";
import MeetingsView from "./MeetingsView";

// Ported from psych_battery/src/pages/Meetings.tsx, gated the same way legacy's
// <ProtectedRoute allowedRoles={['assessor']} /> gated /meetings — narrower
// than the review page's gate: admins/owners do NOT get in here. Legacy also
// hid the sidebar nav link for GTO assessors (Layout.tsx), but that was only
// ever a nav-visibility rule, never a route guard, so it is intentionally not
// reproduced here — a GTO assessor who navigates to this URL directly still
// reaches it, exactly as in legacy.
export default async function MeetingsPage() {
  const user = await getCurrentUser();
  requirePsychAssessor(user); // redirects to /psych-battery if role isn't "assessor" (or /SignIn if not logged in)
  return <MeetingsView />;
}
