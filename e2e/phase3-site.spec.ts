import { test, expect } from "@playwright/test";

// Phase 3 smoke coverage: every ported public page renders (200), and the
// pages behind the new server-side auth guard correctly redirect an
// unauthenticated visitor to /SignIn instead of serving protected content.

test.describe("public site pages render", () => {
  for (const path of [
    "/",
    "/aboutssbwithisv",
    "/aboutSSB",
    "/Contactus",
    "/Courses",
    "/Batches",
    "/Gallery",
    "/Magazine",
    "/HalfOfFame",
    "/blogs",
    "/PrivacyPolicy",
    "/TermsConditions",
    "/RefundCancellation",
    "/SignIn",
    "/SignUp",
    "/AccountRecovery",
    "/ssbVirtualTrainingXperience",
    "/Success",
  ]) {
    test(`GET ${path} returns 200`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
    });
  }
});

test.describe("protected pages redirect unauthenticated visitors to /SignIn", () => {
  for (const path of ["/ProfileDashboard", "/OrderHistory", "/PaymentHistory", "/profile"]) {
    test(`GET ${path} without a session redirects to /SignIn`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(response.headers()["location"]).toBe("/SignIn");
    });
  }
});

test("unknown route renders the site 404 page", async ({ request }) => {
  const response = await request.get("/this-route-does-not-exist");
  expect(response.status()).toBe(404);
});
