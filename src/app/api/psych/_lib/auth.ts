import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";

export type PsychUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> & {
  role: string;
  permissions?: string[];
  assessorType?: string | null;
};

/**
 * Resolves the logged-in user for a psych-battery route, replicating legacy
 * psych_battery's `authenticate` middleware behavior on top of the shared
 * `getCurrentUser()`:
 *  - 401 if there's no session at all.
 *  - Legacy additionally gated EVERY route (except /api/auth/me, which this
 *    module doesn't port) for plain `admin` sessions behind a "Candidate
 *    Evaluations" permission: admins needed `super_admin`, `evaluations`, or
 *    `psych_battery` in their `permissions` array. `owner` sessions always
 *    passed. Replicated verbatim here since it's specific to this module.
 */
export async function requireUser(): Promise<{ user: PsychUser } | { error: NextResponse }> {
  const user = (await getCurrentUser()) as PsychUser | null;
  if (!user) {
    return { error: NextResponse.json({ message: "No token provided" }, { status: 401 }) };
  }

  if (user.role === "admin") {
    const perms = user.permissions || [];
    if (!perms.includes("super_admin") && !perms.includes("evaluations") && !perms.includes("psych_battery")) {
      return {
        error: NextResponse.json(
          { message: "Access Denied: You do not have the Candidate Evaluations permission." },
          { status: 403 }
        ),
      };
    }
  }

  return { user };
}

/** Mirrors legacy `isAdmin` middleware: role must be 'admin' or 'owner'. */
export function requireAdmin(user: PsychUser): NextResponse | null {
  if (user.role === "admin" || user.role === "owner") return null;
  return NextResponse.json({ message: "Admin access required" }, { status: 403 });
}

export function userId(user: PsychUser): string {
  return String((user as { _id?: unknown; id?: unknown })._id ?? (user as { id?: unknown }).id ?? "");
}
