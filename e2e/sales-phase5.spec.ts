import { test, expect } from "@playwright/test";

// Sales Phase 5 (salesimplementation.md) — reminders + overdue access
// revocation + resolveDefaultedPlan. Deep scenarios (a 3-days-out reminder
// firing exactly once, an overdue plan actually getting revoked and
// checkPurchase reflecting it, the strict "only the owning sales person"
// boundary on resolveDefaultedPlan) are covered by
// `scripts/phase5_sales_verify.ts` against the real dev server + live
// Atlas. This suite only covers rejection of an unauthenticated/unkeyed
// caller, matching the existing convention.

test.describe("Cron routes require the shared secret, not a session", () => {
  test("POST /api/cron/sendInstallmentReminders without x-cron-secret returns 401", async ({ request }) => {
    const response = await request.post("/api/cron/sendInstallmentReminders");
    expect(response.status()).toBe(401);
  });

  test("POST /api/cron/revokeOverdueAccess without x-cron-secret returns 401", async ({ request }) => {
    const response = await request.post("/api/cron/revokeOverdueAccess");
    expect(response.status()).toBe(401);
  });
});

test.describe("resolveDefaultedPlan and auditLog require a sales session", () => {
  test("POST /api/sales/resolveDefaultedPlan without a session returns 403", async ({ request }) => {
    const response = await request.post("/api/sales/resolveDefaultedPlan", {
      data: { installmentPlanId: "000000000000000000000000", action: "restoreAccess" },
    });
    expect(response.status()).toBe(403);
  });

  test("GET /api/sales/auditLog without a session returns 403", async ({ request }) => {
    const response = await request.get("/api/sales/auditLog");
    expect(response.status()).toBe(403);
  });
});
