import type { Metadata } from "next";
import Link from "next/link";
import "./styles.css";
import Chip from "./Chip";
import Button from "./Button";
import LeadForm from "./LeadForm";
import Philosophy from "@/components/home/Philosophy";

// No literal "#" in this title — Zoho SalesIQ's own widget-init API 400s on
// any page_title containing one (see ../ssb-coaching/page.tsx for the
// confirmed-broken details), which silently breaks the chat button.
const PAGE_TITLE = "SSB Offline Coaching in Nagpur | 12-Day Residential SSB Camp | SSB with ISV";
const PAGE_DESCRIPTION =
  "Authentic, on-ground SSB mentoring - now in Nagpur. A 12-day residential programme led by Lt Cdr Nikhil Kumar Chandrakala (Retd.), founding GTO of SSB Kolkata. Limited seats.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "https://ssbwithisv.in/ssb-offline-coaching" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "https://ssbwithisv.in/ssb-offline-coaching",
    type: "website",
  },
};

const STATIC_IMG = "/static/ssb-coaching";
const CAMPUS_IMG = "/uploads/nagpur-offline";

const heroBullets = [
  "Led by a DIPR-certified Group Testing Officer — the youngest in the Indian Armed Forces since 1947",
  "One of the few mentors in India who has helped build a board, not only served on one",
  "VTX™, India's first Virtual GTO Ground, now paired with a real, physical GTO ground on campus",
  "A fully residential 12-Day SSB Hackathon covering PPDT, Psychology, Interview, and GTO, end to end, on ground",
  "The same curriculum and standard as our five-year online programme, delivered with complete in-person immersion",
  "Limited seats, by design — a small batch size to ensure individual mentor attention",
];

const heroStats = [
  { value: "200+", label: "Recommended" },
  { value: "800+", label: "Coached" },
  { value: "5+", label: "Years of Mentoring Experience" },
];

const aboutTags = ["Mentored In Person, By an Assessor Who Has Built a Board", "Full Immersion — 12 Days, On Campus", "Team of DIPR certified ex-SSB assessors", "All Entries Covered"];

const founderCreds = [
  "India's Youngest Group Testing Officer in the history of the Indian Armed Forces since 1947, across all three services.",
  "Founding Member & 1st GTO of SSB (Kolkata), Indian Navy's 4th Officers' Selection Board, Diamond Harbour, West Bengal.",
  "Ex-GTO, 12 SSB Bangalore — Selection Centre South, India's first defence officers' selection centre.",
  "DIPR-Certified — trained at the Defence Institute of Psychological Research, Ministry of Defence.",
  "Masters in Psychology (First Class), with minors in Industrial & Organisational Psychology.",
  "Commanded a Warship — Indian Navy, Executive Branch.",
  "13,000+ candidates personally assessed at the SSB for the Indian Army and Indian Navy.",
];

const curriculum = [
  { days: "Days 1–2", text: "Introduction to SSB & PPDT — live mock PPDT with individual feedback, conducted in person from Day 1." },
  { days: "Days 3–5", text: "Psychology Theory & Mock Psychology Test — a complete mock Psychology Test administered under real, timed, in-room conditions." },
  { days: "Days 6–8", text: "Interview Theory & Mock Interview — individual interview preparation and mock sessions conducted in person with our mentoring faculty." },
  { days: "Days 9–11", text: "Group Testing Course — GD, GPE, Progressive Group Task, Half Group Task, Command Task and Final Group Task, conducted on our physical GTO ground, under Lt Cdr Chandrakala's direct supervision." },
  { days: "Day 12", text: "OLQs, Correlation & Feedback Conference — a mock Conference in the same format as an actual SSB board, followed by individual, OLQ-wise feedback." },
];

const rankers = [
  { photo: `${STATIC_IMG}/air-suriyansh.jpg`, air: "AIR 01", name: "Suriyansh Singh Parihar", detail: "SSC Tech 67 · Indian Army", fit: "cover" as const },
  { photo: `${STATIC_IMG}/air-pooja.jpg`, air: "AIR 01", name: "Pooja Rao", detail: "SSCW Tech 36", fit: "cover" as const },
  { photo: `${STATIC_IMG}/air-rishikesh.jpg`, air: "AIR 183", name: "Rishikesh L.", detail: "CDS OTA 2 · SSC (NT) 124", fit: "contain" as const },
];

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

