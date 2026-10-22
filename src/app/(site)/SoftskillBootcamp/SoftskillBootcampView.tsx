"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/style/SoftskillBootcamp.module.css";
import navStyles from "@/style/Navbar.module.css";
import Sidebar from "@/components/site/Sidebar";
import EnquiryForm from "@/components/site/EnquiryForm";
import { useSiteUser } from "@/components/site/SiteUserProvider";
import toast from "react-hot-toast";
import {
  FaCheck,
  FaCalendarAlt,
  FaClock,
  FaMicrophoneAlt,
  FaUsers,
  FaStar,
  FaAward,
  FaComments,
  FaBrain,
  FaBriefcase,
  FaBullhorn,
  FaGraduationCap,
  FaShieldAlt,
  FaWhatsapp,
  FaTimes,
  FaCheckCircle,
  FaChevronDown,
} from "react-icons/fa";
import { IoMenu } from "react-icons/io5";

interface Batch {
  id: string;
  title: string;
  dateRange: string;
  status: "filling_fast" | "open";
  seatsLeft: number;
  price: number;
  isFeatured?: boolean;
}

const BATCHES: Batch[] = [
  {
    id: "batch-01",
    title: "Batch 01 — Live Online Cohort",
    dateRange: "Starts 03 November 2026 • 4 Weeks (9:30 AM – 10:30 AM)",
    status: "filling_fast",
    seatsLeft: 6,
    price: 5999,
    isFeatured: true,
  },
];

const CURRICULUM_WEEKS = [
  {
    week: "WEEK 01",
    title: "Communication Theory, Grammar & Phonetics",
    icon: FaComments,
    summary:
      "The building blocks: how human communication actually works, common spoken-grammar errors, and the sounds and stress patterns that shape clear pronunciation.",
    points: [
      "The Mechanics of Spoken Communication & Listener Perception",
      "Deconstructing Frequent Grammar & Tense Errors in Spoken English",
      "Vowel, Consonant and Syllable Stress Drills (IPA Pronunciation)",
      "Diaphragmatic Breathing, Voice Projection & Articulation Conditioning",
    ],
    highlight:
      "Entry Milestone: Diagnostic Baseline Video Recording & Assessor Analysis",
  },
  {
    week: "WEEK 02",
    title: "Thought Structure, Clichés & Storytelling",
    icon: FaBrain,
    summary:
      "Learning to organize ideas on the spot, cut filler words and corporate jargon, refine accent for clarity, and tell stories that hold attention.",
    points: [
      "The PREP Framework (Point, Reason, Example, Point) for Instant Thinking",
      "Ruthlessly Eliminating Fillers ('Umm', 'Like', 'Actually', 'Basically')",
      "Accent Neutralization & International Phonetic Intelligibility",
      "The Narrative Arc: Crafting Authentic 2-Minute Stories that Hook Audiences",
    ],
    highlight:
      "Live Saturday Drill 01: 90-Minute Impromptu Speech & Story Circle",
  },
  {
    week: "WEEK 03",
    title: "Professional Communication & Interview Mastery",
    icon: FaBriefcase,
    summary:
      "STAR-format answers for interviews, formal vs. casual workplace tone, giving and receiving feedback, and addressing seniors, peers, and juniors appropriately.",
    points: [
      "The STAR Method (Situation, Task, Action, Result) for High-Stakes Answers",
      "Calibrating Tone: Formal Boardrooms vs. Cross-Functional Team Conversations",
      "Delivering Constructive Feedback & Graceful Response to Critique",
      "Hierarchy Navigation: Addressing Senior Officers, Executives, Peers & Juniors",
    ],
    highlight:
      "Live Mock Interview: Real-Time 1:1 Evaluation with Assessor Rubric",
  },
  {
    week: "WEEK 04",
    title: "Public Address & Crisis Communication",
    icon: FaBullhorn,
    summary:
      "Speaking to larger audiences, presenting with confidence, and staying composed while de-escalating tense, high-pressure situations.",
    points: [
      "Overcoming Stage Fright & Projecting Unshakable Military Composure",
      "On-Camera Technique: Eye Contact, Framing, Stance & Energy Management",
      "Crisis Communication: De-escalating Tension & Handling Hostile Questions",
      "Final Capstone Delivery: Graded 5-Minute Keynote Address",
    ],
    highlight:
      "Exit Milestone: Graded Capstone Showcase & Certificate of Completion",
  },
];

