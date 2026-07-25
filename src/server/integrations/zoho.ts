import axios from "axios";

// Zoho CRM Web-to-Lead form submission — ported as-is from the legacy
// zohoService.js, same form/field IDs (these are tied to a specific Zoho
// webform configuration, not secrets).
const ZOHO_ENDPOINT = "https://crm.zoho.in/crm/WebToLeadForm";
const MAGAZINE_FORM_xnQsjsdp = "720f9139cb02224d64cc5aeff73db9005f465ab2730e39da353431dcb1023430";
const MAGAZINE_FORM_xmIwtLD = "65e6b28d5296b04427701a1d7ca42502817609b9ddfb9fb3f6e06ce37fe146c8d00d862d54130301661ddbc145eb18dc";

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
