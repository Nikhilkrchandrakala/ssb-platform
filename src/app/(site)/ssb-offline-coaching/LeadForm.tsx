"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Button from "./Button";

// This specific webform's analytics servlet URL, copied verbatim from
// Zoho's source — it's tied to this form's rid/tw pair (different from
// ssb-coaching's own analytics script) and populates window._wfa_track,
// which handleSubmit below calls into right before the real POST fires.
const WF_ANAL_SCRIPT_ID = "wf_anal_offline";
const WF_ANAL_SRC =
  "https://crm.zohopublic.in/crm/WebFormAnalyticsServeServlet?rid=dbe4e59f9bd20b8e6e8e910de49fc2d3c1d9c03fa5ee65405aea4353b5603856960359efc93176f874b589b966aaaacagid468b3b40f710944b6332dbead3b4549ab95e44930e506614182981878362f309gid1f6172330c60cb11ab2e8c014b704f5078035e3a2b1ceac757403f20a244bfbagidba087c247cdfe283a4b9581ddaf323d06466051ffa878345efd5a4bc2d8d2d69&tw=122a2cdaeaef4ac0d42099a60540c4c2392f180a38b031fc1591945cf83c23d8&version=v2";

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

// Zoho field/token values below are copied verbatim from the "Nagpur Offline
// Batch" Web-to-Contact form Zoho gave us (webform736128000004651001) — do
// not edit xnQsjsdp/xmIwtLD/actionType or the field `name`s, Zoho matches on
// these exactly and silently drops anything that doesn't match.
//
// Posting into a hidden iframe (rather than fetch()) is the same trick
// ../ssb-coaching/LeadForm.tsx uses: Zoho's Web-to-Contact endpoint issues
// its own redirect on success, which a fetch() can't follow cross-origin
// (CORS), but a real <form> POST navigating inside a hidden iframe handles
// that redirect invisibly, off-screen.
const ZOHO_TARGET_IFRAME = "ssb-offline-coaching-zoho-target";
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

    // Let Zoho's own analytics servlet (loaded above) populate its hidden
    // tracking inputs on the form before it POSTs — mirrors the sibling
    // CRA site's proven From.jsx pattern for this exact servlet.
    try {
      const wfaTrack = (window as unknown as { _wfa_track?: { wfa_submit?: (ev: unknown) => void } })._wfa_track;
      wfaTrack?.wfa_submit?.(e);
    } catch {
      // non-fatal — lead still submits without analytics attribution
    }

    // Set Zoho SalesIQ visitor info before the navigation fires, same as the
    // raw snippet's trackVisitor736128000004651001() — SalesIQ itself is
    // already loaded site-wide from (site)/layout.tsx, so this just feeds it.
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
      // non-fatal — lead still submits without SalesIQ visitor linkage
    }

    // Save a copy to our own DB in parallel with the Zoho submission above —
    // best-effort, never blocks or affects the Zoho POST either way.
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
      // non-fatal — Zoho submission is unaffected either way
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
    if (!awaitingResultRef.current) return; // ignore the iframe's initial blank mount
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
          Enquiry Form
        </span>
        <span style={{ font: "400 15px/1.5 var(--font-body)", color: "var(--base-cream-500)" }}>
          Food + Accommodation + Nagpur Railway Station Transfer. Limited seats — our team will contact you within 24 hours.
        </span>
      </div>

      <iframe name={ZOHO_TARGET_IFRAME} onLoad={handleIframeLoad} title="Zoho form submission" aria-hidden="true" style={{ display: "none" }} />

      {submitted ? (
        <div style={{ padding: "20px 0", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ font: "500 18px/1.3 var(--font-display)", color: "var(--base-gold-source)" }}>Thank you.</span>
          <span style={{ font: "400 14px/1.5 var(--font-body)", color: "var(--base-cream-300)" }}>
            Our team will reach you soon.
          </span>
        </div>
      ) : (
        <form
          id="webform736128000004651001"
          name="WebToContacts736128000004651001"
          action="https://crm.zoho.in/crm/WebToContactForm"
          method="POST"
          acceptCharset="UTF-8"
          target={ZOHO_TARGET_IFRAME}
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {/* Do not remove — required by Zoho for this form to be accepted. */}
          <input type="text" style={{ display: "none" }} name="xnQsjsdp" defaultValue="c31f1cb7a8ed14809935463b2542e562a6f16eee67077cbf146e668f701a12eb" />
          <input type="hidden" name="zc_gad" id="zc_gad" defaultValue="" />
          <input type="text" style={{ display: "none" }} name="xmIwtLD" defaultValue="06eec1fdb26b9331c392972e85d8d56f4b8811916dab2b2883d21d42007a72366f96b55c15cc29cfa27dd59c02ca1fcc" />
          <input type="text" style={{ display: "none" }} name="actionType" defaultValue="Q29udGFjdHM=" />
          <input type="text" style={{ display: "none" }} name="returnURL" defaultValue="null" />
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
          {/* End required Zoho fields */}

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
            <input type="text" data-ftype="email" autoComplete="off" name="Email" id="Email" placeholder="you@example.com" maxLength={100} required />
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
            <label htmlFor="CONTACTCF3" style={labelStyle}>Which entry of SSB are you going for?</label>
            <select
              name="CONTACTCF3"
              id="CONTACTCF3"
              multiple
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
            <label htmlFor="CONTACTCF2" style={labelStyle}>In which board(s)/ center(s) is your next SSB/AFSB?</label>
            <select
              name="CONTACTCF2"
              id="CONTACTCF2"
              multiple
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
              That took longer than expected — if it doesn&apos;t confirm in a moment, please WhatsApp us instead so we
              don&apos;t miss you.
            </span>
          )}

          <Button variant="solid" type="submit" disabled={submitting} style={{ width: "100%", marginTop: 4 }}>
            <span style={{ fontFamily: "'Monoform', ui-monospace, 'SF Mono', Menlo, Consolas, monospace", letterSpacing: "0.05em" }}>
              {submitting ? "SUBMITTING…" : "SUBMIT"}
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
