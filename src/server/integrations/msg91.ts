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

// Transactional email via MSG91 (replaces the Gmail/nodemailer sender —
// Gmail's app-password auth was failing in production). Each template is
// created in the MSG91 Email dashboard first and has its own fixed set of
// variables; template IDs below are only usable once MSG91 has approved them.
const EMAIL_API_URL = "https://control.msg91.com/api/v5/email/send";
const EMAIL_DOMAIN = process.env.MSG91_EMAIL_DOMAIN || "ynhb76.mailer91.com";
const EMAIL_FROM = process.env.MSG91_EMAIL_FROM || `no-reply@${EMAIL_DOMAIN}`;
const CREDENTIALS_TEMPLATE_ID = process.env.MSG91_CREDENTIALS_TEMPLATE_ID || "template_25_07_2026_20_07";
// Split into two templates (2026-08-05): the first payment is a "welcome,
// you're in" moment (registration), every payment after that is a routine
// recurring reminder — different tone/content, so one dynamic-label template
// covering both read as generic in both directions.
const REGISTRATION_TEMPLATE_ID = process.env.MSG91_REGISTRATION_TEMPLATE_ID || "";
const INSTALLMENT_TEMPLATE_ID = process.env.MSG91_INSTALLMENT_TEMPLATE_ID || "";
const DOSSIER_UPLOAD_TEMPLATE_ID = process.env.MSG91_DOSSIER_UPLOAD_TEMPLATE_ID || "dossier_upload";
const PIQ_UPLOAD_TEMPLATE_ID = process.env.MSG91_PIQ_UPLOAD_TEMPLATE_ID || "piq_upload";
const ALLOTMENT_TEMPLATE_ID = process.env.MSG91_ALLOTMENT_TEMPLATE_ID || "candidate_allotment";
// Migrated from the legacy `_lib/email.ts`/`sendMsg91Email` (2026-08-05) —
// that wrapper swallowed every error internally and never reported delivery
// status, which is exactly how `results_broadcast_template_1` (wrong
// template id, missing the trailing underscore MSG91 actually uses) went
// unnoticed. These five reuse the same sendTemplateEmail() plumbing as
// every other template in this file, same {delivered:boolean} contract.
const RESULTS_BROADCAST_TEMPLATE_ID = process.env.MSG91_RESULTS_BROADCAST_TEMPLATE_ID || "results_broadcast_template1";
const PSYCH_INTERVIEW_CANDIDATE_TEMPLATE_ID = process.env.MSG91_PSYCH_INTERVIEW_CANDIDATE_TEMPLATE_ID || "psych_interview_candidate";
const PSYCH_INTERVIEW_ASSESSOR_TEMPLATE_ID = process.env.MSG91_PSYCH_INTERVIEW_ASSESSOR_TEMPLATE_ID || "psych_interview_assessor";
const IO_INTERVIEW_TEMPLATE_ID = process.env.MSG91_IO_INTERVIEW_TEMPLATE_ID || "io_interview_template";
const INTERVIEW_TEMPLATE_6_ID = process.env.MSG91_INTERVIEW_TEMPLATE_6_ID || "interview_template_6";

async function sendTemplateEmail(params: {
  to: string;
  name: string;
  templateId: string;
  variables: Record<string, string>;
}): Promise<{ delivered: boolean }> {
  if (!params.templateId) {
    console.error("[msg91 email] no template id configured — skipping send");
    return { delivered: false };
  }
  try {
    const { data } = await axios.post(
      EMAIL_API_URL,
      {
        recipients: [{ to: [{ email: params.to, name: params.name }], variables: params.variables }],
        from: { email: EMAIL_FROM },
        domain: EMAIL_DOMAIN,
        template_id: params.templateId,
      },
      { headers: { "Content-Type": "application/json", Accept: "application/json", authkey: process.env.MSG91_AUTHKEY } }
    );
    const failed = data?.hasError === true || data?.status === "error" || data?.type === "error";
    return { delivered: !failed };
  } catch (err) {
    console.error("[msg91 email] send failed:", err instanceof Error ? err.message : err);
    return { delivered: false };
  }
}

export async function sendCredentialsEmail(params: {
  to: string;
  name: string;
  username: string;
  password: string;
}): Promise<{ delivered: boolean }> {
  return sendTemplateEmail({
    to: params.to,
    name: params.name,
    templateId: CREDENTIALS_TEMPLATE_ID,
    variables: { username: params.username, password: params.password },
  });
}

export async function sendRegistrationPaymentEmail(params: {
  to: string;
  name: string;
  courseName: string;
  batchNo: string;
  startDate: string;
  amount: number;
  link: string;
}): Promise<{ delivered: boolean }> {
  return sendTemplateEmail({
    to: params.to,
    name: params.name,
    templateId: REGISTRATION_TEMPLATE_ID,
    variables: {
      name: params.name,
      course_name: params.courseName,
      batch_no: params.batchNo,
      start_date: params.startDate,
      amount: String(params.amount),
      link: params.link,
    },
  });
}