const TARGET_AUDIENCE = [
  {
    icon: FaGraduationCap,
    title: "College & Campus Placements",
    desc: "Stand out in GDs, campus placement rounds, and personal interviews with polished articulation.",
  },
  {
    icon: FaBriefcase,
    title: "Working Professionals",
    desc: "Speak with leadership presence in corporate meetings, client presentations, and stakeholder reviews.",
  },
  {
    icon: FaShieldAlt,
    title: "Defence & SSB Aspirants",
    desc: "Excel in Lecturettes, Group Discussions, and the personal interview with military poise.",
  },
];

const FAQS = [
  {
    q: "Who is this 4 Weeks Soft Skills Bootcamp designed for?",
    a: "This program is designed for college students, job seekers, working professionals, and defence/SSB aspirants who want to overcome hesitation, speak clearly, eliminate filler words, and communicate with authority in interviews, boardrooms, and public presentations.",
  },
  {
    q: "What is the daily schedule and time commitment?",
    a: "The bootcamp runs for 4 weeks, 5 days a week (Monday to Friday from 9:30 AM to 10:30 AM), with 1 hour of live interactive training each day. Additionally, on alternate weekends, extended 2-hour Saturday speech drills are conducted to consolidate learning.",
  },
  {
    q: "Are the sessions live or recorded lectures?",
    a: "All sessions are 100% LIVE and interactive. The bootcamp is built strictly on repetition, live correction, and active speaking exercises rather than passive listening. Every participant speaks every day.",
  },
  {
    q: "How does the baseline recording and capstone work?",
    a: "On Day 1, each student submits an entry video recording to establish baseline speech, vocabulary, and body language benchmarks. At the end of Week 4, a formal graded capstone speech is evaluated against clear rubrics, showcasing measurable before-and-after progress.",
  },
  {
    q: "How will the live classes be conducted?",
    a: "All sessions are conducted live via video conference with interactive exercises, real-time corrections, and group speaking drills. Session link and joining details are shared prior to the batch start date.",
  },
];

