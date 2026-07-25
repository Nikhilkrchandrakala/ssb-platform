import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { isPsychAdmin } from "@/server/psychAccess";
import StudentEntryView from "./StudentEntryView";

/**
 * Root redirect, ported from App.tsx's <RoleRedirect />:
 * - Admins/owners with psych-battery access → /psych-battery/admin
 * - Assessors → /psych-battery/assessor
 * - Everyone else (students) → StudentEntry
 *
 * Bug fixed from legacy: the original RoleRedirect sent ANY admin/owner role
 * straight to "/admin" without checking isAdminUser, while the "/admin"
 * route itself *did* gate on isAdminUser and bounced back to "/" on failure
 * — an infinite redirect loop for an admin account without the
 * evaluations/super_admin/psych_battery permission. Here the same
 * `isPsychAdmin` check gates both this redirect and the /admin page itself
 * (see requirePsychAdmin in src/server/psychAccess.ts), so an under-permissioned
 * admin/owner is sent to /admin/Profile instead of looping.
 */
export default async function PsychBatteryRootPage() {
  const user = await getCurrentUser();

  if (user?.role === "admin" || user?.role === "owner") {
    redirect(isPsychAdmin(user) ? "/psych-battery/admin" : "/admin/Profile");
  }
  if (user?.role === "assessor") {
    redirect("/psych-battery/assessor");
  }

  return <StudentEntryView />;
}
