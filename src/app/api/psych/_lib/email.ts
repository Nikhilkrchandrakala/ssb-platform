// Legacy psych_battery sent meeting-link and results-broadcast emails via
// MSG91's email API using Node's `https` module, fire-and-forget (not
// awaited before responding). Ported to `fetch`, and callers here DO await
// it — a deliberate deviation from "fire-and-forget", because a Next.js
// Route Handler running on a serverless platform can be frozen/torn down
// immediately after the response is sent, which would silently drop
// in-flight legacy fire-and-forget calls.
export interface Msg91EmailPayload {
  to: { name: string; email: string }[];
  templateId: string;
  variables: Record<string, string>;
}

export async function sendMsg91Email(payload: Msg91EmailPayload, label: string): Promise<void> {
  if (!process.env.MSG91_AUTHKEY) {
    console.warn(`[psych email] MSG91_AUTHKEY missing in env — skipping send [${label}]`);
    return;
  }

  const body = JSON.stringify({
    recipients: [{ to: payload.to, variables: payload.variables }],
    from: { name: "Integrated SSB Virtuosos", email: "noreply@ssbwithisv.in" },
    domain: "noreply.ssbwithisv.in",
    template_id: payload.templateId,
  });

  try {
    const res = await fetch("https://control.msg91.com/api/v5/email/send", {
      method: "POST",
      headers: {
        authkey: process.env.MSG91_AUTHKEY,
        "Content-Type": "application/json",
      },
      body,
    });
    const text = await res.text();
    console.log(`[psych email] Sent via MSG91 [${label}]. Status: ${res.status}. Response: ${text}`);
  } catch (err) {
    console.error(`[psych email] MSG91 error [${label}]:`, err);
  }
}
