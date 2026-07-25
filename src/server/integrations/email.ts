import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  fromName?: string;
}): Promise<{ delivered: boolean; loggedOnly?: boolean }> {
  try {
    await getTransporter().sendMail({
      from: `"${opts.fromName || "SSB with ISV"}" <${process.env.EMAIL_USER}>`,
      replyTo: opts.replyTo,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { delivered: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Same dev/credential-missing fallback as the legacy SendEmail.js: log
    // instead of hard-failing so local flows aren't blocked by absent SMTP creds.
    if (
      process.env.NODE_ENV !== "production" ||
      message.includes("BadCredentials") ||
      message.includes("Username and Password not accepted")
    ) {
      console.log("[email fallback] would have sent:", { to: opts.to, subject: opts.subject });
      return { delivered: false, loggedOnly: true };
    }
    throw err;
  }
}
