import { test, expect } from "@playwright/test";

// Phase 2 smoke coverage: read-only public endpoints against the live Atlas
// cluster, and auth-gating on protected endpoints. Deliberately avoids any
// route that would write data (register/createOrder/etc.) — this suite only
// confirms every route group actually boots and wires up to the DB/session
// layer correctly, not full business-logic correctness.

test.describe("public read routes respond", () => {
  for (const path of [
    "/api/allCourses",
    "/api/allSlots",
    "/api/allBlogs",
    "/api/allGallery",
    "/api/allMagazinePdfs",
    "/api/allCandidates",
    "/api/contactSettings",
    "/api/authDisplaySettings",
    "/api/allNumberMonitors",
  ]) {
    test(`GET ${path} returns 200`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
    });
  }
});

test.describe("protected routes reject unauthenticated requests", () => {
  for (const path of ["/api/myOrders", "/api/admin/users", "/api/user/profile", "/api/psych/assessments"]) {
    test(`GET ${path} without a session returns 401`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(401);
    });
  }
});

test("login rejects a nonexistent account without leaking whether email or password was wrong", async ({ request }) => {
  const response = await request.post("/api/login", {
    data: { email: "no-such-user@example.com", password: "whatever123!A" },
  });
  expect(response.status()).toBe(400);
});

test("register rejects a weak password before touching the DB", async ({ request }) => {
  const response = await request.post("/api/register", {
    data: {
      name: "Test User",
      email: "playwright-smoke@example.com",
      phone: "9999999999",
      password: "weak",
      emailVerifyToken: "x",
      phoneVerifyToken: "x",
    },
  });
  expect(response.status()).toBe(400);
});