export async function sendInstallmentPaymentEmail(params: {
  to: string;
  name: string;
  courseName: string;
  batchNo: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  amount: number;
  link: string;
}): Promise<{ delivered: boolean }> {
  return sendTemplateEmail({
    to: params.to,
    name: params.name,
    templateId: INSTALLMENT_TEMPLATE_ID,
    variables: {
      name: params.name,
      course_name: params.courseName,
      batch_no: params.batchNo,
      installment_number: String(params.installmentNumber),
      total_installments: String(params.totalInstallments),
      due_date: params.dueDate,
      amount: String(params.amount),
      link: params.link,
    },
  });
}

// Shared shape used by both the Dossier-upload and PIQ-upload assessor
// alerts — same four variables (assessor/candidate/batch/chest), different
// template per event.
interface AssessorAlertParams {
  to: string;
  assessorName: string;
  candidateName: string;
  batchNumber: string;
  chestNo: string;
}

function sendAssessorAlertEmail(templateId: string, params: AssessorAlertParams): Promise<{ delivered: boolean }> {
  return sendTemplateEmail({
    to: params.to,
    name: params.assessorName,
    templateId,
    variables: {
      assessor: params.assessorName,
      candidate: params.candidateName,
      batch_number: params.batchNumber,
      chest_no: params.chestNo,
    },
  });
}

export function sendDossierUploadedEmail(params: AssessorAlertParams): Promise<{ delivered: boolean }> {
  return sendAssessorAlertEmail(DOSSIER_UPLOAD_TEMPLATE_ID, params);
}

export function sendPiqUploadedEmail(params: AssessorAlertParams): Promise<{ delivered: boolean }> {
  return sendAssessorAlertEmail(PIQ_UPLOAD_TEMPLATE_ID, params);
}

export function sendAllotmentNotificationEmail(params: {
  to: string;
  assessorName: string;
  numberOfCandidates: number;
  batchNo: string;
}): Promise<{ delivered: boolean }> {
  return sendTemplateEmail({
    to: params.to,
    name: params.assessorName,
    templateId: ALLOTMENT_TEMPLATE_ID,
    variables: {
      assessor_name: params.assessorName,
      number_of_candidates: String(params.numberOfCandidates),
      batch_no: params.batchNo,
    },
  });
}

export function sendResultsBroadcastEmail(params: {
  to: string;
  candidateName: string;
  evaluationDetails: string;
}): Promise<{ delivered: boolean }> {
  return sendTemplateEmail({
    to: params.to,
    name: params.candidateName,
    templateId: RESULTS_BROADCAST_TEMPLATE_ID,
    variables: {
      candidate_name: params.candidateName,
      evaluation_details: params.evaluationDetails,
    },
  });
}

// Shared shape for the four meeting-scheduled templates — same five
// variables, different template/recipient per role. assessor_role is sent
// even though none of the four templates' visible copy currently references
// {{assessor_role}} — kept for parity with the pre-migration behavior in
// case it's used in a part of the template not shown when these were shared.
interface MeetingEmailParams {
  to: string;
  candidateName: string;
  assessorName: string;
  assessorRole: string;
  date: string;
  time: string;
  meetingLink: string;
}

function meetingVariables(params: MeetingEmailParams) {
  return {
    candidate_name: params.candidateName,
    assessor_name: params.assessorName,
    assessor_role: params.assessorRole,
    date: params.date,
    time: params.time,
    meeting_link: params.meetingLink,
  };
}

// NOTE (2026-08-05): this template's own copy greets "Dear {{assessor_name}}"
// and says "You have scheduled... with {{candidate_name}}" — that's the
// *assessor's* perspective, but this template is used for the *candidate*
// recipient. Very likely copy-pasted from psych_interview_assessor without
// swapping the wording. Flagged to the user; not silently worked around here
// — variables below are still semantically correct (assessor_name really is
// the assessor, candidate_name really is the candidate), so the fix belongs
// in MSG91's template content, not in this code.
export function sendPsychInterviewCandidateEmail(params: MeetingEmailParams): Promise<{ delivered: boolean }> {
  return sendTemplateEmail({
    to: params.to,
    name: params.candidateName,
    templateId: PSYCH_INTERVIEW_CANDIDATE_TEMPLATE_ID,
    variables: meetingVariables(params),
  });
}

export function sendPsychInterviewAssessorEmail(params: MeetingEmailParams): Promise<{ delivered: boolean }> {
  return sendTemplateEmail({
    to: params.to,
    name: params.assessorName,
    templateId: PSYCH_INTERVIEW_ASSESSOR_TEMPLATE_ID,
    variables: meetingVariables(params),
  });
}

