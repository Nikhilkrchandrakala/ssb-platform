"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BiCamera } from "react-icons/bi";
import { IoMenu } from "react-icons/io5";
import Sidebar from "@/components/site/Sidebar";
import EnquiryForm from "@/components/site/EnquiryForm";
import navStyles from "@/style/Navbar.module.css";
import styles from "@/style/CoursesOffline.module.css";

// Fades + slides a section in the first time it scrolls into view — the
// hero above the fold gets its own immediate staggered animation (see the
// .heroContent CSS), this covers everything below it.
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, className: `${styles.reveal} ${visible ? styles.visible : ""}` };
}

// Built from the Nagpur-campus offline course design/copy. Every photo the
// design calls for renders as a labeled placeholder (see PhotoSlot below)
// until the real files are supplied — the label is exactly which photo is
// needed, so this page doubles as a checklist. Swap a slot to a real <img>
// by adding its file to /public/uploads/nagpur-offline/ and passing `src`.
function PhotoSlot({ label, src, alt, className }: { label: string; src?: string; alt?: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt || ""} className={className || styles.photoSlot} />;
  }
  return (
    <div className={`${className || styles.photoSlot} ${styles.photoPlaceholder}`}>
      <BiCamera />
      <small>{label}</small>
    </div>
  );
}

// Auto-scrolling photo marquee (matches the original design's continuous
// scroll) — the image list renders twice back-to-back so the CSS
// animation's -50% translateX loops seamlessly with no visible jump/reset.
function PhotoStrip({ images, durationS = 34 }: { images: { src: string; alt: string }[]; durationS?: number }) {
  return (
    <div className={styles.facilityPhotos}>
      <div className={styles.facilityPhotoStrip} style={{ animationDuration: `${durationS}s` }}>
        {[...images, ...images].map((img, i) => (
          <PhotoSlot key={`${img.src}-${i}`} label={img.alt} src={img.src} alt={img.alt} />
        ))}
      </div>
    </div>
  );
}

const UPLOADS = "/uploads/nagpur-offline";
const nums = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const photoSet = (prefix: string, count: number, alt: string) =>
  nums(count).map((n) => ({ src: `${UPLOADS}/${prefix}-${n}.jpeg`, alt: `${alt} ${n}` }));

const GTO_PHOTOS = photoSet("gto", 11, "GTO training");
const ACCO_MEALS_PHOTOS = [...photoSet("acco", 5, "Accommodation"), ...photoSet("meals", 3, "Meals")];
const ADVENTURE_PHOTOS = photoSet("adv", 18, "Adventure activity");
const OUTDOOR_ECA_PHOTOS = [...photoSet("outdoor", 8, "Outdoor activity"), ...photoSet("eca", 3, "Extra-curricular activity")];
const CLASSROOM_PHOTOS = photoSet("classroom", 3, "Classroom training");
const GETTING_THERE_PHOTOS = [
  { src: `${UPLOADS}/road-sign.jpeg`, alt: "Sahas the Camp, SSB with ISV campus entrance" },
  { src: `${UPLOADS}/main-building.jpeg`, alt: "Academy building" },
  ...photoSet("academy", 3, "Academy"),
];

