"use client";

import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import styles from "@/style/RogerThat.module.css";

interface TeamSection {
  id: string;
  title: string;
  content?: string[];
  text?: string;
}

interface TeamMember {
  id: string;
  image: string;
  designation: string;
  name: string;
  post: string;
  sections: TeamSection[];
}

const teamData: TeamMember[] = [
  {
    id: "member-1",
    image: "/assets/founder.webp",
    designation: "Group Testing Officer",
    name: "Lt. Commander Nikhil Kumar Chandrakala (Retd.)",
    post: "Founder & Chief Mentor",
    sections: [
      {
        id: "ssb",
        title: "SSB Assessor Background",
        content: [
          `Trained at Defence Institute of Psychological Research and Naval Selection Board, Coimbatore - Certified "Group Testing Officer"`,
          `Youngest Panellist (Group Testing Officer) at Services Selection Board since 1947`,
          `Founding Member and 1st Group Testing Officer of SSB (Kolkata) – Indian Navy's Fourth Officers’ Selection Board`,
          `Served as Group Testing Officer at 12 SSB Bangalore, Selection Centre South`,
          `Assessed 13000+ candidates appearing for the SSB`,
        ],
      },
      {
        id: "navy",
        title: "Navy Background",
        content: [
          `Served onboard INS Prabal, INS Abhay, and as Flag Lieutenant to Flag Officer Commanding Maharashtra and  Gujarat Naval Area`,
          `Captain of Indian Naval Immediate Support Vessel T - 15`,
          `Squadron Commander 81st ISV Squadron`,
          `Senior Officer ISVs (West)`,
        ],
      },
      {
        id: "Educational",
        title: "Educational Background",
        content: [
          `B.Tech. (Electrical Engineering), NIT Srinagar (J&K)`,
          `Masters in Psychology, Minor in Industrial and Organisational Psychology`,
          `Masters in Mobility Engineering, Indian Institute of Science, Bangalore`,
        ],
      },
    ],
  },
  {
    id: "member-2",
    image: "/assets/1.jpeg",
    designation: "Mentor-in-residence & Principal Insight Officer",
    name: "Lt Colonel Vivek Talwar (Retd.)",
    post: "",
    sections: [
      {
        id: "SSB",
        title: "SSB Background",
        content: [`Ex Coord Officer,  Selection Center South (Bangalore)`],
      },
      {
        id: "Army",
        title: "Army Background",
        content: [`21+ years of Xperiencein strategic operations across broad theaters`],
      },
      {
        id: "Educational",
        title: "Educational Background",
        content: [
          `Graduation &
                        Post Grad (St Xavier’s College, Calcutta)`,
          `MBA, Pune University`,
          `Masters in Human Rights, Delhi University`,
          `PGDBA (HR)`,
          `PMP`,
          `Certified Life Coach & Alternate Counsellor`,
        ],
      },
    ],
  },
];

export default function TeamCarousel() {
  const [prevEl, setPrevEl] = useState<HTMLDivElement | null>(null);
  const [nextEl, setNextEl] = useState<HTMLDivElement | null>(null);

  return (
    <section className="team-section container sectionspace80 ">
      <div className="row align-items-center gy-3">
        <div className="col-12 col-lg-9">
          <div style={{ margin: "0" }} className="sct-title">
            <h2>SSB with ISV Core Team</h2>
          </div>
        </div>

        <div className="col-12 col-lg-3 d-none d-lg-flex justify-content-end gap-2">
          <div ref={setPrevEl} className={styles.arrow}>
            <IoIosArrowBack />
          </div>
          <div ref={setNextEl} className={styles.arrow}>
            <IoIosArrowForward />
          </div>
        </div>
      </div>

      <Swiper
        slidesPerView={1}
        spaceBetween={40}
        loop={true}
        pagination={{
          el: ".roger-pagination",
          clickable: true,
        }}
        navigation={{
          prevEl,
          nextEl,
        }}
        breakpoints={{
          0: { slidesPerView: 1 },
          1024: { slidesPerView: 1 },
          1420: { slidesPerView: 1 },
          1520: { slidesPerView: 1 },
        }}
        modules={[Pagination, Navigation, Autoplay]}
        className={styles.mySwiper}
      >
        {teamData.map((member, slideIndex) => (
          <SwiperSlide key={member.id} className="team-slide">
            <div className="team-card">
              <div className="col-12 row mx-auto">
                {/* LEFT */}
                <div className="col-xl-3 col-lg-4 col-md-5">
                  <div className="team-image">
                    <div className="teamImgDiv">
                      <img src={member.image} alt={member.name} />
                    </div>
                    <span className="team-designation">{member.designation}</span>
                    <h3>{member.name}</h3>
                    <p style={{ textAlign: "center" }}>{member.post}</p>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="col-xl-9 col-lg-8 col-md-7">
                  <div className="team-detailed-content">
                    <div className="accordion team-accordion">
                      {member.sections.map((section, index) => {
                        const collapseId = `collapse-${slideIndex}-${section.id}`;

                        return (
                          <div className="accordion-item" key={section.id}>
                            <div className="accordion-header">
                              <button
                                className={`accordion-button ${index !== 0 ? "collapsed" : ""}`}
                                data-bs-toggle="collapse"
                                data-bs-target={`#${collapseId}`}
                              >
                                {section.title}
                              </button>
                            </div>

                            <div
                              id={collapseId}
                              className={`accordion-collapse collapse ${index === 0 ? "show" : ""}`}
                            >
                              <div className="accordion-body">
                                {section.content && (
                                  <ul>
                                    {section.content.map((item, i) => (
                                      <li key={i}>{item}</li>
                                    ))}
                                  </ul>
                                )}

                                {section.text && <p>{section.text}</p>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className={styles.paginationWrapper}>
        <div className="roger-pagination"></div>
      </div>
    </section>
  );
}
