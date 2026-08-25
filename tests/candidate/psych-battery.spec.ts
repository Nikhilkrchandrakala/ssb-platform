import { test, expect } from '@playwright/test';
import { createTestCandidate, loginAs } from '../helpers/userFlows';

test.describe('Candidate Evaluation Flows: Psychological Battery & Evaluation', () => {
  const candidateEmail = `test.candidate.${Date.now()}@example.com`;
  const candidatePhone = '999' + Math.floor(1000000 + Math.random() * 9000000);
  const assessorEmail = `assessor.${Date.now()}@example.com`;

  test.beforeAll(async ({ request }) => {
    // Create candidate
    await createTestCandidate(request, candidateEmail, candidatePhone);
    
    // In a real scenario, we'd also create an assessor here, but we can just use 
    // an API bypass or register an assessor account if possible.
    // For now, let's assume we just want to test the candidate side first.
  });

  test('Complete Psych Battery Flow', async ({ page, request }) => {
    // 1. Candidate Login
    await test.step('Candidate Login', async () => {
      await loginAs(page, candidateEmail, 'Password@123');
      await expect(page).toHaveURL(/.*ProfileDashboard.*/);
    });

    // 2. Onboarding: Accept psych evaluation consent
    await test.step('Onboarding: Accept Psych Consent', async () => {
      // In UI, candidate clicks a button to accept consent which hits this API:
      const res = await page.request.post('/api/user/register-psych-consent');
      expect(res.ok()).toBeTruthy();
    });

    // 3. Timed Battery Execution
    await test.step('Timed Battery Execution', async () => {
      await page.goto('/psych-battery/instructions'); // adjust URL as needed
      // Mocking the clock if needed to fast forward
      await page.clock.install();
      await page.clock.fastForward('00:30:00');
      // Upload mock image and submission (mock the API)
      await page.route('/api/psych/uploadBatteryImage', async (route) => {
        await route.fulfill({ status: 200, json: { url: 'http://mock/image.png' } });
      });
      await page.route('/api/psych/submissions', async (route) => {
        await route.fulfill({ status: 200, json: { success: true } });
      });
      // In real test, click submit buttons
    });
  });
});
