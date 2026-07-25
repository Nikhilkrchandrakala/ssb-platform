import { redirect } from "next/navigation";
import { hasAdminPermission } from "./adminAccess";

export interface PsychLikeUser {
  role?: string;
  permissions?: string[];
}

// Legacy UserRole type (psych_battery/src/types.ts) was student | assessor | admin | owner —
// franchise/lead were never part of this module. getCurrentUser() already
// normalizes "lead" to "student".
const PSYCH_ROLES = ["student", "assessor", "admin", "owner"];

/**
 * Mirrors legacy AuthProvider's `isAdminUser`: owner, or admin with
 * super_admin/evaluations/psych_battery permission. Reuses the admin panel's
 * own permission check (`"evaluations"` already covers all three legacy
 * permission strings) rather than duplicating the logic.
 */
export function isPsychAdmin(user: PsychLikeUser | null): boolean {
  return hasAdminPermission(user, "evaluations");
}

/** Bare ProtectedRoute equivalent — any logged-in student/assessor/admin/owner. */
export function requirePsychUser(user: PsychLikeUser | null) {
  if (!user || !PSYCH_ROLES.includes(user.role || "")) {
    redirect("/SignIn");
  }
}

/** ProtectedRoute requireAdmin equivalent. */
export function requirePsychAdmin(user: PsychLikeUser | null) {
  requirePsychUser(user);
  if (!isPsychAdmin(user)) redirect("/psych-battery");
}

/** ProtectedRoute allowedRoles={['assessor']} equivalent. */
export function requirePsychAssessor(user: PsychLikeUser | null) {
  requirePsychUser(user);
  if (user?.role !== "assessor") redirect("/psych-battery");
}

/** ProtectedRoute allowedRoles={['assessor', 'admin']} equivalent (admin here also covers owner, matching legacy's isAllowed check). */
export function requirePsychAssessorOrAdmin(user: PsychLikeUser | null) {
  requirePsychUser(user);
  if (user?.role !== "assessor" && !isPsychAdmin(user)) redirect("/psych-battery");
}
