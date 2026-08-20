import type { Metadata } from "next";
import Link from "next/link";
import "./styles.css";
import Chip from "./Chip";
import Button from "./Button";
import LeadForm from "./LeadForm";

// No literal "#" in this title — Zoho SalesIQ's own widget-init API 400s on
// any page_title containing one ({"code":1015,"message":"Either the
// inputstream is invalid or absent"}, confirmed 2026-08-20), which silently
// breaks the chat button since the widget never finishes initializing.
const PAGE_TITLE = "SSB with ISV - India's No. 1 Online SSB Coaching | Book Your Free Discovery Call";
const PAGE_DESCRIPTION =
  "Authentic online SSB mentorship by a DIPR-certified GTO. Assessor-led, personality-first coaching for Army, Navy & Air Force aspirants - fully online. ~35% success rate.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "https://ssbwithisv.in/ssb-coaching" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "https://ssbwithisv.in/ssb-coaching",
    type: "website",
  },
};

const IMG = "/static/ssb-coaching";

const heroBullets = [
  "Founder is a DIPR-Certified, former Group Testing Officer — India's youngest GTO since 1947",
  "Team of DIPR certified ex-SSB Interviewing Officers and Psychologists",
  "VTX™ — India's first Virtual GTO Ground, so GTO day 1 and 2 feels familiar, and not intimidating",
  "Fully online. Same quality of mentoring from any city in India",
  "12-Day SSB Hackathon — PPDT, Psychology, Interview & GTO covered end-to-end",
  "02 special sessions by Ex-Coord Officer, Selection Center South (Bangalore)",
];

const heroStats = [
  { value: "200+", label: "Recommended" },
  { value: "700+", label: "Coached" },
  { value: "~35%", label: "Success Rate" },
];

const aboutTags = ["Assessor-Led Mentoring", "Handholding till Recommendation", "All entries covered", "Science, Not Shortcuts"];

const founderCreds = [
  "India's Youngest Group Testing Officer in the history of the Indian Armed Forces since 1947, across all three services.",
  "Founding Member & 1st GTO of SSB (Kolkata), Indian Navy's 4th Officers' Selection Board, Diamond Harbour, West Bengal.",
  "Ex-GTO, 12 SSB Bangalore — Selection Centre South, India's first defence officers' selection centre.",
  "DIPR-Certified — trained at the Defence Institute of Psychological Research, Ministry of Defence.",
  "Masters in Psychology (First Class), with minors in Industrial & Organisational Psychology.",
  "Commanded a Warship — Indian Navy, Executive Branch.",
  "12,500+ candidates personally assessed at the SSB for the Indian Army and Indian Navy.",
];

const assessors = [
  {
    photo: `${IMG}/mentor-pankaj.jpg`,
    name: "Commodore Pankaj Singh (Retd.)",
    role: "Interviewing Officer",
    badge: "Ex Board President, 12 SSB Bangalore",
    desc: "Commanded various Indian Naval Ships and Bases; served in Operations Vijay, Cactus, Pawan and Parakram. 20,000+ candidates assessed.",
  },
  {
    photo: `${IMG}/mentor-lalit.jpg`,
    name: "Lt. Cdr. Lalit Kumar (Retd.)",
    role: "Psychologist",
    badge: "Ex Technical Officer (Psychologist), NSB Vizag & 12 SSB Bangalore",
    desc: "Electrical Officer on frontline warships, with specialised training as a Psychology Assessor. 20,000+ candidates assessed.",
  },
];