const SCHEDULE = [
  {
    day: "1",
    focus: "Orientation & Understanding the SSB System",
    topic:
      "Opening Address by ISV Director • Introduction to Personality Development & what SSB looks for • ISV Training Philosophy & Methodology • Orientation to the 5-Day SSB Process • Tests, assessment methodology & marking system • Understanding the PIQ — “Your Kundli” and its importance • Screening Practice Test–1",
  },
  {
    day: "2",
    focus: "Personality, Leadership & Screening",
    topic:
      "Detailed class on Personality Development & Leadership — The Military Way • Understanding Officer Like Qualities (OLQs) • OIR/PP&DT concepts and methodology • Screening-test strategy and common mistakes • Screening Practice Test–2 with review",
  },
  {
    day: "3",
    focus: "Psychology – I",
    topic:
      "Introduction to Psychological Assessment • Understanding TAT • Relationship between responses, personality & OLQs • Detailed teaching + guided practice • Psych Practice Battery–1 • GD Session–1 • Lecturette Session–1",
  },
  {
    day: "4",
    focus: "Psychology – II",
    topic:
      "Detailed training on WAT & SRT • Natural response formation vs coached responses • OLQ linkage • Practice and assessor-led review • GD Session–2 • Lecturette Session–2",
  },
  {
    day: "5",
    focus: "Psychology – III",
    topic:
      "Self-Description (SD) • Integration of TAT, WAT, SRT & SD • Understanding consistency across the Psych battery • Complete Psych Practice Battery–2 • Individual/common error analysis • GD Session–3 • Lecturette Session–3",
  },
  {
    day: "6",
    focus: "Interview Technique – I",
    topic:
      "Understanding the Personal Interview • PIQ-based Lifeline Analysis • Family, academics, friends, hobbies, responsibilities, achievements & setbacks • Linking life experiences with OLQs • Interview approach & communication • Individual Interviews Begin • GD + Lecturette",
  },
  {
    day: "7",
    focus: "Interview Technique – II",
    topic:
      "Rapid-fire questioning • Situational and practical questions • Current affairs/general awareness approach • Handling stress and unexpected questions • Individual Interviews Continue • GD + Lecturette",
  },
  {
    day: "8",
    focus: "Interview Technique – III",
    topic:
      "Self-awareness & clarity of thought • Mock interview practice with detailed critique • Consolidating the interview narrative • Individual Interviews Conclude • Personal observations & one-on-one feedback • GD + Lecturette",
  },
  {
    day: "9",
    focus: "GTO – I",
    topic:
      "Introduction to GTO assessment & OLQs • Group dynamics • Group Discussion (GD) • Group Planning Exercise (GPE) • Progressive Group Task methodology • Practical GTO ground training • Lecturette",
  },
  {
    day: "10",
    focus: "GTO – II",
    topic:
      "Progressive Group Task (PGT) • Half Group Task (HGT) • Group Obstacle Race / Snake Race • Understanding cooperation, initiative, participation & practical intelligence • Individual feedback/corrections",
  },
  {
    day: "11",
    focus: "GTO – III + Integration",
    topic:
      "Lecturette • Individual Obstacles • Command Task • Final Group Task (FGT) • Practical assessment • Leadership and group behaviour review • Overall SSB performance integration",
  },
  {
    day: "12",
    focus: "Feedback Conference & Closing Address",
    topic:
      "Mock Conference on the pattern of the actual SSB Conference • Board-style questioning and self-presentation • Consolidated observations across Psychology, GTO & Interview dimensions • Individual Feedback Session with detailed OLQ-wise breakdown • Strengths, limitations & recommended focus areas • Individual Action Map for the next SSB attempt • Personal Development Roadmap • Guidance on documentation, medical & re-attempt procedures • Open Q&A with faculty • Distribution of Feedback Reports/Certificates • Closing Address by ISV Director • Group Photograph & Farewell",
  },
];

const WHO_FOR = [
  "NDA SSB Interview",
  "CDS SSB Interview",
  "TGC Entry",
  "Army Direct Entry via SSC (Tech / Non-Tech)",
  "AFSB through AFCAT",
  "Navy SSC (Executive, Law, Pilot, NAO, Logistics, Engg, Electrical, Armament, Constructor)",
  "10+2 TES Entry",
  "10+2 B.Tech Entry (Navy)",
  "NCC Special Entry",
  "Service Entry (CW, SD List, ACC, SCO & PC-SL)",
];