const facilityGallery = [
  { src: `${CAMPUS_IMG}/main-building.jpeg`, category: "Campus", title: "Main Building" },
  { src: `${CAMPUS_IMG}/road-sign.jpeg`, category: "Campus", title: "SAHAS — The Camp" },
  { src: `${CAMPUS_IMG}/gto-1.jpeg`, category: "GTO Ground", title: "Group Planning Exercise" },
  { src: `${CAMPUS_IMG}/gto-6.jpeg`, category: "GTO Ground", title: "Group Task" },
  { src: `${CAMPUS_IMG}/gto-3.jpeg`, category: "GTO Ground", title: "Task Briefing" },
  { src: `${CAMPUS_IMG}/gto-9.jpeg`, category: "GTO Ground", title: "GTO Task" },
  { src: `${CAMPUS_IMG}/adv-5.jpeg`, category: "Adventure", title: "Wall Climb" },
  { src: `${CAMPUS_IMG}/adv-13.jpeg`, category: "Adventure", title: "Rope Climb" },
  { src: `${CAMPUS_IMG}/adv-7.jpeg`, category: "Adventure", title: "Rope Net Climb" },
  { src: `${CAMPUS_IMG}/classroom-1.jpeg`, category: "Classrooms", title: "Classroom" },
  { src: `${CAMPUS_IMG}/classroom-2.jpeg`, category: "Classrooms", title: "Classroom" },
  { src: `${CAMPUS_IMG}/classroom-3.jpeg`, category: "Classrooms", title: "Classroom" },
  { src: `${CAMPUS_IMG}/acco-1.jpeg`, category: "Accommodation", title: "Dormitory" },
  { src: `${CAMPUS_IMG}/acco-2.jpeg`, category: "Accommodation", title: "Dormitory" },
  { src: `${CAMPUS_IMG}/acco-3.jpeg`, category: "Accommodation", title: "Room" },
  { src: `${CAMPUS_IMG}/acco-5.jpeg`, category: "Accommodation", title: "Room" },
  { src: `${CAMPUS_IMG}/acco-4.jpeg`, category: "Washrooms", title: "Washroom" },
  { src: `${CAMPUS_IMG}/meals-1.jpeg`, category: "Meals", title: "Dining Hall" },
  { src: `${CAMPUS_IMG}/meals-2.jpeg`, category: "Meals", title: "Meal Time" },
  { src: `${CAMPUS_IMG}/meals-3.jpeg`, category: "Meals", title: "Meal Time" },
  { src: `${CAMPUS_IMG}/outdoor-1.jpeg`, category: "Physical Training", title: "PT Session" },
  { src: `${CAMPUS_IMG}/outdoor-5.jpeg`, category: "Physical Training", title: "PT Drill" },
  { src: `${CAMPUS_IMG}/outdoor-2.jpeg`, category: "Physical Training", title: "PT Session" },
];

const campusFeatures = [
  { strong: "A physical GTO ground", rest: "replicating the exact tasks VTX simulates." },
  { strong: "Dedicated classrooms", rest: "for Psychology and Interview practice sessions." },
  { strong: "Adventure & Extracurricular activities", rest: "65 feet wall & net climb, excursions in forest, nearby dam and water sports." },
  { strong: "Well-maintained free accommodation", rest: "three times Veg meals, separate accommodation for male and female candidates, and 24/7 security." },
];

const sectionLabelStyle = { font: "500 20px/1 var(--font-cta)", letterSpacing: "0.05em", color: "var(--base-gold-source)" };
const sectionHeadingStyle = { margin: "16px 0 20px", font: "500 clamp(24px,2.8vw,36px)/1.25 var(--font-display)" };
const sectionLeadStyle = { margin: "0 0 24px", font: "400 17px/1.6 var(--font-body)", color: "var(--base-cream-300)" };