const curriculum = [
  { title: "Introduction to SSB & PPDT", items: ["New Stage 1 process — complete walkthrough", "Picture Perception & Discussion Test theory", "Live mock PPDT with individual feedback", "What the assessors observe on Day 1"] },
  { title: "Psych Theory & Mock Psych Test", items: ["TAT, WAT, SRT & SDT — theory & approach", "Full mock Psych test under timed conditions", "Detailed written feedback on every response", "OLQ mapping through psychological responses"] },
  { title: "Interview Theory & Mock Interview", items: ["Personal Interview theory — what the IO looks for", "PIQ-based preparation & self-awareness drills", "Full mock interview with live feedback", "Stress interview handling & composure training"] },
  { title: "Group Testing Course", items: ["GD, GPE, PGT, HGT, Command Task", "Individual Obstacles & Final Group Task", "Leadership & OLQ development in groups", "VTX™ — Virtual GTO Ground experience"] },
  { title: "OLQs & Correlation", items: ["All 15 Officer-Like Qualities, explained one by one", "How each OLQ maps across PPDT, Psych, GTO & Interview", "Correlating assessor observations across every stage", "Building a consistent, authentic personality thread"] },
];

const rankers = [
  { photo: `${IMG}/air-suriyansh.jpg`, air: "AIR 01", name: "Suriyansh Singh Parihar", detail: "SSC Tech 67 · Indian Army", fit: "cover" as const },
  { photo: `${IMG}/air-pooja.jpg`, air: "AIR 01", name: "Pooja Rao", detail: "SSCW Tech 36", fit: "cover" as const },
  { photo: `${IMG}/air-rishikesh.jpg`, air: "AIR 183", name: "Rishikesh L.", detail: "CDS OTA 2 · SSC (NT) 124", fit: "contain" as const },
];

const recPhotos = [
  { src: `${IMG}/rec1.jpg`, pos: "50% 15%" },
  { src: `${IMG}/rec2.jpg`, pos: "50% 10%" },
  { src: `${IMG}/rec3.jpg`, pos: "50% 0%" },
  { src: `${IMG}/rec4.jpg`, pos: "50% 10%" },
];

const philosophy = [
  { strong: "Authenticity over performance", rest: "real responses, not rehearsed ones." },
  { strong: "Clarity reduces anxiety", rest: "demystifying the process builds composure." },
  { strong: "Preparation should clarify, not interfere", rest: "self-awareness over scripts." },
  { strong: "The 15 OLQs beyond the SSB", rest: "life skills, not just exam concepts." },
];

const vtxPillars = ["Mental clarity before ground day", "Natural group behaviour preserved", "Real assessment insight built in"];

const testimonials = [
  {
    quote:
      "I recently got recommended from 4 AFSB Varanasi. I had a really good experience preparing for SSB at ISV. Their approach is practical and focused on real SSB conditions — Nikhil sir's upfront feedback rather than rote learning. ISV's VTX helped me understand GTO tasks, obstacle handling and group planning clearly. The assessors provide honest and practical feedback, genuinely helping in developing officer-like qualities.",
    who: "Suriyansh Singh Parihar",
    context: "ISV Batch 60, Recommended, 4 AFSB Varanasi",
  },
  {
    quote:
      "GTO — Nikhil sir gave me the clarity and taught us the importance of being yourself. Coolness in action, calmness in crisis... VTX gave me an idea of how much small details matter. When the chest number was called, I was the only one who got recommended from my batch.",
    who: "Rishikesh L.",
    context: "Batch 58, Recommended, SSC (NT)-124",
  },
];

const contactCards = [
  { label: "WhatsApp", value: "+91 74836 17249", href: "https://wa.me/917483617249", target: "_blank" },
  { label: "Call", value: "+91 84204 22821", href: "tel:+918420422821", target: "_self" },
  { label: "Call", value: "+91 90246 67319", href: "tel:+919024667319", target: "_self" },
  { label: "Email", value: "info@ssbwithisv.in", href: "mailto:info@ssbwithisv.in", target: "_self" },
];

const sectionLabelStyle = { font: "500 20px/1 var(--font-cta)", letterSpacing: "0.05em", color: "var(--base-gold-source)" };
const sectionHeadingStyle = { margin: "16px 0 20px", font: "500 clamp(24px,2.8vw,36px)/1.25 var(--font-display)" };
const sectionLeadStyle = { margin: "0 0 24px", font: "400 17px/1.6 var(--font-body)", color: "var(--base-cream-300)", maxWidth: "78ch" };