export function sendIoInterviewAssessorEmail(params: MeetingEmailParams): Promise<{ delivered: boolean }> {
  return sendTemplateEmail({
    to: params.to,
    name: params.assessorName,
    templateId: IO_INTERVIEW_TEMPLATE_ID,
    variables: meetingVariables(params),
  });
}

export function sendInterviewCandidateEmail(params: {
  to: string;
  name: string;
  candidateName: string;
  interviewType: string;
  date: string;
  time: string;
  meetingLink: string;
}): Promise<{ delivered: boolean }> {
  return sendTemplateEmail({
    to: params.to,
    name: params.name,
    templateId: INTERVIEW_TEMPLATE_6_ID,
    variables: {
      candidate_name: params.candidateName,
      interview_type: params.interviewType,
      date: params.date,
      time: params.time,
      meeting_link: params.meetingLink,
    },
  });
}

// Transactional SMS via MSG91's Flow API — a different product from the
// OTP-widget API above (different endpoint, different auth shape). Confirmed
// working contract (2026-08-05, verified with a real test send): the
// `template_id` here must be MSG91's own internal template id (a 24-char hex
// string, e.g. from the template's detail/search-by view), NOT the DLT
// Template ID shown alongside it in the dashboard — using the DLT id returns
// {type:"success"} and a real message id but silently never delivers.
// Variable keys are case-sensitive and must match the template's own
// placeholder names exactly — this template uses lowercase ##var1##..##var4##,
// so the recipient object keys must be lowercase var1..var4 too (uppercase
// VAR1 also returns {type:"success"} but delivers with the placeholders
// un-substituted instead of erroring).
const SMS_FLOW_API_URL = "https://control.msg91.com/api/v5/flow/";
const DOSSIER_UPLOAD_SMS_TEMPLATE_ID = process.env.MSG91_DOSSIER_UPLOAD_SMS_TEMPLATE_ID || "";
const PIQ_UPLOAD_SMS_TEMPLATE_ID = process.env.MSG91_PIQ_UPLOAD_SMS_TEMPLATE_ID || "";

interface AssessorAlertSmsParams {
  toPhone: string;
  assessorName: string;
  candidateName: string;
  batchNumber: string;
  chestNo: string;
}

async function sendAssessorAlertSms(templateId: string, params: AssessorAlertSmsParams): Promise<{ delivered: boolean }> {
  if (!templateId) {
    console.error("[msg91 sms] no template id configured — skipping send");
    return { delivered: false };
  }
  try {
    const { data } = await axios.post(
      SMS_FLOW_API_URL,
      {
        template_id: templateId,
        short_url: "0",
        recipients: [
          {
            mobiles: `91${last10(params.toPhone)}`,
            var1: params.assessorName,
            var2: params.candidateName,
            var3: params.batchNumber,
            var4: params.chestNo,
          },
        ],
      },
      { headers: { "Content-Type": "application/json", authkey: process.env.MSG91_AUTHKEY } }
    );
    return { delivered: data?.type === "success" };
  } catch (err) {
    console.error("[msg91 sms] send failed:", err instanceof Error ? err.message : err);
    return { delivered: false };
  }
}

export function sendDossierUploadedSms(params: AssessorAlertSmsParams): Promise<{ delivered: boolean }> {
  return sendAssessorAlertSms(DOSSIER_UPLOAD_SMS_TEMPLATE_ID, params);
}

export function sendPiqUploadedSms(params: AssessorAlertSmsParams): Promise<{ delivered: boolean }> {
  return sendAssessorAlertSms(PIQ_UPLOAD_SMS_TEMPLATE_ID, params);
}

const ALLOTMENT_SMS_TEMPLATE_ID = process.env.MSG91_ALLOTMENT_SMS_TEMPLATE_ID || "";

export async function sendAllotmentNotificationSms(params: {
  toPhone: string;
  assessorName: string;
  numberOfCandidates: number;
  batchNo: string;
}): Promise<{ delivered: boolean }> {
  if (!ALLOTMENT_SMS_TEMPLATE_ID) {
    console.error("[msg91 sms] no template id configured — skipping send");
    return { delivered: false };
  }
  try {
    const { data } = await axios.post(
      SMS_FLOW_API_URL,
      {
        template_id: ALLOTMENT_SMS_TEMPLATE_ID,
        short_url: "0",
        recipients: [
          {
            mobiles: `91${last10(params.toPhone)}`,
            var1: params.assessorName,
            var2: String(params.numberOfCandidates),
            var3: params.batchNo,
          },
        ],
      },
      { headers: { "Content-Type": "application/json", authkey: process.env.MSG91_AUTHKEY } }
    );
    return { delivered: data?.type === "success" };
  } catch (err) {
    console.error("[msg91 sms] send failed:", err instanceof Error ? err.message : err);
    return { delivered: false };
  }
}
