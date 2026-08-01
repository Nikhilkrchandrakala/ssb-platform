import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { connectDB } from "./db";
import { User } from "./models/User";
import { AdminUser } from "./models/AdminUser";
import { Franchise } from "./models/Franchise";

const JWT_SECRET = process.env.JWT_SECRET || "hdvay6ert72839289()aiyg8t87qt72393293883uhefiuh78ttq3ifi78272jbkj2[]pou89ywe";
// Legacy psych_battery fallback secret — kept only so tokens issued before this
// migration (signed with the old hardcoded default) still verify during cutover.
const JWT_FALLBACK_SECRET =
  process.env.JWT_FALLBACK_SECRET ||
  "hvdvay6ert72839289()aiyg8t87qt72393293883uhefiuh78ttq3ifi78272jbkj?[]]pou89ywe";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "ssb_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export type SessionRole = "lead" | "student" | "assessor" | "admin" | "owner" | "franchise";

export interface SessionPayload {
  id: string;
  role: SessionRole | string;
}

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_MAX_AGE_SECONDS });
}

function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token.trim(), JWT_SECRET) as SessionPayload;
  } catch {
    try {
      return jwt.verify(token.trim(), JWT_FALLBACK_SECRET) as SessionPayload;
    } catch {
      return null;
    }
  }
}

/** Set the session cookie. Must be called from a Route Handler or Server Action. */
export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

async function getSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Resolves the logged-in user, mirroring the legacy AdminLogin dual/triple
 * lookup: "franchise"-role sessions resolve against the separate Franchise
 * collection (franchise accounts are never AdminUser or User documents);
 * other elevated roles (owner/admin/assessor) are checked against AdminUser;
 * everything else falls back to the User collection (students, leads, and
 * any assessors that are actually plain Users with role="assessor").
 */
export async function getCurrentUser() {
  const payload = await getSessionPayload();
  if (!payload) return null;

  await connectDB();

  const elevatedRoles = ["owner", "admin", "assessor"];
  let foundUser: Record<string, unknown> | null = null;

  if (payload.role === "franchise") {
    const franchise = await Franchise.findById(payload.id).lean();
    if (franchise) {
      foundUser = { ...franchise, role: "franchise" };
    }
  } else if (elevatedRoles.includes(payload.role)) {
    const admin = await AdminUser.findById(payload.id).lean();
    if (admin) {
      foundUser = { ...admin, role: payload.role };
    }
  }

  if (!foundUser) {
    const user = await User.findById(payload.id)
      .populate("assignedPsych", "name email")
      .populate("assignedGTO", "name email")
      .populate("assignedIO", "name email")
      .populate("assignedTO", "name email")
      .lean();
    if (user) {
      const role = payload.role || (user as { role?: string }).role || "student";
      foundUser = { ...user, role: role === "lead" ? "student" : role };
    }
  }

  if (!foundUser) return null;

  // `.lean()` skips Mongoose documents entirely, so the schema-level toJSON
  // transform that strips `password` never runs — strip it explicitly here,
  // since getCurrentUser()'s result is passed straight through to Client
  // Component props (SiteUserProvider/AdminUserProvider/PsychUserProvider).
  delete foundUser.password;

  // Also round-trip through JSON: `.lean()` still leaves ObjectId/Date
  // instances (e.g. `_id`, populated refs' `_id`, `createdAt`/`updatedAt`) in
  // the result, and those aren't plain objects — passing them as props to a
  // Client Component throws ("Only plain objects can be passed..."). Every
  // field here already round-trips safely through JSON (ObjectId/Date both
  // implement toJSON), so this is a cheap, safe way to guarantee a
  // serializable result without hand-walking the (nested/populated) shape.
  return JSON.parse(JSON.stringify(foundUser));
}

export function hasRole(user: { role?: string } | null, roles: string[]): boolean {
  return !!user?.role && roles.includes(user.role);
}

/**
 * Server-side guard for candidate-only pages (ProfileDashboard, Order/Payment
 * History, profile). getCurrentUser() resolves any valid session — including
 * staff (owner/admin/assessor/franchise) browsing the public site with their
 * admin-panel cookie still active — so a plain `if (!user)` check let staff
 * accounts render as if they were a candidate (e.g. an owner seeing their own
 * empty "My Profile"/orders dashboard). Redirects unauthenticated visitors to
 * sign in, and redirects any non-student session to the admin panel instead
 * of rendering candidate-only content for them.
 */
export async function requireSiteUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/SignIn");
  if (user.role !== "student") redirect("/admin");
  return user;
}