export default function SsbCoachingLandingPage() {
  return (
    <div className="ssb-lp">
      {/* Utility bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "10px clamp(20px,4vw,64px)",
          flexWrap: "wrap",
          borderBottom: "1px solid var(--color-border-surface)",
        }}
      >
        <span style={{ font: "400 13px/1.4 var(--font-body)", color: "var(--base-cream-600)" }}>
          India&apos;s First Online SSB Mentoring Academy · VTX™ Virtual Training Xperience
        </span>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", font: "400 13px/1.4 var(--font-body)", color: "var(--base-cream-500)" }}>
          <a href="tel:+918420422821">+91 84204 22821</a>
          <a href="tel:+919024667319">+91 90246 67319</a>
          <a href="https://wa.me/917483617249" target="_blank" rel="noreferrer" style={{ color: "var(--base-gold-source)", fontWeight: 500 }}>
            WhatsApp +91 74836 17249
          </a>
        </div>
      </div>

      {/* Brand row */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "12px clamp(20px,4vw,64px) 0", flexWrap: "wrap" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 20, color: "inherit" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${IMG}/ssb-logo.png`} alt="CS Joint Services Academy crest" style={{ width: 72, height: 72, objectFit: "contain" }} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ font: "500 26px/1.2 var(--font-display)", letterSpacing: "0.02em" }}>SSB with ISV</span>
            <span style={{ font: "400 16px/1.2 var(--font-body)", color: "var(--base-cream-500)" }}>Integrated SSB Virtuosos</span>
          </div>
        </Link>
        <span style={{ font: "italic 700 18px/1.4 var(--font-body)", color: "var(--base-cream-500)", marginLeft: "auto", textAlign: "right" }}>
          Online SSB mentoring on India&apos;s 1st Virtual GTO ground
        </span>
      </div>

      {/* Hero */}
      <div style={{ position: "relative", padding: "24px clamp(20px,4vw,64px) 8px" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${IMG}/hero-topo-bg.png`}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.45, filter: "brightness(0.9) saturate(0.9)" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(17,16,21,0.55) 0%, rgba(17,16,21,0.88) 60%, rgba(17,16,21,1) 100%)",
            }}
          />
          <div style={{ position: "absolute", top: -80, left: -60, width: 320, height: 320, borderRadius: "50%", background: "var(--color-accent-glow)", filter: "blur(60px)", opacity: 0.5 }} />
          <div style={{ position: "absolute", bottom: 40, right: -100, width: 280, height: 280, borderRadius: "50%", background: "var(--color-accent-glow)", filter: "blur(70px)", opacity: 0.4 }} />
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 1280,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
            gap: 40,
            alignItems: "start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
            <Chip style={{ alignSelf: "flex-start" }}>Batches Filling Fast · Army · Navy · Air Force · Coast Guard</Chip>

            <h1 style={{ margin: 0, font: "500 clamp(30px,4vw,48px)/1.18 var(--font-display)", color: "var(--color-text-primary)", textWrap: "pretty" }}>
              Authentic online SSB mentorship by a <span style={{ color: "var(--base-gold-source)" }}>DIPR certified GTO.</span> Guidance till Recommendation.
            </h1>

            <p style={{ margin: 0, font: "400 18px/1.6 var(--font-body)", color: "var(--base-cream-300)", maxWidth: "56ch", textWrap: "pretty" }}>
              The only SSB academy where your mentor didn&apos;t just study the board — he ran it. Assessor-led, personality-first coaching for NDA, CDS, AFCAT, TES, TGC &amp; all Service Entries.
            </p>

            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {heroBullets.map((item) => (
                <li key={item} style={{ display: "flex", gap: 12, alignItems: "flex-start", font: "400 15px/1.5 var(--font-body)", color: "var(--color-text-primary)" }}>
                  <span style={{ color: "var(--base-gold-source)", flex: "none" }}>—</span>
                  {item}
                </li>
              ))}
            </ul>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 8 }}>
              {heroStats.map((stat) => (
                <div key={stat.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: 126 }}>
                  <div style={{ width: 110, height: 110, borderRadius: "50%", boxShadow: "var(--shadow-ring)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ font: "500 22px/1 var(--font-display)", color: "var(--color-text-primary)" }}>{stat.value}</span>
                  </div>
                  <span style={{ font: "400 12px/1.3 var(--font-body)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--base-cream-500)", textAlign: "center" }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <LeadForm />
        </div>
      </div>

      {/* About */}
      <div className="section" style={{ paddingTop: 24 }}>
        <span style={sectionLabelStyle}>01 — ABOUT US</span>
        <h2 style={sectionHeadingStyle}>What is SSB with ISV?</h2>
        <p style={sectionLeadStyle}>
          SSB with ISV — Integrated SSB Virtuosos (est. 2021), a unit of CS Joint Services Academy, mentors defence aspirants for Army, Navy &amp; Air Force selection — fully online, assessor-led, and backed by a{" "}
          <span style={{ color: "var(--base-gold-source)" }}>~35% success rate</span>, well above the industry norm.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {aboutTags.map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </div>
      </div>

      {/* Founder */}
      <div className="section">
        <span style={sectionLabelStyle}>02 - MENTORING TEAM</span>
        <h2 style={{ ...sectionHeadingStyle, marginBottom: 40 }}>Founder and Chief Mentor</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 40, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ position: "relative", width: 220, height: 220 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", background: "var(--base-cream-300)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${IMG}/mentor-nikhil-founder.jpg`}
                  alt="Lt. Cdr. Nikhil Kumar Chandrakala (Retd.)"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%", filter: "brightness(0.9)" }}
                />
              </div>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: "var(--shadow-ring)" }} />
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <a href="https://www.instagram.com/ltcdr_nikhil_the_gto" target="_blank" rel="noreferrer" style={{ font: "500 13px/1.4 var(--font-body)", color: "var(--base-gold-source)" }}>
                Instagram
              </a>
              <a href="https://www.linkedin.com/in/lcnkc/" target="_blank" rel="noreferrer" style={{ font: "500 13px/1.4 var(--font-body)", color: "var(--base-gold-source)" }}>
                LinkedIn
              </a>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ display: "block", font: "500 19px/1.3 var(--font-display)", color: "var(--color-text-primary)" }}>Lt. Cdr. NKC</span>
              <span style={{ display: "block", font: "400 13.5px/1.4 var(--font-body)", color: "var(--base-cream-500)" }}>Group Testing Officer</span>
            </div>
            <div style={{ marginTop: 8, padding: "20px 22px", background: "rgb(11,11,11)", boxShadow: "inset 0 0 0 1.5px rgb(75,75,77)", font: "italic 400 16px/1.6 var(--font-display)", color: "var(--color-text-primary)" }}>
              &quot;The board is not looking for a perfect candidate. It is looking for a real one — someone who has figured out who they are, leads from that place, and can function in a group under pressure.&quot;
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <span style={{ font: "500 26px/1.3 var(--font-display)", color: "var(--color-text-primary)" }}>Lt. Cdr. Nikhil Kumar Chandrakala (Retd.)</span>
            <span style={{ font: "400 14px/1.4 var(--font-body)", color: "var(--base-cream-500)", marginBottom: 8 }}>
              &quot;NKC&quot; — Ex-Warship Captain · DIPR-Certified GTO · TEDx Speaker · Leadership Coach
            </span>

            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {founderCreds.map((cred) => (
                <li key={cred} style={{ display: "flex", gap: 12, alignItems: "flex-start", font: "400 15px/1.55 var(--font-body)", color: "var(--base-cream-300)" }}>
                  <span style={{ color: "var(--base-gold-source)", flex: "none" }}>—</span>
                  {cred}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            padding: 20,
            textAlign: "center",
            borderTop: "1px solid var(--color-border-surface)",
            borderBottom: "1px solid var(--color-border-surface)",
            font: "500 16px/1.5 var(--font-display)",
            color: "var(--base-gold-source)",
          }}
        >
          Every assessor on our panel is DIPR certified and has served at different SSBs across the country.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: 24, marginTop: 32, alignItems: "start" }}>
          {assessors.map((a) => (
            <div key={a.name} className="card" style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", minWidth: 0, overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.photo} alt={a.name} style={{ flex: "0 0 40%", width: "40%", minWidth: 0, height: "auto", objectFit: "cover", filter: "brightness(0.9)" }} />
              <div style={{ flex: 1, minWidth: 0, padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ font: "500 19px/1.3 var(--font-display)", color: "var(--color-text-primary)" }}>{a.name}</span>
                <span style={{ font: "400 13.5px/1.4 var(--font-body)", color: "var(--base-cream-500)" }}>{a.role}</span>
                <div
                  style={{
                    display: "inline-flex",
                    padding: "8px 20px",
                    alignSelf: "flex-start",
                    background: "rgba(59,57,48,0.75)",
                    backdropFilter: "blur(20px)",
                    boxShadow: "inset 0 0 0 1px rgb(223,221,209)",
                    font: "400 15px/1.4 var(--font-body)",
                    letterSpacing: "0.03em",
                    color: "rgb(223,221,209)",
                    whiteSpace: "normal",
                  }}
                >
                  {a.badge}
                </div>
                <p style={{ margin: "4px 0 0", font: "400 14.5px/1.55 var(--font-body)", color: "var(--base-cream-300)" }}>{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Curriculum */}
      <div className="section">
        <span style={sectionLabelStyle}>03 — CURRICULUM</span>
        <h2 style={sectionHeadingStyle}>What We Cover</h2>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 18, boxShadow: "inset 0 0 0 1.5px rgb(75,75,77)", padding: "16px 24px", marginBottom: 28 }}>
          <span style={{ font: "500 40px/1 var(--font-display)", color: "var(--base-gold-source)" }}>12</span>
          <span style={{ font: "400 12px/1.4 var(--font-body)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--base-cream-500)" }}>
            Day Services Selection
            <br />
            Board Hackathon
            <br />
            Intensive · Immersive · Assessor-Designed
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 20 }}>
          {curriculum.map((c) => (
            <div key={c.title} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ font: "500 18px/1.3 var(--font-display)", color: "var(--base-gold-source)" }}>{c.title}</span>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {c.items.map((li) => (
                  <li key={li} style={{ display: "flex", gap: 10, alignItems: "flex-start", font: "400 14px/1.5 var(--font-body)", color: "var(--base-cream-300)" }}>
                    <span style={{ color: "var(--base-cream-600)", flex: "none" }}>—</span>
                    {li}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Hall of Fame */}
      <div className="section">
        <span style={sectionLabelStyle}>04 — HALL OF FAME</span>
        <h2 style={{ ...sectionHeadingStyle, marginBottom: 12 }}>AIR — All India Rankers</h2>
        <p style={sectionLeadStyle}>Distinguished results, exceptional achievements from our candidates.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 20 }}>
          {rankers.map((r) => (
            <div key={r.name} style={{ boxShadow: "inset 0 0 0 1.5px rgb(75,75,77)", overflow: "hidden", textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.photo} alt={r.name} style={{ width: "100%", height: 230, objectFit: r.fit, objectPosition: "50% 12%", background: "rgb(11,11,11)" }} />
              <div style={{ padding: "16px 14px 20px" }}>
                <div style={{ font: "500 18px/1 var(--font-display)", color: "var(--base-gold-source)" }}>{r.air}</div>
                <div style={{ font: "500 15px/1.4 var(--font-display)", marginTop: 6 }}>{r.name}</div>
                <div style={{ font: "400 12.5px/1.4 var(--font-body)", color: "var(--base-cream-500)", marginTop: 2 }}>{r.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))", gap: 14, marginTop: 24 }}>
          {recPhotos.map((p) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={p.src} src={p.src} alt="Recommended candidate" style={{ width: "100%", height: 170, objectFit: "cover", objectPosition: p.pos, boxShadow: "inset 0 0 0 1.5px rgb(75,75,77)" }} />
          ))}
        </div>
        <p style={{ margin: "24px 0 0", font: "400 17px/1.6 var(--font-body)", color: "var(--base-cream-300)" }}>
          Till date we have coached <span style={{ color: "var(--base-gold-source)" }}>700+ candidates</span> and produced{" "}
          <span style={{ color: "var(--base-gold-source)" }}>200+ recommendations.</span>
        </p>
      </div>

      {/* Philosophy */}
      <div className="section">
        <span style={sectionLabelStyle}>05 — OUR PHILOSOPHY</span>
        <h2 style={{ ...sectionHeadingStyle, marginBottom: 12 }}>The ISV Mentoring Philosophy</h2>
        <p style={sectionLeadStyle}>Built on a principle most institutes ignore: the SSB does not assess performance — it assesses personality.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {philosophy.map((p) => (
            <div key={p.strong} className="card" style={{ padding: "16px 20px", font: "400 15px/1.5 var(--font-body)", color: "var(--base-cream-300)" }}>
              <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{p.strong}</span> — {p.rest}
            </div>
          ))}
        </div>
      </div>

      {/* VTX */}
      <div className="section">
        <span style={sectionLabelStyle}>06 — SIGNATURE TECHNOLOGY</span>
        <h2 style={{ ...sectionHeadingStyle, marginBottom: 12 }}>VTX™ — Virtual Training Xperience</h2>
        <p style={sectionLeadStyle}>
          The GTO ground has always been the most anxiety-inducing part of the SSB — not because the tasks are impossible, but because they&apos;re unfamiliar. ISV solved this with VTX™, India&apos;s first virtual GTO ground.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
            gap: 32,
            alignItems: "center",
            background: "linear-gradient(135deg, rgb(31,31,33), rgb(11,11,11))",
            boxShadow: "inset 0 0 0 1.5px rgb(75,75,77)",
            padding: "clamp(20px,4vw,36px)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Chip active style={{ alignSelf: "flex-start" }}>India&apos;s First Virtual GTO Ground</Chip>
            <p style={{ margin: 0, font: "400 15px/1.6 var(--font-body)", color: "var(--base-cream-300)" }}>
              VTX™ lets aspirants see, understand and mentally experience every outdoor GTO task before they physically encounter it — freeing mental bandwidth to focus on what the SSB actually observes: natural behaviour, teamwork and leadership under observation.
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
              {vtxPillars.map((pl) => (
                <div key={pl} style={{ flex: 1, minWidth: 140, borderTop: "2px solid var(--base-gold-source)", paddingTop: 10, font: "400 13px/1.4 var(--font-body)", color: "var(--base-cream-500)" }}>
                  {pl}
                </div>
              ))}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${IMG}/vtx-photo.jpg`} alt="VTX Virtual Training Xperience" style={{ width: "100%", height: "100%", maxHeight: 320, objectFit: "cover", boxShadow: "inset 0 0 0 1.5px rgb(75,75,77)" }} />
        </div>
      </div>

      {/* Testimonials */}
      <div className="section">
        <span style={sectionLabelStyle}>07 — WHAT THEY SAY</span>
        <h2 style={{ ...sectionHeadingStyle, marginBottom: 12 }}>Testimonials</h2>
        <p style={sectionLeadStyle}>Real feedback from real candidates — in their own words.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 20 }}>
          {testimonials.map((t) => (
            <div key={t.who} className="card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ margin: 0, font: "400 15px/1.6 var(--font-body)", color: "var(--color-text-primary)" }}>&quot;{t.quote}&quot;</p>
              <span style={{ font: "500 14px/1.4 var(--font-body)", color: "var(--base-gold-source)" }}>
                {t.who} <span style={{ color: "var(--base-cream-500)", fontWeight: 400 }}>— {t.context}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing CTA */}
      <div style={{ padding: "0 clamp(20px,4vw,64px) 36px", maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            boxShadow: "inset 0 0 0 1.5px rgb(227,198,7)",
            padding: "28px 32px",
            textAlign: "center",
            background: "linear-gradient(135deg, rgb(31,31,33), rgb(11,11,11))",
          }}
        >
          <span style={{ font: "500 13px/1 var(--font-cta)", letterSpacing: "0.05em", color: "var(--base-gold-source)" }}>PRICING &amp; BATCHES</span>
          <h2 style={{ margin: "16px auto 12px", font: "500 clamp(24px,2.8vw,36px)/1.25 var(--font-display)", maxWidth: "32ch" }}>Get Course Fees &amp; Upcoming Batch Dates</h2>
          <p style={{ margin: "0 auto 28px", font: "400 16px/1.6 var(--font-body)", color: "var(--base-cream-300)", maxWidth: "60ch" }}>
            Every SSB attempt is different — so is every candidate&apos;s SSB prep plan. Share your details and our team will get in touch with you soon with the next batch start date for your target entry.
          </p>
          <Button as="a" href="#apply">
            <span style={{ fontFamily: "'Monoform', ui-monospace, 'SF Mono', Menlo, Consolas, monospace", letterSpacing: "0.05em" }}>ENQUIRE WITH US →</span>
          </Button>
        </div>
      </div>

      {/* Contact */}
      <div style={{ padding: "0 clamp(20px,4vw,64px) 36px", maxWidth: 1280, margin: "0 auto" }}>
        <span style={sectionLabelStyle}>08 — GET IN TOUCH</span>
        <h2 style={{ margin: "12px 0 20px", font: "500 clamp(24px,2.8vw,36px)/1.25 var(--font-display)" }}>Contact Us</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))", gap: 16 }}>
          {contactCards.map((c) => (
            <div key={`${c.label}-${c.value}`} className="card" style={{ padding: 20, textAlign: "center" }}>
              <div style={{ font: "400 11px/1.3 var(--font-body)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--base-cream-500)", marginBottom: 8 }}>{c.label}</div>
              <a href={c.href} target={c.target} style={{ font: "500 15px/1.3 var(--font-display)", color: "var(--base-gold-source)" }}>
                {c.value}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24, padding: "40px clamp(20px,4vw,64px) 96px", borderTop: "1px solid var(--color-border-surface)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${IMG}/ssb-logo.png`} alt="SSB with ISV crest" style={{ width: 96, height: 96, objectFit: "contain", flex: "none" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span style={{ font: "500 16px/1.3 var(--font-display)", color: "var(--color-text-primary)" }}>SSB with ISV — Integrated SSB Virtuosos</span>
          <span style={{ font: "400 14px/1.4 var(--font-body)", color: "var(--base-cream-500)" }}>Preparation should clarify, not interfere.</span>
          <span style={{ font: "400 13px/1.4 var(--font-body)", color: "var(--base-cream-600)" }}>© A unit of CS Joint Services Academy · www.ssbwithisv.in · 2026–27</span>
          <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
            <a href="https://www.instagram.com/ssbwithisv/" target="_blank" rel="noreferrer" style={{ font: "500 13px/1.4 var(--font-body)", color: "var(--base-gold-source)" }}>Instagram</a>
            <a href="https://www.linkedin.com/company/ssbwithisv/posts" target="_blank" rel="noreferrer" style={{ font: "500 13px/1.4 var(--font-body)", color: "var(--base-gold-source)" }}>LinkedIn</a>
            <a href="https://www.facebook.com/ssbwithisv/" target="_blank" rel="noreferrer" style={{ font: "500 13px/1.4 var(--font-body)", color: "var(--base-gold-source)" }}>Facebook</a>
            <a href="https://www.youtube.com/@ssbwithisv" target="_blank" rel="noreferrer" style={{ font: "500 13px/1.4 var(--font-body)", color: "var(--base-gold-source)" }}>YouTube</a>
            <a href="https://ssbwithisv.in" target="_blank" rel="noreferrer" style={{ font: "500 13px/1.4 var(--font-body)", color: "var(--base-gold-source)" }}>ssbwithisv.in</a>
          </div>
        </div>
      </div>
    </div>
  );
}
