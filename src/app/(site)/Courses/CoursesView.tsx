"use client";

import { useEffect, useRef, useState } from "react";
import { IoChevronBack, IoChevronForward, IoGridOutline } from "react-icons/io5";
import { BsTable } from "react-icons/bs";
import CustomHeader from "@/components/site/CustomHeader";
import Faq from "@/components/site/Faq";
import EnquiryForm from "@/components/site/EnquiryForm";
import { CoursesfaqData, scheduleData, CoursesModuleOne, tabs } from "@/util/data";
import styles from "@/style/Courses.module.css";

interface DbCourse {
  courseId: string;
  price: number;
}

const headerData = {
  heading: "Our online SSB courses",
  text: "At SSB with ISV, we offer a comprehensive SSB coaching and interview preparation program designed to help aspirants understand the psychology behind the SSB selection process and develop the behavioural traits expected of future officers in the Indian Armed Forces. Our structured mentoring program combines theoretical understanding, practical training, mock assessments, and personalised feedback to help candidates build clarity, confidence, and authenticity during the SSB interview. With expert mentoring by professionals who understand the SSB assessment system, this program focuses on holistic personality development and officer-like qualities training, ensuring candidates are well prepared to face every stage of the SSB interview process.",
  banner: "/assets/website/courses_banner.webp",
};

