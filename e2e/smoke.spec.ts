import { test, expect } from "@playwright/test";

test("home page loads", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
});

test("Phase 1 health check: DB connects and JWT round-trips", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.db.connected).toBe(true);
  expect(typeof body.db.userCount).toBe("number");
  expect(typeof body.db.adminCount).toBe("number");
  expect(body.jwtRoundTripOk).toBe(true);
  expect(body.currentUser).toBeNull(); // no session cookie sent
});
