import axios from "axios";

// Zoho CRM Web-to-Lead form submission — ported as-is from the legacy
// zohoService.js, same form/field IDs (these are tied to a specific Zoho
// webform configuration, not secrets).
const ZOHO_ENDPOINT = "https://crm.zoho.in/crm/WebToLeadForm";
const MAGAZINE_FORM_xnQsjsdp = "02bcae07e827fd0da16125fd3c7432ab71b0bdb869c72ef473842434aa43435d";
const MAGAZINE_FORM_xmIwtLD = "40d8a6952872f82f01dbb53d6bd57d62e00c62aa084324b44b148605e451c9fb410df6872b5df8a10e7ca4dd2995af88";

// Offline-batch signup ("Website Booking OFFLINE" lead source) — a
// Web-to-Contact form, separate from the Web-to-Lead one above. Only
// collects name/email/mobile, matching what OfflineJoinPanel's verified
// signup already has on hand.
const ZOHO_CONTACT_ENDPOINT = "https://crm.zoho.in/crm/WebToContactForm";
const OFFLINE_JOIN_FORM_xnQsjsdp = "028de40f126d6972da367028aa76467e602f8b2e74a06d8560ddef05bf1b53d5";
const OFFLINE_JOIN_FORM_xmIwtLD = "ae64ccdfcc6f817547e9cc708f581e1d2630ac2da9cf0836ae0115104a0e7f0f307b61a8a65ba23c06890a3370814282";

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = (fullName || "").trim().split(/\s+/);
  if (parts.length > 1) return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  return { firstName: "", lastName: parts[0] || "User" };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export interface ZohoLeadUser {
  name?: string;
  email?: string;
  phone?: string;
  dob?: string;
  ssbAspirant?: string;
  servingCandidate?: string;
  vtxHeard?: string;
  youtubeSubscribed?: string;
  podcastSubscribed?: string;
  ssbExperience?: string;
  courseType?: string;
  nextSsbDate?: string;
  ssbBoards?: string[];
  ssbEntries?: string[];
  city?: string;
  state?: string;
}

/** Submits a signup's full profile to the Magazine Download Zoho webform. Never throws — logs and returns false on failure. */
export async function submitSignupLead(user: ZohoLeadUser): Promise<boolean> {
  try {
    const { firstName, lastName } = splitName(user.name || "");
    const email = (user.email || "").trim();
    let phone = (user.phone || "").trim();
    if (phone.length === 10) phone = `+91${phone}`;

    const params = new URLSearchParams();
    params.append("xnQsjsdp", MAGAZINE_FORM_xnQsjsdp);
    params.append("zc_gad", "");
    params.append("xmIwtLD", MAGAZINE_FORM_xmIwtLD);
    params.append("actionType", "TGVhZHM=");
    params.append("returnURL", "null");
    params.append("aG9uZXlwb3Q", "");
    params.append("First Name", firstName);
    params.append("Last Name", lastName);
    params.append("Email", email);
    params.append("Mobile", phone);
    params.append("LEADCF53", formatDate(user.dob));
    params.append("LEADCF25", user.ssbAspirant || "-None-");
    params.append("LEADCF1", user.servingCandidate || "-None-");
    params.append("LEADCF5", user.vtxHeard || "-None-");
    params.append("LEADCF8", user.youtubeSubscribed || "-None-");
    params.append("LEADCF7", user.podcastSubscribed || "-None-");
    params.append("LEADCF9", user.ssbExperience || "-None-");
    params.append("LEADCF27", user.courseType || "-None-");
    params.append("LEADCF51", formatDate(user.nextSsbDate));
    params.append("LEADCF17", Array.isArray(user.ssbBoards) ? user.ssbBoards.join(";") : "");
    params.append("LEADCF15", Array.isArray(user.ssbEntries) ? user.ssbEntries.join(";") : "");
    params.append("City", user.city || "");
    params.append("State", user.state || "");
    params.append("Lead Source", "Magazine Downloads");

    const response = await axios.post(ZOHO_ENDPOINT, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    });

    console.log(`[zoho] signup lead submitted for ${email}, status ${response.status}`);
    return true;
  } catch (err) {
    console.error("[zoho] submitSignupLead failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Submits a verified offline-batch join (OfflineJoinPanel) to Zoho as a Contact. Never throws — logs and returns false on failure. */
export async function submitOfflineJoinContact(name: string, email: string, phone: string): Promise<boolean> {
  try {
    const { firstName, lastName } = splitName(name || "");
    const cleanEmail = (email || "").trim();
    let cleanPhone = (phone || "").trim();
    if (cleanPhone.length === 10) cleanPhone = `+91${cleanPhone}`;

    const params = new URLSearchParams();
    params.append("xnQsjsdp", OFFLINE_JOIN_FORM_xnQsjsdp);
    params.append("zc_gad", "");
    params.append("xmIwtLD", OFFLINE_JOIN_FORM_xmIwtLD);
    params.append("actionType", "Q29udGFjdHM=");
    params.append("returnURL", "null");
    params.append("aG9uZXlwb3Q", "");
    params.append("Lead Source", "Website Booking OFFLINE");
    params.append("First Name", firstName);
    params.append("Last Name", lastName);
    params.append("Email", cleanEmail);
    params.append("Mobile", cleanPhone);

    const response = await axios.post(ZOHO_CONTACT_ENDPOINT, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    });

    console.log(`[zoho] offline join contact submitted for ${cleanEmail}, status ${response.status}`);
    return true;
  } catch (err) {
    console.error("[zoho] submitOfflineJoinContact failed:", err instanceof Error ? err.message : err);
    return false;
  }
}