const FAQS = [
  {
    q: "What is the difference between the online and offline SSB courses at ISV?",
    a: "The curriculum, mentor, and standard are identical. The offline batch at Nagpur delivers the same 12-day programme in a fully immersive, in-person, residential format — including live GTO ground tasks — rather than through scheduled online sessions.",
  },
  {
    q: "Who mentors the Nagpur offline batch?",
    a: "The programme is led by Lt Cdr Nikhil Kumar Chandrakala (Retd.), a DIPR-certified Group Testing Officer and founding member of the team that established SSB Kolkata.",
  },
  {
    q: "Is accommodation included in the course fee?",
    a: "Yes. The Nagpur offline batch is fully residential, and accommodation and meals for the duration of the 12-day programme are included. See the Facility & Accommodation section above for details.",
  },
  {
    q: "Can I switch between the online and offline batches after enrolling?",
    a: "Our admissions team will confirm the exact switch policy with you directly — reach out over WhatsApp or call before enrolling if this affects your decision.",
  },
  {
    q: "What is the best way to prepare for the SSB interview?",
    a: "Understand the assessment process, work on officer-like qualities, practice psychology tests such as TAT, WAT and SRT, and participate in group discussions and leadership activities.",
  },
  {
    q: "What are the psychology tests in SSB?",
    a: "The Thematic Apperception Test (TAT), Word Association Test (WAT), Situation Reaction Test (SRT), and Self Description Test (SDT) — these evaluate the candidate's thought process and personality traits.",
  },
  {
    q: "How long does SSB preparation take?",
    a: "SSB preparation time varies for each candidate, but a focused period of 1 to 3 months is generally considered sufficient to understand the process and develop the required officer-like qualities.",
  },
];

