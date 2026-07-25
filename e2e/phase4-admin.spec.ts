import { test, expect } from "@playwright/test";

// Phase 4 smoke coverage: the admin panel's public pages render (200), and
// every permission-gated page behind the (protected) route group correctly
// redirects an unauthenticated visitor to /admin instead of serving content.

test.describe("admin public pages render", () => {
  for (const path of ["/admin", "/admin/AccountRecovery"]) {
    test(`GET ${path} returns 200`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
    });
  }
});

test.describe("protected admin pages redirect unauthenticated visitors to /admin", () => {
  for (const path of [
    "/admin/dashboard",
    "/admin/Profile",
    "/admin/RolesManagement",
    "/admin/all-users",
    "/admin/StudentRoster",
    "/admin/Allotment",
    "/admin/candidate",
    "/admin/BlogList",
    "/admin/Blogs",
    "/admin/magazine",
    "/admin/Gallery",
    "/admin/Courses",
    "/admin/CouponManagement",
    "/admin/TotalSales",
    "/admin/Franchise",
    "/admin/FranchiseDashboard",
    "/admin/leads",
  ]) {
    test(`GET ${path} without a session redirects to /admin`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(response.headers()["location"]).toBe("/admin");
    });
  }
});

test("AdminLogin rejects a nonexistent account without touching student-facing routes", async ({ request }) => {
  const response = await request.post("/api/AdminLogin", {
    data: { email: `no-such-admin-${Date.now()}@example.com`, password: "wrong-password" },
  });
  expect(response.status()).toBe(400);
});

test("student forgot-password send-otp 404s for an unknown account", async ({ request }) => {
  const response = await request.post("/api/student/forgot-password/send-otp", {
    data: { email: `no-such-student-${Date.now()}@example.com` },
  });
  expect(response.status()).toBe(404);
});
