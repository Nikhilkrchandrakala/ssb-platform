import axios from "axios";

// Same MSG91 widget-based OTP flow the legacy backend used for both phone and
// email OTP (MSG91 supports email as an "identifier" through the same widget
// API). Credentials/widget IDs fall back to the legacy hardcoded defaults so
// existing MSG91 widget configuration keeps working during cutover.
const TOKEN_AUTH = process.env.MSG91_TOKEN_AUTH || "432663TzWGndK2N7sR6710de92P1";
const PHONE_WIDGET_ID = process.env.MSG91_WIDGET_ID || "346a776c5749333834363239";
const EMAIL_WIDGET_ID = process.env.MSG91_EMAIL_WIDGET_ID || "3666656b4157333035303235";

const MSG91_BASE = "https://api.msg91.com/api/v5/widget";

// Bypass OTP for local dev, mirroring the legacy behavior — never active in production.
const DEV_BYPASS_OTP = "123456";

export function isDevOtpBypass(otp: string): boolean {
  return process.env.NODE_ENV !== "production" && otp === DEV_BYPASS_OTP;
}

export async function sendPhoneOtp(last10Phone: string): Promise<{ success: boolean; reqId?: string }> {
  const { data } = await axios.post(
    `${MSG91_BASE}/sendOtp`,
    { identifier: `91${last10Phone}`, widgetId: PHONE_WIDGET_ID, tokenAuth: TOKEN_AUTH },
    { headers: { "Content-Type": "application/json" } }
  );
  return data?.type === "success" ? { success: true, reqId: data.message } : { success: false };
}

export async function sendEmailOtp(email: string): Promise<{ success: boolean; reqId?: string }> {
  const { data } = await axios.post(
    `${MSG91_BASE}/sendOtp`,
    { identifier: email, widgetId: EMAIL_WIDGET_ID, tokenAuth: TOKEN_AUTH },
    { headers: { "Content-Type": "application/json" } }
  );
  return data?.type === "success" ? { success: true, reqId: data.message } : { success: false };
}

export async function verifyOtp(params: { otp: string; reqId: string; widget: "phone" | "email" }): Promise<boolean> {
  if (isDevOtpBypass(params.otp)) return true;
  const widgetId = params.widget === "phone" ? PHONE_WIDGET_ID : EMAIL_WIDGET_ID;
  const { data } = await axios.post(
    `${MSG91_BASE}/verifyOtp`,
    { otp: params.otp, reqId: params.reqId, widgetId, tokenAuth: TOKEN_AUTH },
    { headers: { "Content-Type": "application/json" } }
  );
  return data?.type === "success";
}

/** Verifies an access token issued client-side by the MSG91 widget SDK. */
export async function verifyAccessToken(accessToken: string): Promise<{ success: boolean; data?: unknown }> {
  const url = process.env.VERIFY_ACCESS_TOKEN_URL || "https://control.msg91.com/api/v5/widget/verifyAccessToken";
  const { data } = await axios.post(
    url,
    { authkey: process.env.MSG91_AUTHKEY, "access-token": accessToken },
    { headers: { "Content-Type": "application/json" } }
  );
  return { success: data?.type === "success", data };
}

export function cleanPhone(raw: string): string {
  return raw.toString().replace(/\D/g, "");
}

export function last10(raw: string): string {
  const digits = cleanPhone(raw);
  return digits.length >= 10 ? digits.slice(-10) : digits;
}
