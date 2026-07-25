import { test, expect } from "@playwright/test";

// Phase 5 smoke coverage: every psych-battery route requires an active
// session (there is no public page in this module — even the root redirect
// page sits behind the same gate), so every route should 307-redirect an
// unauthenticated visitor to /SignIn (the collapsed SSO handoff — no more
// ?token= param, no separate psych-battery login).

test.describe("psych-battery routes redirect unauthenticated visitors to /SignIn", () => {
  for (const path of [
    "/psych-battery",
    "/psych-battery/assessor",
    "/psych-battery/meetings",
    "/psych-battery/admin",
    "/psych-battery/upload/000000000000000000000000",
    "/psych-battery/review/000000000000000000000000",
    "/psych-battery/assessment/000000000000000000000000",
    "/psych-battery/presentation/000000000000000000000000",
    "/psych-battery/admin/assessment/000000000000000000000000",
  ]) {
    test(`GET ${path} without a session redirects to /SignIn`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(response.headers()["location"]).toBe("/SignIn");
    });
  }
});

test("psych API rejects unauthenticated requests", async ({ request }) => {
  const response = await request.get("/api/psych/assessments");
  expect(response.status()).toBe(401);
});
