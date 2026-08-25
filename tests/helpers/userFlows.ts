import { APIRequestContext, Page } from '@playwright/test';

export async function createTestCandidate(request: APIRequestContext, candidateEmail: string, candidatePhone: string, password = "Password@123") {
  // 1. Send Email OTP
  await request.post('/api/signup/send-email-otp', {
    data: { email: candidateEmail }
  });

  // 2. Verify Email OTP (using bypass 123456)
  const verifyEmailRes = await request.post('/api/signup/verify-email-otp', {
    data: { email: candidateEmail, otp: '123456' }
  });
  const emailData = await verifyEmailRes.json();
  if (!emailData.success) throw new Error("Failed to verify email: " + JSON.stringify(emailData));

  // 3. Send Phone OTP
  const sendPhoneRes = await request.post('/api/signup/send-phone-otp', {
    data: { phone: candidatePhone }
  });
  const phoneData = await sendPhoneRes.json();
  if (!phoneData.success) throw new Error("Failed to send phone OTP: " + JSON.stringify(phoneData));

  // 4. Verify Phone OTP
  const verifyPhoneRes = await request.post('/api/signup/verify-phone-otp', {
    data: { phone: candidatePhone, otp: '123456', reqId: phoneData.reqId }
  });
  const verifyPhoneData = await verifyPhoneRes.json();
  if (!verifyPhoneData.success) throw new Error("Failed to verify phone: " + JSON.stringify(verifyPhoneData));

  // 5. Register User
  const registerRes = await request.post('/api/register', {
    data: {
      name: "Test Candidate",
      email: candidateEmail,
      phone: candidatePhone,
      password,
      emailVerifyToken: emailData.emailVerifyToken,
      phoneVerifyToken: verifyPhoneData.phoneVerifyToken,
      dob: "2000-01-01",
      ssbAspirant: "Yes",
      servingCandidate: "No"
    }
  });
  const regData = await registerRes.json();
  if (regData.status !== "ok") {
     // if user already exists, that's fine for testing, but let's log it
     console.log("Register returned:", regData);
  }
}

export async function loginAs(page: Page, emailOrPhone: string, password = "Password@123", portal?: string) {
  const isPhone = /^\d{10}$/.test(emailOrPhone);
  const res = await page.request.post('/api/login', {
    data: {
      email: !isPhone ? emailOrPhone : undefined,
      phone: isPhone ? emailOrPhone : undefined,
      password,
      portal
    }
  });
  
  const data = await res.json();
  if (data.status !== "ok") {
    throw new Error("Failed to login: " + JSON.stringify(data));
  }
  
  // The login API sets the token in cookies, so the Page context is now authenticated!
  await page.goto('/ProfileDashboard'); 
}
