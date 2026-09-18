import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/server/rateLimit";
import { sendContactEnquiryEmail } from "@/server/integrations/msg91";
import { connectDB } from "@/server/db";
import { Lead } from "@/server/models";

interface ContactBody {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "send-email", { limit: 5, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  const body: ContactBody = await req.json();
  const { name, email, phone, subject, message } = body;

  // Persist every enquiry that has enough contact info to follow up on,
  // independent of whether the notification email below succeeds — this
  // endpoint's old Gmail sender was silently failing in production (see
  // src/server/integrations/email.ts, now replaced by MSG91 below), which
  // meant a submission that failed to email was lost outright with no
  // record anywhere. Reusing the Lead collection (same one /api/addLead
  // writes to) means these now show up on the existing /admin/leads page
  // instead of needing a new one.
  let leadSaved = false;
  if (name && email && phone) {
    try {
      await connectDB();
      await new Lead({ name, email, phoneNumber: phone }).save();
      leadSaved = true;
    } catch (err) {
      console.error("[send-email] failed to persist lead:", err instanceof Error ? err.message : err);
    }
  }

  // MSG91 template (scripts/msg91_contact_enquiry_template.html) — awaiting
  // dashboard approval as of 2026-09-06. Until MSG91_CONTACT_ENQUIRY_TEMPLATE_ID
  // is set, this returns delivered:false and the Lead save above is the only
  // record of the enquiry.
  const { delivered: emailDelivered } = await sendContactEnquiryEmail({ name, email, phone, subject, message });

  if (!leadSaved && !emailDelivered) {
    return NextResponse.json({ success: false, message: "Failed to submit enquiry" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: emailDelivered ? "Email sent successfully!" : "Enquiry received — our team will follow up.",
    emailDelivered,
  });
}