export default function CoursesView() {
  const [dbCourses, setDbCourses] = useState<DbCourse[] | null>(null);
  const [activeTab, setActiveTab] = useState("c1");
  const [scheduleTab, setScheduleTab] = useState<"morning" | "evening">("morning");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Responsive tabs scroll tracking
  const tabsContainerRef = useRef<HTMLUListElement | null>(null);
  const activeTabRef = useRef<HTMLLIElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Mobile schedule view mode: table with horizontal scroll vs clean cards
  const [scheduleViewMode, setScheduleViewMode] = useState<"table" | "card">("table");

  const checkTabScroll = () => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  };

  useEffect(() => {
    checkTabScroll();
    const handleResize = () => checkTabScroll();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
    const timer = setTimeout(checkTabScroll, 320);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const scrollTabs = (direction: "left" | "right") => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const scrollAmount = direction === "left" ? -220 : 220;
    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
    setTimeout(checkTabScroll, 320);
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/allCourses")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DbCourse[]) => {
        if (!cancelled) setDbCourses(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setDbCourses([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getPrice = (courseId: string, fallback: number) => {
    if (dbCourses && Array.isArray(dbCourses)) {
      const match = dbCourses.find((c) => c.courseId === courseId);
      if (match && typeof match.price === "number") return match.price;
    }
    return fallback;
  };

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      <CustomHeader heading={headerData.heading} text={headerData.text} banner={headerData.banner} />

      <section className="container sectionspace80">
        <div className="course-intro">
          <div className="mvk-benefits">
            <h3>Our Online SSB Courses are designed for aspirants for:</h3>

            <ul>
              <li>NDA SSB Interview</li>
              <li>CDS SSB Interview</li>
              <li>AFSB through AFCAT</li>
              <li>10+2 TES entry</li>
              <li>10+2 B Tech entry (Navy)</li>
              <li>NCC special entry</li>
              <li>Direct entry into the Indian Army after engineering through SSC(Tech)/ SSC (Non Tech)</li>
              <li>TGC Entry</li>
              <li>Service entry candidates (CW Scheme, SD List Commission, ACC Entry, SCO & PC-SL commission)</li>
              <li>
                SSC direct entries into various branches of the Navy (Executive, Law, Pilot, Naval Air Operations,
                Logistics, Engineering, Electrical, Naval Armament, Naval Constructor)
              </li>
            </ul>
          </div>
        </div>

        <div className={`${styles.ourCoursesSection} our-courses-section`}>
          {/* ================= RESPONSIVE HORIZONTAL SLIDING TABS ================= */}
          <div className={styles.tabsWrapper}>
            <div className={styles.tabsScrollContainer}>
              {/* Left subtle fade mask */}
              <div className={`${styles.fadeMaskLeft} ${canScrollLeft ? styles.fadeMaskVisible : ""}`} />

              {/* Left scroll chevron button */}
              <button
                type="button"
                className={`${styles.scrollBtn} ${styles.scrollBtnLeft} ${canScrollLeft ? styles.scrollBtnVisible : ""}`}
                onClick={() => scrollTabs("left")}
                aria-label="Slide tabs left"
              >
                <IoChevronBack size={18} />
              </button>

              {/* Tab items list */}
              <ul
                ref={tabsContainerRef}
                onScroll={checkTabScroll}
                className={`nav course-nav-tabs ${styles.courseNavTabs}`}
                role="tablist"
              >
                {tabs.map((tab) => (
                  <li
                    className={`nav-item ${styles.navItem}`}
                    key={tab.id}
                    ref={activeTab === tab.id ? activeTabRef : null}
                    role="presentation"
                  >
                    <button
                      className={`nav-link ${activeTab === tab.id ? "active" : ""} ${styles.navLink}`}
                      onClick={() => setActiveTab(tab.id)}
                      dangerouslySetInnerHTML={{ __html: tab.label }}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                    />
                  </li>
                ))}
              </ul>

              {/* Right scroll chevron button */}
              <button
                type="button"
                className={`${styles.scrollBtn} ${styles.scrollBtnRight} ${canScrollRight ? styles.scrollBtnVisible : ""}`}
                onClick={() => scrollTabs("right")}
                aria-label="Slide tabs right"
              >
                <IoChevronForward size={18} />
              </button>

              {/* Right subtle fade mask */}
              <div className={`${styles.fadeMaskRight} ${canScrollRight ? styles.fadeMaskVisible : ""}`} />
            </div>

            {/* Mobile swipe helper text */}
            <div className={styles.mobileScrollHint}>
              <span>⇄ Slide to explore courses</span>
            </div>
          </div>

          {/* ================= TAB CONTENT ================= */}
          <div className="tab-content mt-4">
            {activeTab === "c1" && (
              <div className="course-tab-card">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                  <h2 className="course-tab-card-title">12 days Services Selection Board Hackathon</h2>

                  <p className="title-gtx shimmerText_sec  course-tab-card-title">
                    Price - ₹{getPrice("full_course", 12499).toLocaleString("en-IN")} + 18% GST
                  </p>
                </div>

                <h3 className="course-tab-card-hours">
                  <strong>Total Sessions:</strong> 14 | <strong>Total Learning Hours:</strong> 60
                </h3>

                <p>
                  This intensive SSB training program is designed to simulate the learning and behavioural
                  development required to successfully navigate the Services Selection Board interview process. Over
                  fourteen structured sessions, candidates receive training across all major areas evaluated during
                  the SSB selection process, including screening tests, psychological assessments, group testing
                  officer tasks, personal interview preparation, and officer-like qualities development. The program
                  blends theoretical learning with practical exercises, mock tests, and expert feedback, helping
                  aspirants understand how assessors evaluate behaviour and leadership potential.
                </p>

                <h3 className="m-0 fs-4">Topics Covered:</h3>

                <div className="ssb-accordion">
                  {CoursesModuleOne?.map((item, index) => (
                    <div key={index} className="ssb-accordion-item">
                      <div className="ssb-accordion-title" onClick={() => toggleAccordion(index)}>
                        {item.title}
                        <span>{openIndex === index ? "-" : "+"}</span>
                      </div>

                      {openIndex === index && (
                        <div className="ssb-accordion-content">
                          <p>{item.content}</p>

                          {item.points?.length > 0 && (
                            <ul>
                              {item.points.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          )}

                          <p>{item?.content2}</p>
                          <p>{item?.content3}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "c2" && (
              <div className="course-tab-card">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                  <h3 className="course-tab-card-title">Introduction to SSB & PPDT</h3>

                  <p className="title-gtx shimmerText_sec course-tab-card-title">
                    Price - ₹{getPrice("ssb_ppdt", 1999).toLocaleString("en-IN")} + 18% GST
                  </p>
                </div>
                <ul>
                  <li>Introduction to SSB</li>
                  <li>Genesis of SSB procedure and breaking of myths around SSB</li>
                  <li>Stage 1 Testing – OIR Test</li>
                  <li>Picture Perception & Description Test</li>
                </ul>
              </div>
            )}

            {activeTab === "c3" && (
              <div className="course-tab-card">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                  <h3 className="course-tab-card-title">Psych Theory Course</h3>

                  <p className="title-gtx shimmerText_sec course-tab-card-title">
                    Price - ₹{getPrice("psych", 3499).toLocaleString("en-IN")} + 18% GST
                  </p>
                </div>
                <ul>
                  <li>
                    Projective Technique Theory – Decoding the Psych Tests (Thematic Apperception Test, Word
                    Association Test, Situation Reaction Test, Self-Description Test)
                  </li>
                  <li>Mock Psych Test and feedback by a DIPR certified Psychologist.</li>
                </ul>
              </div>
            )}

            {activeTab === "c4" && (
              <div className="course-tab-card">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                  <h3 className="course-tab-card-title">Interview Theory Course</h3>

                  <p className="title-gtx shimmerText_sec course-tab-card-title">
                    Price - ₹{getPrice("interview", 2499).toLocaleString("en-IN")} + 18% GST
                  </p>
                </div>
                <ul>
                  <li>PIQ Form and Interview Procedure</li>
                  <li>Mock Interview and feedback by a DIPR certified Interviewing Officer.</li>
                </ul>
              </div>
            )}

            {activeTab === "c5" && (
              <div className="course-tab-card">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                  <h3 className="course-tab-card-title">Group Testing Course</h3>

                  <p className="title-gtx shimmerText_sec course-tab-card-title">
                    Price - ₹{getPrice("group_testing", 7999).toLocaleString("en-IN")} + 18% GST
                  </p>
                </div>
                <ul>
                  <li>Theory and Concepts of the Group Situational Tasks:</li>
                  <li>Group Discussion</li>
                  <li>Group Planning Exercise</li>
                  <li>Progressive Group Task</li>
                  <li>Group Obstacle Race</li>
                  <li>Half Group Task</li>
                  <li>Lecturette</li>
                  <li>Individual Obstacles</li>
                  <li>Command Task</li>
                  <li>Final Group Task</li>
                  <li>Genesis of the Group Testing Technique and what GTO looks at during the Group Testing.</li>
                  <li>Feedback by a DIPR certified Group Testing Officer.</li>
                  <li>The entire course is covered through VTX<sup>TM</sup> (Virtual Training Xperience) - India’s first virtual GTO ground.</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="schedule-section">
          <h2 className="schedule-title">12 days SSB Hackathon Schedule</h2>

          <div className="schedule-tabs">
            <button className={scheduleTab === "morning" ? "active" : ""} onClick={() => setScheduleTab("morning")}>
              Morning Batch
            </button>

            <button className={scheduleTab === "evening" ? "active" : ""} onClick={() => setScheduleTab("evening")}>
              Evening Batch
            </button>
          </div>

          {/* ================= MOBILE VIEW TOGGLE (Table vs Cards) ================= */}
          <div className={styles.scheduleViewToggle}>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${scheduleViewMode === "table" ? styles.viewToggleActive : ""}`}
              onClick={() => setScheduleViewMode("table")}
            >
              <BsTable size={13} />
              <span>Table View</span>
            </button>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${scheduleViewMode === "card" ? styles.viewToggleActive : ""}`}
              onClick={() => setScheduleViewMode("card")}
            >
              <IoGridOutline size={14} />
              <span>Cards View</span>
            </button>
          </div>

          {/* ================= TABLE VIEW (Desktop default & Mobile scrollable) ================= */}
          <div className={scheduleViewMode === "card" ? "d-none d-md-block" : "d-block"}>
            <div className={styles.tableScrollHint}>
              <span>⇄ Swipe table horizontally to see all details</span>
            </div>

            <div className="schedule-table-wrapper">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Topic</th>
                    <th>Classes Taken By</th>
                  </tr>
                </thead>

                <tbody>
                  {scheduleData[scheduleTab]?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.day}</td>
                      <td>{item.time}</td>
                      <td>{item.topic}</td>
                      <td>{item.by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================= CARDS VIEW (Clean, uncluttered cards on mobile) ================= */}
          {scheduleViewMode === "card" && (
            <div className="d-md-none">
              {scheduleData[scheduleTab]?.map((item, index) => (
                <div key={index} className={styles.cleanScheduleCard}>
                  <div className={styles.cardHeaderRow}>
                    <span className={styles.dayBadge}>Day {item.day}</span>
                    <span className={styles.timeText}>{item.time}</span>
                  </div>

                  <div className={styles.cardDetailRow}>
                    <span className={styles.detailLabel}>Topic:</span>
                    <span className={styles.detailVal}>{item.topic}</span>
                  </div>

                  <div className={styles.cardDetailRow}>
                    <span className={styles.detailLabel}>Classes Taken By:</span>
                    <span className={styles.detailVal}>{item.by}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "36px" }}>
            <h3 style={{ margin: "10px 0 16px", textAlign: "center", fontSize: "20px" }}>Important Notes</h3>

            {scheduleData.notes.map((note, index) => (
              <p key={index} style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(255, 255, 255, 0.75)" }}>
                <strong style={{ color: "var(--theme-color)" }}>{index + 1}.</strong> {note}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="container ">
        <div className="mvk-benefits">
          <h3>Why choose SSB with ISV for SSB coaching?</h3>
          <p>
            SSB with ISV focuses on authentic personality development rather than superficial coaching
            techniques. Our training philosophy is based on the principle of Manasa – Vacha – Karmana, emphasizing
            alignment between thought, communication, and action. Through structured mentoring, behavioural training,
            and realistic simulations, we help candidates develop the mindset and qualities required to succeed in
            the SSB interview and eventually serve as officers in the Indian Armed Forces.
          </p>
        </div>
      </section>

      <Faq data={CoursesfaqData} />

      <EnquiryForm />
    </>
  );
}
