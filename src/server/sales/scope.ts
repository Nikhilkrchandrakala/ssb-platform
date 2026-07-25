import { canAccessSalesRecord, SalesActor } from "@/server/adminAccess";

interface PopulatedSalesPerson {
  _id: unknown;
  reportsTo?: unknown;
}

/**
 * Resolves an InstallmentPlan's (populated) salesPersonId into the
 * SalesRecordScope canAccessSalesRecord needs, and gates access with it.
 * Shared by shareLink/checkInstallmentStatus so the populate+scope-check
 * pattern isn't duplicated per route.
 */
export function assertCanAccessPlan(actor: SalesActor, salesPerson: PopulatedSalesPerson): boolean {
  return canAccessSalesRecord(actor, {
    salesPersonId: String(salesPerson._id),
    salesPersonReportsTo: salesPerson.reportsTo ? String(salesPerson.reportsTo) : null,
  });
}

export function toSalesActor(user: { _id: string; role?: string; salesRole?: "executive" | "head" | null }): SalesActor {
  return { _id: String(user._id), role: user.role, salesRole: user.salesRole ?? null };
}
