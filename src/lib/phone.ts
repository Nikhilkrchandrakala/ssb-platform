/**
 * Normalizes a phone number for Zoho and CRM webforms:
 * - If 10 digits (e.g. "9876543210") -> "+919876543210"
 * - If 11 digits starting with 0 (e.g. "09876543210") -> "+919876543210"
 * - If 12 digits starting with 91 (e.g. "919876543210") -> "+919876543210"
 * - If already prefixed with "+" (e.g. international "+14155552671") -> preserved as `+${digits}`
 * - Any other non-empty digit sequence defaults to `+91${digits}`
 */
export function formatPhoneWithCountryCode(raw?: string | null): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }
  return `+91${digits}`;
}
