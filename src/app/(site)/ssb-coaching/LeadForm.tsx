"use client";

import type { FormEvent } from "react";
import Button from "./Button";

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

const labelStyle = { display: "block", font: "400 12.5px/1.3 var(--font-body)", color: "var(--base-cream-500)", marginBottom: 4 };

export default function LeadForm() {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const email = (form.elements.namedItem("Email") as HTMLInputElement | null)?.value ?? "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.preventDefault();
      alert("Please enter a valid email address.");
    }
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

      <form
        id="webform736128000003033151"
        name="WebToContacts736128000003033151"
        action="https://crm.zoho.in/crm/WebToContactForm"
        method="POST"
        acceptCharset="UTF-8"
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <input type="text" style={{ display: "none" }} name="xnQsjsdp" defaultValue="25796a8614b19db7da36f554879d898c2ec17b39490dfdb22314cdcdfeaf2b26" />
        <input type="hidden" name="zc_gad" id="zc_gad" defaultValue="" />
        <input type="text" style={{ display: "none" }} name="xmIwtLD" defaultValue="d099604cb30a5138673cda622fefe8e59eaf27e84032f3b7580c4fc936e4ffa226c3e989d15447063c3a852c17731b73" />
        <input type="text" style={{ display: "none" }} name="actionType" defaultValue="Q29udGFjdHM=" />
        <input type="text" style={{ display: "none" }} name="returnURL" defaultValue="https://ssbwithisv.in/Batches" />
        <input type="text" style={{ display: "none" }} id="ldeskuid" name="ldeskuid" />
        <input type="text" style={{ display: "none" }} id="LDTuvid" name="LDTuvid" />
        <input type="hidden" name="Lead Source" defaultValue="Google Ads" />
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
          <label htmlFor="CONTACTCF3" style={labelStyle}>Which entry of SSB are you going for? *</label>
          <select name="CONTACTCF3" id="CONTACTCF3" multiple required>
            {ENTRY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <span style={{ display: "block", font: "400 11.5px/1.4 var(--font-body)", color: "var(--base-cream-600)", marginTop: 4 }}>
            Hold Ctrl/Cmd to select more than one.
          </span>
        </div>
        <input type="hidden" name="Lead Source" defaultValue="Google Ads" />

        <Button variant="solid" type="submit" style={{ width: "100%", marginTop: 4 }}>
          <span style={{ fontFamily: "'Monoform', ui-monospace, 'SF Mono', Menlo, Consolas, monospace", letterSpacing: "0.05em" }}>
            SIGN UP FOR UPCOMING BATCH →
          </span>
        </Button>
        <span style={{ font: "400 12px/1.5 var(--font-body)", color: "var(--base-cream-600)", textAlign: "center" }}>
          No spam. We&apos;ll call you within 24 hours.
        </span>
      </form>
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
