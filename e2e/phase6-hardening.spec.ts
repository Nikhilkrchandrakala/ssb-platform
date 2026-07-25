import { test, expect } from "@playwright/test";

test.describe("SEO conventions", () => {
  test("GET /sitemap.xml returns 200 with the public pages", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("/Courses");
    expect(body).toContain("/blogs");
  });

  test("GET /robots.txt returns 200 and disallows admin/psych-battery/api", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Disallow: /admin");
    expect(body).toContain("Disallow: /psych-battery");
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain("Sitemap:");
  });
});

test.describe("notifications share one event path", () => {
  test("GET /api/notifications without a session returns 401", async ({ request }) => {
    const response = await request.get("/api/notifications");
    expect(response.status()).toBe(401);
  });

  test("GET /api/psych/notifications without a session returns 401", async ({ request }) => {
    const response = await request.get("/api/psych/notifications");
    expect(response.status()).toBe(401);
  });
});