export default function CoursesOfflineView() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { ref: whoForRef, className: whoForClass } = useReveal<HTMLElement>();
  const { ref: scheduleRef, className: scheduleClass } = useReveal<HTMLElement>();
  const { ref: facilityRef, className: facilityClass } = useReveal<HTMLElement>();
  const { ref: regFeeRef, className: regFeeClass } = useReveal<HTMLElement>();
  const { ref: whyChooseRef, className: whyChooseClass } = useReveal<HTMLElement>();
  const { ref: faqRef, className: faqClass } = useReveal<HTMLElement>();

  return (
    <div className={styles.page}>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <PhotoSlot label="Main Building.jpeg" src={`${UPLOADS}/main-building.jpeg`} alt="" className={styles.photoSlot} />
        </div>
        <div className={styles.heroGlow} />

        <div className={navStyles.topBar}>
          <img
            src="/assets/logo/ISV.webp"
            alt="Logo"
            className={navStyles.logo}
            onClick={() => router.push("/")}
          />
          <IoMenu className={navStyles.menuIcon} onClick={() => setMenuOpen(true)} />
        </div>

        <div className={styles.heroContent}>

          <span className={styles.chip}>Nagpur Campus · Fully Residential · Batches Filling Fast</span>

          <h1 className={styles.heroTitle}>Our Offline SSB Course — Nagpur</h1>

          <p className={styles.heroText}>
            At SSB with ISV, we now offer a fully residential SSB coaching programme at our Nagpur campus — the same
            SSB mentoring, personality development and officer-like qualities training we have delivered online for 5
            years, now in person. Mentored throughout by Lt Cdr Nikhil Kumar Chandrakala (Retd.), founding member of
            the team that established SSB Kolkata, and team of DIPR certified ex-SSB assessors this 12-Day programme
            combines theoretical understanding, practical training on a real GTO ground, mock assessments, and
            personalised feedback — fully immersive, with no distractions between sessions.
          </p>
          <div className={styles.statRow}>
            <div className={styles.statCircleWrap}>
              <div className={styles.statCircle}>
                <span>₹21,000</span>
              </div>
              <span className={styles.statLabel}>Course Fee, incl. all taxes</span>
            </div>
            <div className={styles.statCircleWrap}>
              <div className={styles.statCircle}>
                <span>12 Days</span>
              </div>
              <span className={styles.statLabel}>Fully Residential</span>
            </div>
            <div className={styles.statCircleWrap}>
              <div className={styles.statCircle}>
                <span>All-In</span>
              </div>
              <span className={styles.statLabel}>Food + Stay + Nagpur Railway Station Transfer</span>
            </div>
          </div>

          <div className={styles.ctaRow}>
            <a href="#enquire" className={styles.btnSolid}>
              Enquire for Nagpur Batch →
            </a>
            <a href="#schedule" className={styles.btnGlass}>
              View 12-Day Schedule
            </a>
          </div>
        </div>
      </section>

      <div className={styles.container}>
        {/* Who this is for */}
        <section ref={whoForRef} className={`${styles.section} ${whoForClass}`}>
          <span className={styles.eyebrow}>01 — Who This Is For</span>
          <h2 className={styles.sectionTitle}>Our Nagpur Offline Course Is Designed for Aspirants For</h2>
          <div className={styles.chipGrid}>
            {WHO_FOR.map((label) => (
              <span key={label} className={styles.chip}>
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* Schedule */}
        <section ref={scheduleRef} className={`${styles.section} ${scheduleClass}`} id="schedule">
          <span className={styles.eyebrow}>02 — Schedule</span>
          <h2 className={styles.sectionTitle}>12 Days Offline SSB Mentoring cum Personality Development Programme</h2>
          <p className={styles.sectionIntro}>
            Full-day, residential format — each day below runs as a complete training day on campus.
          </p>
          <div className={styles.scheduleAccordion}>
            {SCHEDULE.map((row) => (
              <details key={row.day} className={styles.scheduleAccordionItem}>
                <summary>
                  <span className={styles.dayBadge}>{row.day}</span>
                  <span className={styles.scheduleAccordionFocus}>{row.focus}</span>
                </summary>
                <p>{row.topic}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Facility & Accommodation */}
        <section ref={facilityRef} className={`${styles.section} ${facilityClass}`}>
          <span className={styles.eyebrow}>03 — Facility &amp; Accommodation</span>
          <h2 className={styles.sectionTitle}>The Campus</h2>
          <p className={styles.sectionIntro}>
            Our Nagpur campus has been purpose-built to deliver this 12-day programme in one location — combining a
            physical GTO ground, dedicated indoor training spaces, residential accommodation, and outdoor adventure
            facilities, so candidates remain fully immersed in the programme without the disruption of commuting or
            outside distractions.
          </p>

          <div className={styles.facilityList}>
            {/* 1: GTO Training */}
            <div className={styles.facilityRow}>
              <div className={styles.facilityText}>
                <span className={styles.facilityTitle}>1. On-Ground GTO Training Facilities</span>
                <ul className={styles.facilityUl}>
                  <li>
                    A physical GTO ground designed to replicate the exact task structures used across Services
                    Selection Boards and Air Force Selection Boards
                  </li>
                  <li>Dedicated open spaces to conduct Group Discussions and Group Planning Exercises</li>
                  <li>Open air spaces to conduct lecturette to simulate real-time SSB/AFSB tasks</li>
                  <li>Individual Obstacles, Group Obstacle Race and other military-style physical obstacles</li>
                </ul>
              </div>
              <PhotoStrip images={GTO_PHOTOS} />
            </div>

            {/* 2: Food and Accommodation */}
            <div className={`${styles.facilityRow} ${styles.reverse}`}>
              <div className={styles.facilityText}>
                <span className={styles.facilityTitle}>2. Food and Accommodation</span>
                <ul className={styles.facilityUl}>
                  <li>
                    Three vegetarian meals a day and refreshments (twice) provided through an in-house dining
                    facility; drinking water available throughout the training day
                  </li>
                  <li>
                    Twin-sharing residential accommodation on campus for the full duration of the 12-day programme.
                    Clean, secure living quarters and daily housekeeping with on-site 24/7 security
                  </li>
                  <li>Separate accommodation arrangements for male and female candidates</li>
                  <li>Basic first-aid and on-call medical support available on campus for the duration of the programme</li>
                </ul>
              </div>
              <PhotoStrip images={ACCO_MEALS_PHOTOS} />
            </div>

            {/* 3: Adventure */}
            <div className={styles.facilityRow}>
              <div className={styles.facilityText}>
                <span className={styles.facilityTitle}>3. Adventure</span>
                <ul className={styles.facilityUl}>
                  <li>Water sports (rowing, rafting) in the lake within the academy</li>
                  <li>65-feet rock climbing and net climbing</li>
                  <li>On-site camping, nearby dam visit and excursions</li>
                </ul>
              </div>
              <PhotoStrip images={ADVENTURE_PHOTOS} />
            </div>

            {/* 4: Outdoor & ECA */}
            <div className={`${styles.facilityRow} ${styles.reverse}`}>
              <div className={styles.facilityText}>
                <span className={styles.facilityTitle}>4. Outdoor Physical Training &amp; Extra-Curricular Activities</span>
                <ul className={styles.facilityUl}>
                  <li>Swimming pool</li>
                  <li>Daily yoga and morning physical training sessions with our in-house physical training instructors</li>
                  <li>Team building activities</li>
                </ul>
              </div>
              <PhotoStrip images={OUTDOOR_ECA_PHOTOS} />
            </div>

            {/* 5: Classroom Training */}
            <div className={styles.facilityRow}>
              <div className={styles.facilityText}>
                <span className={styles.facilityTitle}>5. Classroom Training</span>
                <ul className={styles.facilityUl}>
                  <li>
                    Dedicated indoor classrooms for Psychology and interview theory sessions and mock tests,
                    conducted under timed, real-assessment conditions
                  </li>
                  <li>A private space for individual interview sessions, ensuring candidates receive undivided, one-on-one attention</li>
                </ul>
              </div>
              <PhotoStrip images={CLASSROOM_PHOTOS} />
            </div>

            {/* 6: Getting There */}
            <div className={`${styles.facilityRow} ${styles.reverse}`}>
              <div className={styles.facilityText}>
                <span className={styles.facilityTitle}>6. Getting There</span>
                <ul className={styles.facilityUl}>
                  <li>
                    Located in Nagpur, with convenient access from Nagpur Railway Station and Dr. Babasaheb Ambedkar
                    International Airport
                  </li>
                  <li>
                    Local transport assistance available for candidates arriving from outside Nagpur — Nagpur Railway
                    Station pick-up and drop available free of cost; details shared upon enrolment
                  </li>
                </ul>
              </div>
              <PhotoStrip images={GETTING_THERE_PHOTOS} />
            </div>
          </div>
        </section>

        {/* Registration fee / pricing CTA */}
        <section ref={regFeeRef} className={`${styles.section} ${regFeeClass}`} style={{ paddingTop: 0 }} id="enquire">
          <div className={styles.pricingCta}>
            <span className={styles.eyebrow} style={{ marginBottom: 8 }}>
              Nagpur Offline Batch
            </span>
            <h2>12 Days | INR 21,000/- | Food, Stay and Nagpur Railway Station Transfer included</h2>
            <p>
              The most affordable authentic, assessor-led residential SSB programme in the country — taught
              in-person by DIPR certified ex-SSB assessors. Share your details and our team will confirm your seat
              and the next batch start date.
            </p>
            <a href="/OfflineBatches" className={styles.btnSolid}>
              Reserve Your Seat →
            </a>
          </div>
        </section>

        {/* Why choose us */}
        <section ref={whyChooseRef} className={`${styles.section} ${whyChooseClass}`}>
          <span className={styles.eyebrow}>04 — Why Choose Us</span>
          <h2 className={styles.sectionTitle}>Why Choose SSB with ISV&rsquo;s Nagpur Offline Batch?</h2>
          <div className={styles.whyChooseGrid}>
            <p>
              SSB with ISV focuses on authentic personality development rather than superficial coaching techniques.
              Our training philosophy is based on the principle of <strong>Manasa – Vācha – Karmaṇa</strong>,
              emphasising alignment between thought, communication, and action. At Nagpur, this philosophy is
              delivered in person, on real ground, by a mentor who has not only served on an SSB board but was part
              of the team that built one — SSB Kolkata. Through structured mentoring, behavioural training, and
              realistic, fully immersive simulations, we help candidates develop the mindset and qualities required
              to succeed at the SSB and, eventually, to serve as officers in the Indian Armed Forces.
            </p>
            <div className={styles.mentorCard}>
              <PhotoSlot
                label="Me at SSB Kol.jpg"
                src={`${UPLOADS}/mentor-nikhil-ssb-kolkata.jpeg`}
                alt="Lt. Cdr. Nikhil Kumar Chandrakala at SSB Kolkata"
                className={styles.mentorPhoto}
              />
              <div className={styles.mentorMeta}>
                <strong>Lt. Cdr. Nikhil Kumar Chandrakala (Retd.)</strong>
                <span>Group Testing Officer</span>
                <span>Founder &amp; Director, SSB with ISV</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section ref={faqRef} className={`${styles.section} ${faqClass}`}>
          <span className={styles.eyebrow}>05 — FAQ</span>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <div className={styles.faqList}>
            {FAQS.map((f, i) => (
              <details key={f.q} className={styles.faqItem} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <EnquiryForm />
    </div>
  );
}
