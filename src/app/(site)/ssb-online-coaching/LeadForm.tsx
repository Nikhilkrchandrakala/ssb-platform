"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Button from "./Button";

// WebForm Analytics Servlet URL provided in the updated Zoho webform snippet
const WF_ANAL_SCRIPT_ID = "wf_anal_online";
const WF_ANAL_SRC =
  "https://crm.zohopublic.in/crm/WebFormAnalyticsServeServlet?rid=02805f4176aa0fee1f869278f6156ac308363a8ede6bf0e8d8af4cb52a6f0e46e1d4c366f6d7589a82bcfbcbcc52cbd9gid03dc9a160ca552ba327b96828a50a0c02182d70406ac140e4e8654964b95a728giddc3f68aa2e219f63d9d52c4d21edc74ccba6cc17e85f63b93ed24a4e17853298gid21d66a03e3580e8335a6a3640531ca953249c64e640979c550c99336243ef33e&tw=69032bb1275bd3928330d8d2cb917f96f78105a8a2736a07080b0e3498f11c2c&version=v2";

const EXPERIENCE_OPTIONS = ["Fresher", "Screened Out", "Conference Out"];

const ENTRY_OPTIONS = [
  "10+2 B. Tech. entry (Navy)",
  "10+2 TES Army",
  "AFCAT",
  "Army Service entry (PCSL, SCO, ACC, AMC)",
  "CDS",
  "Navy Service entry (CW, SD List)",
  "NCC special entry",
  "NDA",
  "RVC",
  "SSC (JAG)",
  "SSC (Tech) Army",
  "SSC Navy (Executive, Law, Pilot, Naval Air Operations, Engineering, Electrical, Logistics, Naval Armament, Education)",
  "Territorial Army",
  "TGC",
];

const BOARD_OPTIONS = [
  "1 AFSB Dehradun",
  "2 AFSB Mysuru",
  "3 AFSB Gandhinagar",
  "4 AFSB Varanasi",
  "5 AFSB Guwahati",
  "33 SSB Bhopal (Navy)",
  "NSB Vizag (Navy)",
  "12 SSB Bangalore (Navy)",
  "SSB (Kolkata) (Navy)",
  "31 | 32 SSB Selection Center North (Jalandhar)",
  "11 | 14 | 18 | 19 | 34 SSB Selection Center East (Prayagraj)",
  "20 | 21 | 22 SSB Selection Center Central (Bhopal)",
  "17 | 24 SSB Selection Center South (Bangalore)",
  "CGSB (NOIDA)",
  "Not known right now",
  "NOT IN THIS LIST",
];

const labelStyle = { display: "block", font: "400 12.5px/1.3 var(--font-body)", color: "var(--base-cream-500)", marginBottom: 4 };

const ZOHO_TARGET_IFRAME = "ssb-online-coaching-zoho-target";
const IFRAME_TIMEOUT_MS = 15000;