export default function SoftskillBootcampView() {
  const router = useRouter();
  const { user } = useSiteUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch>(BATCHES[0]);
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);

  // Form Fields
  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [targetGoal, setTargetGoal] = useState("Interviews & Placements");

  // Booking Success State
  const [isBooked, setIsBooked] = useState(false);
  const [generatedBookingId, setGeneratedBookingId] = useState("");

  const handleOpenBooking = (batch: Batch) => {
    setSelectedBatch(batch);
    if (user?.name && !fullName) setFullName(user.name);
    if (user?.email && !email) setEmail(user.email);
    if (user?.phone && !phone) setPhone(user.phone);
    setIsBooked(false);
    setBookingModalOpen(true);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponCode.trim().toUpperCase();
    if (
      clean === "ISVCOMM" ||
      clean === "EARLYBIRD" ||
      clean === "BOOTCAMP10"
    ) {
      setDiscountAmount(500);
      toast.success("Coupon applied! ₹500 discount added.");
    } else {
      toast.error("Invalid coupon code.");
      setDiscountAmount(0);
    }
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill in your name, email, and phone number.");
      return;
    }

    const bookingId = `SB-${Date.now().toString().slice(-6)}`;
    setGeneratedBookingId(bookingId);
    setIsBooked(true);
    toast.success("Seat reserved successfully!");
  };

  const finalPrice = Math.max(selectedBatch.price - discountAmount, 0);

  return (
    <div className={styles.pageRoot}>
      {/* Sidebar flyout */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Hero Section */}
      <section className={styles.hero}>
        {/* Top Navbar matching homepage placement and logo size */}
        <div className={navStyles.topBar}>
          <img
            src="/assets/logo/ISV.webp"
            alt="SSB with ISV"
            className={navStyles.logo}
            onClick={() => router.push("/")}
          />
          <button
            type="button"
            className={navStyles.menuIcon}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            title="Open Menu"
          >
            <IoMenu style={{ width: "100%", height: "100%" }} />
          </button>
        </div>

        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot}></span>
            <span>4-Week Live Online Mentorship • 9:30 AM – 10:30 AM</span>
          </div>

          <h1 className={styles.heroTitle}>
            4 Weeks Soft Skills{" "}
            <span className={styles.heroTitleGradient}>Bootcamp</span>
          </h1>

          <p className={styles.heroSubtitle}>
            A 4-Week Program in Disciplined, Confident Speech
          </p>

          <p className={styles.heroLead}>
            For classrooms, interviews, boardrooms, and the workplace. Built on
            repetition, correction, and live accountability rather than passive
            lectures. Master the sounds, thought structures, and poise that
            command attention.
          </p>

          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.primaryCta}
              onClick={() => handleOpenBooking(BATCHES[0])}
            >
              <span>Book Your Seat</span>
              <FaCheck />
            </button>
            <a href="#batches-section" className={styles.secondaryCta}>
              <span>View Batch Dates</span>
            </a>
          </div>
        </div>
      </section>

      {/* Program Quick Specs */}
      <section className={styles.statsStrip}>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <FaCalendarAlt className={styles.statIcon} />
            <div className={styles.statInfo}>
              <h5>Daily 9:30 – 10:30 AM</h5>
              <p>Mon – Fri, 1 Hour/Day Live</p>
            </div>
          </div>

          <div className={styles.statItem}>
            <FaClock className={styles.statIcon} />
            <div className={styles.statInfo}>
              <h5>Saturday Drills</h5>
              <p>Alternate 2-Hour Intensive Drills</p>
            </div>
          </div>

          <div className={styles.statItem}>
            <FaMicrophoneAlt className={styles.statIcon} />
            <div className={styles.statInfo}>
              <h5>Baseline &amp; Capstone</h5>
              <p>Entry &amp; Exit Graded Speech Portfolio</p>
            </div>
          </div>

          <div className={styles.statItem}>
            <FaUsers className={styles.statIcon} />
            <div className={styles.statInfo}>
              <h5>Small Cohorts</h5>
              <p>Max 25 Seats for 1:1 Attention</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Week Curriculum */}
      <section className={styles.sectionWrapper} id="curriculum">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Structured Syllabus</span>
          <h2 className={styles.sectionTitle}>
            What You Will Master in 4 Weeks
          </h2>
          <p className={styles.sectionSubtitle}>
            Designed to transform hesitation into authority through daily
            speaking practice under real conditions.
          </p>
        </div>

        <div className={styles.curriculumGrid}>
          {CURRICULUM_WEEKS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.week} className={styles.curriculumCard}>
                <div className={styles.curriculumTop}>
                  <span className={styles.weekTag}>{item.week}</span>
                  <Icon className={styles.weekIcon} />
                </div>

                <h3 className={styles.curriculumTitle}>{item.title}</h3>
                <p className={styles.curriculumSummary}>{item.summary}</p>

                <ul className={styles.curriculumPoints}>
                  {item.points.map((pt, i) => (
                    <li key={i}>
                      <FaCheck className={styles.checkIcon} />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>

                <div className={styles.curriculumHighlight}>
                  <FaStar />
                  <span>{item.highlight}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Lead Mentor Spotlight */}
      <section className={styles.mentorSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Faculty Spotlight</span>
          <h2 className={styles.sectionTitle}>
            Learn from the Voice of the Indian Navy
          </h2>
        </div>

        <div className={styles.mentorCardLarge}>
          <div className={styles.mentorPhotoCol}>
            <img
              src="/assets/img/mentors/N2.jpeg"
              alt="Lt. Commander Niati Hirway (Retd.)"
              className={styles.mentorLargePhoto}
            />
            <span className={styles.mentorPhotoBadge}>Lead Course Mentor</span>
          </div>

          <div className={styles.mentorDetailsCol}>
            <span className={styles.mentorRoleTag}>
              Lead Mentor &amp; Coach
            </span>
            <h3 className={styles.mentorName}>
              Lt. Commander Niati Hirway (Retd.)
            </h3>

            <ul className={styles.mentorCreds}>
              <li>
                <div className={styles.starIconBox}>
                  <FaStar className={styles.starIcon} />
                </div>
                <span>
                  <strong>10 Years in the Indian Navy (2011–2021)</strong> as an
                  Air Traffic Management Operations Officer managing
                  high-intensity naval air stations in Goa, Mumbai and Port
                  Blair.
                </span>
              </li>
              <li>
                <div className={styles.starIconBox}>
                  <FaStar className={styles.starIcon} />
                </div>
                <span>
                  <strong>Voice of Navy:</strong> Chosen as Master of Ceremony
                  for major national public events including the Navy Day
                  Celebration and Beating Retreat at the Gateway of India,
                  Mumbai.
                </span>
              </li>
              <li>
                <div className={styles.starIconBox}>
                  <FaStar className={styles.starIcon} />
                </div>
                <span>
                  <strong>Commander-in-Chief Commendation</strong> for precision
                  and dedication to service.
                </span>
              </li>
              <li>
                <div className={styles.starIconBox}>
                  <FaStar className={styles.starIcon} />
                </div>
                <span>
                  Trained 500+ aviation sailors and upcoming air traffic
                  controllers in mission-critical voice communication.
                </span>
              </li>
            </ul>

            <blockquote className={styles.mentorQuote}>
              &ldquo;Speak with clarity, poise, and conviction — true confidence
              comes from discipline.&rdquo;
            </blockquote>
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className={styles.sectionWrapper}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Who Is This For?</span>
          <h2 className={styles.sectionTitle}>
            Tailored for High-Stakes Speech
          </h2>
        </div>

        <div className={styles.targetGrid}>
          {TARGET_AUDIENCE.map((t, idx) => {
            const Icon = t.icon;
            return (
              <div key={idx} className={styles.targetCard}>
                <Icon className={styles.targetIcon} />
                <h4>{t.title}</h4>
                <p>{t.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Batch Booking Section */}
      <section className={styles.batchSection} id="batches-section">
        <div className={styles.batchesContainer}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Live Online Cohorts</span>
            <h2 className={styles.sectionTitle}>
              Select Your Batch &amp; Enrol
            </h2>
            <p className={styles.sectionSubtitle}>
              Reserve your seat online today. Batches are capped at 25
              participants to ensure personalized feedback.
            </p>
          </div>

          <div className={styles.batchCardsGrid}>
            {BATCHES.map((batch) => (
              <div
                key={batch.id}
                className={`${styles.batchCard} ${batch.isFeatured ? styles.batchCardFeatured : ""}`}
              >
                {batch.isFeatured && (
                  <span className={styles.featuredBadge}>
                    Recommended Batch
                  </span>
                )}

                <div className={styles.batchHeader}>
                  <div>
                    <h3 className={styles.batchTitle}>{batch.title}</h3>
                    <p className={styles.batchDateRange}>{batch.dateRange}</p>
                  </div>

                  <span
                    className={`${styles.seatsPill} ${batch.seatsLeft > 10 ? styles.seatsPillGreen : ""}`}
                  >
                    {batch.seatsLeft} seats left
                  </span>
                </div>

                <div className={styles.batchTimings}>
                  <div className={styles.timingOption}>
                    <span className={styles.timingTag}>Timings:</span>
                    <strong style={{ color: "#ffffff", fontWeight: 700 }}>
                      9:30 AM – 10:30 AM
                    </strong>
                  </div>
                  <div className={styles.timingOption}>
                    <span className={styles.timingTag}>Schedule:</span>
                    <span>Monday to Friday (1 Hour Daily Live)</span>
                  </div>
                  <div className={styles.timingOption}>
                    <span className={styles.timingTag}>Saturday Drills:</span>
                    <span>Alternate Saturdays • 2 Hours</span>
                  </div>
                  <div className={styles.timingOption}>
                    <span className={styles.timingTag}>Mode:</span>
                    <span>100% Live Interactive Online Sessions</span>
                  </div>
                </div>

                <div className={styles.batchPricing}>
                  <div>
                    <span className={styles.priceLabel}>Course Fee</span>
                    <span className={styles.priceVal}>
                      ₹{batch.price.toLocaleString("en-IN")}
                    </span>
                    <span className={styles.priceInclusive}>+ 18% GST</span>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.bookBatchBtn}
                  onClick={() => handleOpenBooking(batch)}
                  style={{ color: "#000000" }}
                >
                  <span style={{ color: "#000000" }}>Book Your Seat</span>
                  <FaCheck style={{ color: "#000000" }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Common Questions</span>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        </div>

        <div className={styles.faqList}>
          {FAQS.map((faq, idx) => (
            <details key={idx} className={styles.faqItem} open={idx === 0}>
              <summary className={styles.faqSummary}>
                <span>{faq.q}</span>
                <FaChevronDown />
              </summary>
              <div className={styles.faqBody}>
                <p>{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Enquiry Form */}
      <EnquiryForm />

      {/* Interactive Booking Modal */}
      {bookingModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setBookingModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalCloseBtn}
              onClick={() => setBookingModalOpen(false)}
              aria-label="Close modal"
            >
              <FaTimes />
            </button>

            {!isBooked ? (
              <>
                <div className={styles.modalHeader}>
                  <h3>Enrol in 4 Weeks Soft Skills Bootcamp</h3>
                  <p>
                    {selectedBatch.title} • {selectedBatch.dateRange} • 9:30 AM
                    – 10:30 AM
                  </p>
                </div>

                <form onSubmit={handleConfirmBooking}>
                  {/* Student Details */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      className={styles.formInput}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul@example.com"
                      className={styles.formInput}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Mobile Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      className={styles.formInput}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Primary Focus Area
                    </label>
                    <select
                      className={styles.formSelect}
                      value={targetGoal}
                      onChange={(e) => setTargetGoal(e.target.value)}
                    >
                      <option value="Interviews & Placements">
                        Job Interviews &amp; Campus Placements
                      </option>
                      <option value="Workplace Poise">
                        Corporate Meetings &amp; Workplace Poise
                      </option>
                      <option value="SSB Aspirants">
                        SSB GD &amp; Lecturette Preparation
                      </option>
                      <option value="Public Speaking">
                        Overcoming Stage Fear &amp; Public Speaking
                      </option>
                    </select>
                  </div>

                  {/* Coupon Code */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Coupon Code (Optional)
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="Try 'ISVCOMM'"
                        className={styles.formInput}
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        style={{
                          background: "rgba(210, 161, 0, 0.2)",
                          color: "var(--secondary-color, #d2a100)",
                          border: "1px solid rgba(210, 161, 0, 0.4)",
                          borderRadius: "8px",
                          padding: "0 16px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* Price Summary */}
                  <div className={styles.priceSummaryBox}>
                    <div className={styles.summaryRow}>
                      <span>Bootcamp Fee (4 Weeks Live):</span>
                      <span>
                        ₹{selectedBatch.price.toLocaleString("en-IN")} + 18% GST
                      </span>
                    </div>
                    {discountAmount > 0 && (
                      <div
                        className={styles.summaryRow}
                        style={{ color: "#22c55e" }}
                      >
                        <span>Coupon Discount:</span>
                        <span>- ₹{discountAmount}</span>
                      </div>
                    )}
                    <div
                      className={`${styles.summaryRow} ${styles.summaryTotal}`}
                    >
                      <span>Total Payable:</span>
                      <span
                        style={{ color: "var(--secondary-color, #d2a100)" }}
                      >
                        ₹{finalPrice.toLocaleString("en-IN")} + 18% GST
                      </span>
                    </div>
                  </div>

                  <button type="submit" className={styles.confirmBookBtn}>
                    Confirm &amp; Reserve Seat
                  </button>
                </form>
              </>
            ) : (
              <div className={styles.successScreen}>
                <FaCheckCircle className={styles.successIcon} />
                <h3 className={styles.successTitle}>Seat Reserved!</h3>
                <p className={styles.successDesc}>
                  Congratulations, <strong>{fullName}</strong>. Your seat in{" "}
                  {selectedBatch.title} ({selectedBatch.dateRange}) has been
                  held.
                </p>

                <div className={styles.bookingIdBadge}>
                  Booking Reference: {generatedBookingId}
                </div>

                <div className={styles.successActions}>
                  <a
                    href={`https://wa.me/918856988916?text=Hi%2C%20I%20have%20reserved%20a%20seat%20for%204%20Weeks%20Soft%20Skills%20Bootcamp%20(${generatedBookingId})%20under%20${encodeURIComponent(fullName)}.%20Please%20guide%20me%20with%20next%20steps.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.whatsappBtn}
                  >
                    <FaWhatsapp style={{ fontSize: "18px" }} />
                    <span>Connect on WhatsApp for Batch Onboarding</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setBookingModalOpen(false)}
                    className={styles.secondaryCta}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
