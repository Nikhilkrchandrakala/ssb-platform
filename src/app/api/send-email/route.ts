import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/server/integrations/email";

interface ContactBody {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  replyTo?: string;
  ssbExperience?: string;
  nextSsb?: string;
  ssbCenter?: string;
  ssbPreparation?: string;
  ssbEntry?: string;
}

const row = (label: string, value?: string) =>
  value ? `<p><span class="label">${label}:</span> ${value}</p>` : "";

export async function POST(req: NextRequest) {
  const body: ContactBody = await req.json();
  const { name, email, phone, subject, message, replyTo, ssbExperience, nextSsb, ssbCenter, ssbPreparation, ssbEntry } = body;

  const nameParts = (name || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const html = `
    <html>
      <head>
        <style>
          .container { font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; }
          .content { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
          .header { font-size: 24px; color: #333333; text-align: center; padding-bottom: 10px; border-bottom: 2px solid #00bfa5; margin-bottom: 20px; }
          .details { font-size: 16px; color: #555555; line-height: 1.8; }
          .details p { margin: 0 0 12px 0; }
          .label { font-weight: bold; color: #333333; }
          .message-block { margin-top: 4px; padding: 12px 16px; background: #f9f9f9; border-left: 3px solid #00bfa5; font-size: 15px; color: #444; line-height: 1.6; white-space: pre-wrap; }
          .footer { margin-top: 30px; text-align: center; font-size: 14px; color: #888888; border-top: 1px solid #eee; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div class="header">${subject}</div>
            <div class="details">
              ${row("First Name", firstName)}
              ${row("Last Name", lastName)}
              ${row("Mobile Number", phone)}
              ${row("Email Address", email)}
              ${row("What is your SSB experience?", ssbExperience)}
              ${row("When is your next SSB?", nextSsb)}
              ${row("In which Board/selection center is your next SSB/AFSB?", ssbCenter)}
              ${row("Which entry of SSB are you going for?", ssbEntry)}
              ${row("How are you preparing for SSB?", ssbPreparation)}
              <p><span class="label">Message:</span></p>
              <div class="message-block">${message || "—"}</div>
            </div>
            <div class="footer">SSB with ISV — New Website Enquiry</div>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const result = await sendMail({
      to: "info@ssbwithisv.in",
      subject: subject || "New Website Enquiry",
      html,
      replyTo: replyTo || email,
      fromName: "SSB with ISV Website",
    });
    if (result.loggedOnly) {
      return NextResponse.json({ success: true, message: "Email logged to console (Development Fallback)", logged: true });
    }
    return NextResponse.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to send email", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
