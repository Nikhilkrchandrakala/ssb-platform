import { redirect } from "next/navigation";

// Mirrors legacy admin-header.js's PAGE_PERMISSIONS map: which `permissions`
// entry on an AdminUser unlocks which admin module. Franchise/assessor
// accounts never carry these permissions at all — they're routed to their
// own dedicated page (FranchiseDashboard / Profile) by hasAdminPermission
// always returning false for them here.
export type AdminPermissionKey =
  | "dashboard"
  | "magazine"
  | "blogs"
  | "gallery"
  | "candidates"
  | "courses"
  | "franchise"
  | "sales"
  | "coupons"
  | "admin"
  | "leads"
  | "roles"
  | "allotment"
  | "students"
  | "evaluations";

export const ADMIN_PANEL_ROLES = ["owner", "admin", "franchise", "assessor"];

export interface AdminLikeUser {
  role?: string;
  permissions?: string[];
}

export function hasAdminPermission(user: AdminLikeUser | null, key: AdminPermissionKey): boolean {
  if (!user) return false;
  if (user.role === "owner") return true;
  if (user.role !== "admin") return false;
  const perms = user.permissions || [];
  if (perms.includes("super_admin")) return true;
  if (key === "evaluations") return perms.includes("evaluations") || perms.includes("psych_battery");
  return perms.includes(key);
}

/**
 * Call at the top of every permission-gated admin page (Server Component).
 * Redirects to the login gateway if there's no session at all, or to
 * /admin/Profile if the session is valid but lacks this module's permission
 * (covers franchise/assessor accounts landing on a URL that isn't theirs,
 * and admin accounts whose permissions don't include this module).
 */
export function requireAdminPermission(user: AdminLikeUser | null, key: AdminPermissionKey) {
  if (!user || !ADMIN_PANEL_ROLES.includes(user.role || "")) {
    redirect("/admin");
  }
  if (!hasAdminPermission(user, key)) {
    redirect("/admin/Profile");
  }
}

// --- Sales module (salesimplementation.md Phase 1) ---
// salesRole/reportsTo live on AdminUser; role stays "admin" with
// permissions: ["sales"] (or "owner", which bypasses both checks below).

export interface SalesActor {
  _id: string;
  role?: string;
  salesRole?: "executive" | "head" | null;
}

export interface SalesRecordScope {
  // The AdminUser id of the sales person who owns this record (Order/InstallmentPlan).
  salesPersonId: string;
  // That sales person's own `reportsTo` (their head's AdminUser id, if any).
  // Callers must resolve this server-side (e.g. from a populated salesPersonId,
  // or a separate AdminUser lookup) — never trust a client-supplied value for either field.
  salesPersonReportsTo?: string | null;
}

/**
 * Gates read access to a sales-owned record (student/order/installment plan).
 * owner: everything. head: own records + records belonging to an executive who
 * reports to them. executive: only their own records. Every sales route/query
 * must filter through this — never trust a client-supplied `salesPersonId`.
 */
export function canAccessSalesRecord(actor: SalesActor | null, record: SalesRecordScope): boolean {
  if (!actor) return false;
  if (actor.role === "owner") return true;
  if (actor.salesRole === "executive") return record.salesPersonId === actor._id;
  if (actor.salesRole === "head") {
    return record.salesPersonId === actor._id || record.salesPersonReportsTo === actor._id;
  }
  return false;
}

export interface SalesAccountTarget {
  // The target AdminUser's own `reportsTo` field.
  reportsTo?: string | null;
}

/**
 * Gates *account* CRUD (creating/editing a Sales Executive's AdminUser record) —
 * distinct from canAccessSalesRecord, which gates student/plan data. owner can
 * manage any account; head can create/edit only accounts where reportsTo ===
 * actor._id; nobody else (including an executive) can manage any account here.
 * Deletion is intentionally out of scope for this helper — it stays exclusively
 * in the existing owner-only RolesManagement page/route (see Phase 1 matrix).
 */
export function canManageSalesAccount(actor: SalesActor | null, targetAccount: SalesAccountTarget): boolean {
  if (!actor) return false;
  if (actor.role === "owner") return true;
  if (actor.salesRole === "head") return targetAccount.reportsTo === actor._id;
  return false;
}
