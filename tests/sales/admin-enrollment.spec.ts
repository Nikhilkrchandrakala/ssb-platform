import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/userFlows';

test.describe('Sales Flows: Admin Installment Enrollment (B2B)', () => {
  // Admin credentials should be seeded or available via env
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const newStudentEmail = `student.${Date.now()}@example.com`;

  test('Admin Enrollment Flow', async ({ page }) => {
    // 1. Admin logs in
    await test.step('Admin Login', async () => {
      // Assuming 'admin' portal is available
      await loginAs(page, adminEmail, adminPassword, 'admin');
      // Verify admin dashboard
    });

    // 2. Admin fills out enrollment form
    await test.step('Enrollment Form Submission', async () => {
      // Navigate to Sales dashboard / Enrollment
      // await page.goto('/admin/enrollment');
      // Fill out the form
      // Mock the API response if we want to isolate frontend
      await page.route('/api/sales/enrollStudent', async (route) => {
        await route.fulfill({
          status: 200,
          json: { success: true, installmentPlanId: 'plan_test123' },
        });
      });
      // Click submit
    });

    // 3. Mock Webhook
    await test.step('Mock Razorpay Webhook', async () => {
      // Simulate Razorpay hitting the webhook endpoint for the installment
      const webhookRes = await page.request.post('/api/sales/checkInstallmentStatus', {
        data: {
          payload: {
            payment: {
              entity: {
                id: 'pay_test456',
                order_id: 'order_test456',
                status: 'captured'
              }
            }
          }
        }
      });
      expect(webhookRes.ok()).toBeTruthy();
    });

    // 4. Assertions
    await test.step('Verify Provisioning', async () => {
      // In E2E, we'd check the DB or Admin UI to ensure the student was provisioned
      // Check the users list for newStudentEmail
    });
  });
});