function toZohoDate(value: string) {
  // value is YYYY-MM-DD from <input type="date">; Zoho's CONTACTCF51 wants DD/MM/YYYY.
  if (!value) return "";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

export default function LeadForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState<string[]>([]);
  const [boards, setBoards] = useState<string[]>([]);
  const [nextSsbDate, setNextSsbDate] = useState("");
  const awaitingResultRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const existing = document.getElementById(WF_ANAL_SCRIPT_ID);
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = WF_ANAL_SCRIPT_ID;
    script.src = WF_ANAL_SRC;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.getElementById(WF_ANAL_SCRIPT_ID)?.remove();
    };
  }, []);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const email = (form.elements.namedItem("Email") as HTMLInputElement | null)?.value ?? "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.preventDefault();
      alert("Please enter a valid email address.");
      return;
    }

    // Populate Zoho Analytics tracking inputs on the form before POST
    try {
      const wfaTrack = (window as unknown as { _wfa_track?: { wfa_submit?: (ev: unknown) => void } })._wfa_track;
      wfaTrack?.wfa_submit?.(e);
    } catch {
      // non-fatal — lead still submits without analytics attribution
    }

    // Set Zoho SalesIQ visitor info before navigation fires
    try {
      const zoho = (window as unknown as { $zoho?: { salesiq?: { visitor: { name: (n: string) => void; email: (e: string) => void; uniqueid: () => string } } } }).$zoho;
      if (zoho?.salesiq) {
        const firstName = (form.elements.namedItem("First Name") as HTMLInputElement | null)?.value ?? "";
        const lastName = (form.elements.namedItem("Last Name") as HTMLInputElement | null)?.value ?? "";
        zoho.salesiq.visitor.name(`${firstName} ${lastName}`.trim());
        if (email) zoho.salesiq.visitor.email(email);
        const ldtInput = form.elements.namedItem("LDTuvid") as HTMLInputElement | null;
        if (ldtInput) ldtInput.value = zoho.salesiq.visitor.uniqueid() || "";
      }
    } catch {
      // non-fatal
    }

    // Also keep a copy in our own database (best-effort — never blocks or affects the Zoho submission below).
    try {
      const firstName = (form.elements.namedItem("First Name") as HTMLInputElement | null)?.value ?? "";
      const lastName = (form.elements.namedItem("Last Name") as HTMLInputElement | null)?.value ?? "";
      const mobile = (form.elements.namedItem("Mobile") as HTMLInputElement | null)?.value ?? "";
      fetch("/api/addLead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          email,
          phoneNumber: mobile,
          enrollmentMode: "offline",
          source: "google-ads-offline",
        }),
      }).catch(() => {});
    } catch {
      // non-fatal
    }

    setSubmitting(true);
    setSubmitFailed(false);
    awaitingResultRef.current = true;
    timeoutRef.current = setTimeout(() => {
      if (!awaitingResultRef.current) return;
      awaitingResultRef.current = false;
      setSubmitting(false);
      setSubmitFailed(true);
    }, IFRAME_TIMEOUT_MS);
  }

  function handleIframeLoad() {
    if (!awaitingResultRef.current) return; // ignore initial iframe mount
    awaitingResultRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <div
      id="apply"
      style={{
        background: "var(--color-bg-surface-elevated)",
        boxShadow: "inset 0 0 0 1.5px rgb(75,75,77), 0 0 24px rgba(0,0,0,0.45)",
        padding: "clamp(20px,4vw,32px)",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ font: "500 24px/1.25 var(--font-display)", color: "var(--color-text-primary)" }}>
          Book Your Free Discovery Call
        </span>
        <span style={{ font: "400 15px/1.5 var(--font-body)", color: "var(--base-cream-500)" }}>
          Get your pricing, batch dates &amp; a personalised prep roadmap — takes 30 seconds.
        </span>
      </div>

      <iframe name={ZOHO_TARGET_IFRAME} onLoad={handleIframeLoad} title="Zoho form submission" aria-hidden="true" style={{ display: "none" }} />

      {submitted ? (
        <div style={{ padding: "20px 0", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ font: "500 18px/1.3 var(--font-display)", color: "var(--base-gold-source)" }}>Thanks — you&apos;re in!</span>
          <span style={{ font: "400 14px/1.5 var(--font-body)", color: "var(--base-cream-300)" }}>
            We&apos;ve received your details and will call you within 24 hours.
          </span>
        </div>
      ) : (
        <form
          id="webform736128000003033151"
          name="WebToContacts736128000003033151"
          action="https://crm.zoho.in/crm/WebToContactForm"
          method="POST"
          acceptCharset="UTF-8"
          target={ZOHO_TARGET_IFRAME}
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {/* Zoho Required Configurations */}
          <input type="text" style={{ display: "none" }} name="xnQsjsdp" defaultValue="1cc17b1298b7f1b3482cfe9e51591d9bf886471d6df95931fed31a02db22d3d1" />
          <input type="hidden" name="zc_gad" id="zc_gad" defaultValue="" />
          <input type="text" style={{ display: "none" }} name="xmIwtLD" defaultValue="bba2ef21a9cca51db146568e7a0c0dd3280646d2ebb171b87ad167c2246b2ec885a08a8217c04a2b3eccb99cb19e904e" />
          <input type="text" style={{ display: "none" }} name="actionType" defaultValue="Q29udGFjdHM=" />
          <input type="text" style={{ display: "none" }} name="returnURL" defaultValue="https://ssbwithisv.in/Batches" />
          <input type="text" style={{ display: "none" }} id="ldeskuid" name="ldeskuid" />
          <input type="text" style={{ display: "none" }} id="LDTuvid" name="LDTuvid" />
          <input type="hidden" name="Lead Source" defaultValue="Google Ads Offline Batch" />
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
            name="aG9uZXlwb3Q"
            defaultValue=""
          />

          <div>
            <label htmlFor="First_Name" style={labelStyle}>First Name *</label>
            <input type="text" name="First Name" id="First_Name" placeholder="Your first name" maxLength={40} required />
          </div>
          <div>
            <label htmlFor="Last_Name" style={labelStyle}>Last Name *</label>
            <input type="text" name="Last Name" id="Last_Name" placeholder="Your last name" maxLength={80} required />
          </div>
          <div>
            <label htmlFor="Mobile" style={labelStyle}>Mobile *</label>
            <input type="text" name="Mobile" id="Mobile" placeholder="10-digit mobile number" maxLength={30} required />
          </div>
          <div>
            <label htmlFor="Email" style={labelStyle}>Primary Email *</label>
            <input type="text" data-ftype="email" autoComplete="false" name="Email" id="Email" placeholder="you@example.com" maxLength={100} required />
          </div>
          <div>
            <label htmlFor="CONTACTCF11" style={labelStyle}>What is your SSB Experience? *</label>
            <select name="CONTACTCF11" id="CONTACTCF11" required defaultValue="-None-">
              <option value="-None-">-None-</option>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="next_ssb_picker" style={labelStyle}>When is your next SSB?</label>
            <input
              type="date"
              id="next_ssb_picker"
              value={nextSsbDate}
              onChange={(e) => setNextSsbDate(e.target.value)}
            />
            <input type="hidden" name="CONTACTCF51" value={toZohoDate(nextSsbDate)} />
          </div>
          <div>
            <label htmlFor="CONTACTCF3" style={labelStyle}>Which entry of SSB are you going for? *</label>
            <select
              name="CONTACTCF3"
              id="CONTACTCF3"
              multiple
              required
              value={entries}
              onChange={(e) => setEntries(Array.from(e.target.selectedOptions, (o) => o.value))}
            >
              {ENTRY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span style={{ display: "block", font: "400 11.5px/1.4 var(--font-body)", color: "var(--base-cream-600)", marginTop: 4 }}>
              Hold Ctrl/Cmd to select more than one.
            </span>
          </div>
          <div>
            <label htmlFor="CONTACTCF2" style={labelStyle}>In which board(s)/ center(s) is your next SSB/AFSB *</label>
            <select
              name="CONTACTCF2"
              id="CONTACTCF2"
              multiple
              required
              value={boards}
              onChange={(e) => setBoards(Array.from(e.target.selectedOptions, (o) => o.value))}
            >
              {BOARD_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span style={{ display: "block", font: "400 11.5px/1.4 var(--font-body)", color: "var(--base-cream-600)", marginTop: 4 }}>
              Hold Ctrl/Cmd to select more than one.
            </span>
          </div>

          {submitFailed && (
            <span style={{ font: "400 12.5px/1.5 var(--font-body)", color: "#ff8080", textAlign: "center" }}>
              That took longer than expected — if it doesn&apos;t confirm in a moment, please WhatsApp us instead so we don&apos;t miss you.
            </span>
          )}

          <Button variant="solid" type="submit" disabled={submitting} style={{ width: "100%", marginTop: 4 }}>
            <span style={{ fontFamily: "'Monoform', ui-monospace, 'SF Mono', Menlo, Consolas, monospace", letterSpacing: "0.05em" }}>
              {submitting ? "SUBMITTING…" : "SIGN UP FOR UPCOMING BATCH →"}
            </span>
          </Button>
          <span style={{ font: "400 12px/1.5 var(--font-body)", color: "var(--base-cream-600)", textAlign: "center" }}>
            No spam. We&apos;ll call you within 24 hours.
          </span>
        </form>
      )}
      <a
        href="https://wa.me/917483617249"
        target="_blank"
        rel="noreferrer"
        style={{
          display: "block",
          textAlign: "center",
          padding: 12,
          font: "400 14px/1.4 var(--font-body)",
          color: "var(--base-gold-source)",
          boxShadow: "inset 0 0 0 1px rgb(75,75,77)",
        }}
      >
        Or chat with us on WhatsApp instantly
      </a>
    </div>
  );
}
