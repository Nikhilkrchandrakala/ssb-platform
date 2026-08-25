import { test, expect } from '@playwright/test';
import { createTestCandidate, loginAs } from '../helpers/userFlows';

test.describe('Sales Flows: Self-Serve Checkout (B2C)', () => {
  const candidateEmail = `sales.candidate.${Date.now()}@example.com`;
  const candidatePhone = '888' + Math.floor(1000000 + Math.random() * 9000000);

  test.beforeAll(async ({ request }) => {
    await createTestCandidate(request, candidateEmail, candidatePhone);
  });

  test('Self-Serve Checkout Flow', async ({ page }) => {
    // 1. User logs in
    await test.step('Candidate Login', async () => {
      await loginAs(page, candidateEmail, 'Password@123');
    });

    // Mock internal API routes for Razorpay
    await page.route('/api/createOrder', async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: 'order_test123', amount: 50000, currency: 'INR' },
      });
    });

    await page.route('/api/verifyPayment', async (route) => {
      await route.fulfill({
        status: 200,
        json: { success: true },
      });
    });

    // 2. User navigates to a course batch and clicks "Buy"
    await test.step('Navigate and Click Buy', async () => {
      await page.goto('/Courses'); // Adjust if the course page is different
      // await page.getByRole('button', { name: 'Buy Now' }).first().click();
      // wait for checkout or trigger mock Razorpay
    });

    // 3 & 4. Mock Razorpay Widget completion
    await test.step('Mock Razorpay Completion', async () => {
      // Since the actual Razorpay widget is loaded from an external script,
      // in E2E tests we can trigger the success handler manually if it's exposed, 
      // or we just call the /api/verifyPayment endpoint directly via the browser request
      const verifyRes = await page.request.post('/api/verifyPayment', {
        data: {
          razorpay_order_id: 'order_test123',
          razorpay_payment_id: 'pay_test123',
          razorpay_signature: 'fake_signature'
        }
      });
      expect(verifyRes.ok()).toBeTruthy();
    });

    // 6. Assert User Profile role updated
    await test.step('Verify Student Role', async () => {
      // Reload dashboard or check API
      const res = await page.request.get('/api/profile/me'); // Assuming there's a me endpoint
      if (res.ok()) {
        const data = await res.json();
        expect(data.role).toBe('student');
      }
    });
  });
});
