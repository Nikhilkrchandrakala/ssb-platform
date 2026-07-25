import { test, expect } from "@playwright/test";

// Sales Phase 4 (salesimplementation.md) — Sales/Sales Head/Owner dashboards.
// Deep, session-based scoping (an executive sees only their own students, a
// head sees their reports', account CRUD ownership checks, etc.) is covered
// by `scripts/phase4_sales_verify.ts` against the real dev server + live
// Atlas, plus a headless click-through as each role — same division of
// labor as Sales Phase 1-3. This suite only covers unauthenticated
// rejection, matching the existing convention across every other phaseN spec.

test.describe("GET /admin/Sales requires a session", () => {
  test("redirects an unauthenticated visitor to /admin", async ({ request }) => {
    const response = await request.get("/admin/Sales", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toBe("/admin");
  });
});

test.describe("Sales dashboard API routes reject an unauthenticated caller", () => {
  test("GET /api/sales/myStudents without a session returns 403", async ({ request }) => {
    const response = await request.get("/api/sales/myStudents");
    expect(response.status()).toBe(403);
  });

  test("GET /api/sales/teamStudents without a session returns 403", async ({ request }) => {
    const response = await request.get("/api/sales/teamStudents");
    expect(response.status()).toBe(403);
  });

  test("POST /api/sales/team/createExecutive without a session returns 403", async ({ request }) => {
    const response = await request.post("/api/sales/team/createExecutive", {
      data: { name: "x", email: "x@example.com", password: "password123" },
    });
    expect(response.status()).toBe(403);
  });

  test("PATCH /api/sales/team/:id without a session returns 403", async ({ request }) => {
    const response = await request.patch("/api/sales/team/000000000000000000000000", {
      data: { name: "x" },
    });
    expect(response.status()).toBe(403);
  });
});
