import { test, expect } from "@playwright/test";

// Sales Phase 3 (salesimplementation.md) — webhook reconciliation + student
// "Pay Now". Deep, session-based flows (webhook reconciliation, installment
// unlock/provisioning, ownership scoping) are covered by
// `scripts/phase3_sales_verify.ts` against the real dev server + live Atlas,
// same division of labor as Sales Phase 1/2. This suite only covers what
// Playwright is good at: unauthenticated/invalid-request rejection, matching
// the existing convention (phase3-site.spec.ts, phase4-admin.spec.ts, etc.)
// of asserting every protected surface correctly rejects a bare request.

test.describe("POST /api/webhooks/razorpay", () => {
  test("rejects a request with no signature header", async ({ request }) => {
    const response = await request.post("/api/webhooks/razorpay", { data: { event: "payment_link.paid" } });
    expect(response.status()).toBe(400);
  });

  test("rejects a request with an invalid signature", async ({ request }) => {
    const response = await request.post("/api/webhooks/razorpay", {
      data: { event: "payment_link.paid" },
      headers: { "x-razorpay-signature": "not-a-real-signature" },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe("Student installment payment routes require a session", () => {
  test("POST /api/installments/payOrder without a session returns 401", async ({ request }) => {
    const response = await request.post("/api/installments/payOrder", {
      data: { installmentPlanId: "000000000000000000000000", seq: 2 },
    });
    expect(response.status()).toBe(401);
  });

  test("POST /api/installments/verifyPayment without a session returns 401", async ({ request }) => {
    const response = await request.post("/api/installments/verifyPayment", {
      data: {
        razorpay_order_id: "order_fake",
        razorpay_payment_id: "pay_fake",
        razorpay_signature: "sig_fake",
        installmentPlanId: "000000000000000000000000",
        seq: 2,
      },
    });
    expect(response.status()).toBe(401);
  });
});

// ProfileDashboard's own unauthenticated-redirect coverage (now rendering an
// Installments section) is already asserted in phase3-site.spec.ts.