export default function SsbOfflineCoachingLandingPage() {
  return (
    <div className="ssb-lp-offline">
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
          First Ever On-Ground SSB Training Camp · Nagpur, Maharashtra
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
          <img src={`${STATIC_IMG}/ssb-logo.png`} alt="CS Joint Services Academy crest" style={{ width: 72, height: 72, objectFit: "contain" }} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ font: "500 26px/1.2 var(--font-display)", letterSpacing: "0.02em" }}>SSB with ISV</span>
            <span style={{ font: "400 16px/1.2 var(--font-body)", color: "var(--base-cream-500)" }}>Integrated SSB Virtuosos</span>
          </div>
        </Link>
        <span style={{ font: "italic 700 18px/1.4 var(--font-body)", color: "var(--base-cream-500)", marginLeft: "auto", textAlign: "right" }}>
          Authentic, on-ground SSB mentoring — now in Nagpur
        </span>
      </div>

      {/* Hero */}
      <div style={{ position: "relative", padding: "24px clamp(20px,4vw,64px) 8px" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${STATIC_IMG}/hero-topo-bg.png`}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.45, filter: "brightness(0.9) saturate(0.9)" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.88) 60%, rgba(0,0,0,1) 100%)",
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
            <Chip style={{ alignSelf: "flex-start" }}>1st Ever Offline Batch · 26th Oct 2026 · ₹21,000 All-Inclusive · 12 Days</Chip>

            <h1 style={{ margin: 0, font: "500 clamp(30px,4vw,48px)/1.18 var(--font-display)", color: "var(--color-text-primary)", textWrap: "pretty" }}>
              Authentic, on-ground SSB mentoring. <span style={{ color: "var(--base-gold-source)" }}>Now in Nagpur.</span>
            </h1>

            <p style={{ margin: 0, font: "400 18px/1.6 var(--font-body)", color: "var(--base-cream-300)", maxWidth: "56ch", textWrap: "pretty" }}>
              Our mentor has not only served on the SSB board — he helped build one. As part of the commissioning
              team that established SSB Kolkata, Lt Cdr Nikhil Kumar Chandrakala brings a depth of experience that
              is hard to match. This 12-day residential programme is the first opportunity to train under him in person.
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
        <h2 style={sectionHeadingStyle}>What is SSB with ISV, Nagpur?</h2>
        <p style={sectionLeadStyle}>
          SSB with ISV — Integrated SSB Virtuosos, established 2021, a unit of CS Joint Services Academy — has
          mentored defence aspirants preparing for Army, Navy and Air Force selection for five years, entirely
          online, with a success rate of approximately 35%. For the first time, that same mentorship is now
          available at a physical campus: <span style={{ color: "var(--base-gold-source)" }}>SSB with ISV, Nagpur.</span>
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {aboutTags.map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </div>
      </div>

      {/* Founder */}
      <div className="section">
        <span style={sectionLabelStyle}>02 — MENTORING TEAM</span>
        <h2 style={{ ...sectionHeadingStyle, marginBottom: 40 }}>Founder & Chief Mentor</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 40, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ position: "relative", width: 220, height: 220 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", background: "var(--base-cream-300)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${STATIC_IMG}/mentor-nikhil-founder.jpg`}
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
              <span style={{ display: "block", font: "500 19px/1.3 var(--font-display)", color: "var(--color-text-primary)" }}>Call sign: NKC</span>
              <span style={{ display: "block", font: "400 13.5px/1.4 var(--font-body)", color: "var(--base-cream-500)" }}>Group Testing Officer · Founder & Chief Mentor</span>
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
                  <span style={{ textAlign: "justify" }}>{cred}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div className="section">
        <span style={sectionLabelStyle}>03 — CURRICULUM</span>
        <h2 style={sectionHeadingStyle}>What We Cover</h2>
        <p style={sectionLeadStyle}>
          A complete, in-person journey across 12 days — Orientation and Screening, Psychology, Interview,
          Group Testing, and the Final Conference.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {curriculum.map((c) => (
            <div key={c.days} className="card" style={{ padding: "22px 26px" }}>
              <span style={{ display: "block", font: "500 18px/1.3 var(--font-display)", color: "var(--base-gold-source)", marginBottom: 8 }}>{c.days}</span>
              <p style={{ margin: 0, font: "400 15px/1.55 var(--font-body)", color: "var(--base-cream-300)", textAlign: "left" }}>{c.text}</p>
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
              <img src={r.photo} alt={r.name} style={{ width: "100%", height: 230, objectFit: r.fit, objectPosition: "50% 12%", background: "rgb(0,0,0)" }} />
              <div style={{ padding: "16px 14px 20px" }}>
                <div style={{ font: "500 18px/1 var(--font-display)", color: "var(--base-gold-source)" }}>{r.air}</div>
                <div style={{ font: "500 15px/1.4 var(--font-display)", marginTop: 6 }}>{r.name}</div>
                <div style={{ font: "400 12.5px/1.4 var(--font-body)", color: "var(--base-cream-500)", marginTop: 2 }}>{r.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ margin: "24px 0 0", font: "400 17px/1.6 var(--font-body)", color: "var(--base-cream-300)" }}>
          To date, we have coached <span style={{ color: "var(--base-gold-source)" }}>700+ candidates</span> and
          produced <span style={{ color: "var(--base-gold-source)" }}>200+ recommendations</span> into the Indian
          Armed Forces — and now, for the first time, in person as well.
        </p>
      </div>

      {/* Philosophy — reuses the exact Venn-diagram component from the main site's homepage */}
      <div className="section" style={{ paddingBottom: 0 }}>
        <span style={sectionLabelStyle}>05 — OUR PHILOSOPHY</span>
      </div>
      <Philosophy />

      {/* Nagpur campus + facility gallery */}
      <div className="section">
        <span style={sectionLabelStyle}>06 — OUR NAGPUR CAMPUS</span>
        <h2 style={sectionHeadingStyle}>Full fledged GTO ground, with accommodation & adventure sports facilities</h2>
        <p style={sectionLeadStyle}>
          Our Nagpur campus is spread across 30 acres in the midst of nature which harbours a lake! We have
          paired it with the real SSB environment itself — a fully equipped physical campus, purpose-built for
          the 12-day programme designed by our founder and Chief mentor.
        </p>

        <div className="gallery-scroll" style={{ marginBottom: 32 }}>
          {facilityGallery.map((g) => (
            <div className="gallery-card" key={g.src}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.src} alt={g.title} loading="lazy" />
              <div className="gallery-caption">
                <div className="gallery-category">{g.category}</div>
                <div className="gallery-title">{g.title}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {campusFeatures.map((f) => (
            <div key={f.strong} className="card" style={{ padding: "16px 20px", font: "400 15px/1.5 var(--font-body)", color: "var(--base-cream-300)" }}>
              <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{f.strong}</span> — {f.rest}
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="section">
        <span style={sectionLabelStyle}>07 — WHAT THEY SAY</span>
        <h2 style={{ ...sectionHeadingStyle, marginBottom: 12 }}>Testimonials</h2>
        <p style={sectionLeadStyle}>
          Real feedback from our online-mentored candidates — testimonials from Nagpur Batch 1 will be added
          following the completion of the programme.
        </p>

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
            background: "rgb(0,0,0)",
          }}
        >
          <span style={{ font: "500 13px/1 var(--font-cta)", letterSpacing: "0.05em", color: "var(--base-gold-source)" }}>PRICING STRUCTURE</span>
          <h2 style={{ margin: "16px auto 12px", font: "500 clamp(24px,2.8vw,36px)/1.25 var(--font-display)", maxWidth: "40ch" }}>
            Course Fees - ₹21,000/- (All incl.)<br />
            Registration Fee - ₹5,000/- (to secure your seat)
          </h2>
          <p style={{ margin: "0 auto 28px", font: "400 16px/1.6 var(--font-body)", color: "var(--base-cream-300)", maxWidth: "60ch" }}>
            Every SSB attempt is different, and so is every candidate&apos;s preparation plan. Share your details,
            and our team will be in touch shortly with the next Nagpur batch start date.
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
        <p style={{ margin: "16px 0 0", font: "italic 400 14px/1.5 var(--font-body)", color: "var(--base-cream-600)" }}>
          Campus address to be added upon finalisation.
        </p>
      </div>
    </div>
  );
}
