"use client";

import { useEffect, useState } from "react";
import CustomHeader from "@/components/site/CustomHeader";
import Faq from "@/components/site/Faq";
import EnquiryForm from "@/components/site/EnquiryForm";
import { CoursesfaqData, scheduleData, CoursesModuleOne, tabs } from "@/util/data";

interface DbCourse {
  courseId: string;
  price: number;
}

const headerData = {
  heading: "Our Courses - SSB Coaching & Interview Preparation Program",
  text: "Preparing for the Services Selection Board (SSB) interview requires much more than academic knowledge. The SSB selection process is designed to assess a candidate's personality, leadership potential, decision-making ability, emotional intelligence, and officer-like qualities through a structured five-day evaluation system.",
  banner: "/assets/website/courses_banner.webp",
};

export default function CoursesView() {
  const [dbCourses, setDbCourses] = useState<DbCourse[] | null>(null);
  const [activeTab, setActiveTab] = useState("c1");
  const [scheduleTab, setScheduleTab] = useState<"morning" | "evening">("morning");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
          <p>
            At SSB with ISV, we offer a comprehensive SSB coaching and interview preparation program designed to help
            aspirants understand the psychology behind the SSB selection process and develop the behavioural traits
            expected of future officers in the Indian Armed Forces.
          </p>

          <p>
            Our structured mentoring program combines theoretical understanding, practical training, mock
            assessments, and personalised feedback to help candidates build clarity, confidence, and authenticity
            during the SSB interview.
          </p>

          <div className="mvk-benefits">
            <h3> The course is designed for aspirants preparing for:</h3>

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

            <p style={{ margin: "20px" }}>
              With expert mentoring by professionals who understand the SSB assessment system, this program focuses
              on holistic personality development and officer-like qualities training, ensuring candidates are well
              prepared to face every stage of the SSB interview process.
            </p>
          </div>
        </div>

        <div style={{ marginTop: "60px" }} className="our-courses-section">
          {/* ================= MOBILE SELECT ================= */}
          <div className="col-12 col-md-4 text-md-end d-md-none">
            <form>
              <div className="form-group">
                <label htmlFor="courseTabSelect" className="form-label mb-1" style={{ color: "var(--theme-white)" }}>
                  Select Course:-
                </label>

                <select
                  className="form-select thm-select w-100 w-md-auto"
                  id="courseTabSelect"
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                >
                  {tabs.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          </div>

          {/* ================= DESKTOP TABS ================= */}
          <ul className="nav course-nav-tabs d-none d-md-flex">
            {tabs.map((tab) => (
              <li className="nav-item" key={tab.id}>
                <button
                  className={`nav-link ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>

          {/* ================= TAB CONTENT ================= */}
          <div className="tab-content mt-4">
            {activeTab === "c1" && (
              <div className="course-tab-card">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                  <h2 className="course-tab-card-title">10 days Services Selection Board Hackathon</h2>

                  <p className="title-gtx shimmerText_sec  course-tab-card-title">
                    Price - ₹{getPrice("full_course", 12499).toLocaleString("en-IN")} + 18% GST
                  </p>
                </div>

                <h3 className="course-tab-card-hours">
                  <strong>Total Sessions:</strong> 17 | <strong>Total Learning Hours:</strong> 60
                </h3>

                <p>
                  This intensive SSB training program is designed to simulate the learning and behavioural
                  development required to successfully navigate the Services Selection Board interview process. Over
                  fifteen structured sessions, candidates receive training across all major areas evaluated during
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
                  <li>The entire course is covered through a virtual GTO Ground.</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="schedule-section">
          <h2 className="schedule-title">10 days SSB Hackathon Schedule</h2>

          <div className="schedule-tabs">
            <button className={scheduleTab === "morning" ? "active" : ""} onClick={() => setScheduleTab("morning")}>
              Morning Batch
            </button>

            <button className={scheduleTab === "evening" ? "active" : ""} onClick={() => setScheduleTab("evening")}>
              Evening Batch
            </button>
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

          <div className="schedule-mobile">
            {scheduleData[scheduleTab]?.map((item, index) => (
              <div key={index} className="schedule-card">
                <div className="schedule-row">
                  <span>Day</span>
                  <p>{item.day}</p>
                </div>

                <div className="schedule-row">
                  <span>Time</span>
                  <p>{item.time}</p>
                </div>

                <div className="schedule-row">
                  <span>Topic</span>
                  <p>{item.topic}</p>
                </div>

                <div className="schedule-row">
                  <span>Classes Taken By</span>
                  <p>{item.by}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "40px" }}>
            <h3 style={{ margin: "10px 0", textAlign: "center" }}>Important Notes</h3>

            {scheduleData.notes.map((note, index) => (
              <p key={index}>
                <strong>{index + 1}.</strong> {note}
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
            techniques.Our training philosophy is based on the principle of Manasa – Vacha – Karmana, emphasizing
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
