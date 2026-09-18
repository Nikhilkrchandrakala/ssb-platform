"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/style/OurCourses.module.css";
import CustomButton from "@/components/site/CustomButton";
import { coursesData } from "@/util/data";
import HeadingTwo from "@/components/site/HeadingTwo";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";

// 3D fan-carousel interaction ported from the Fuzo project's profile
// "Highlights" carousel (src/components/profile/ProfileHero.tsx +
// _profile.scss .fz-highlights-section__card) — same center/left-1/right-1/
// left-2/right-2 positions, same click-to-recenter-then-click-to-open flow.
const totalItems = coursesData.length;

function getCardPositionClass(index: number, activeIndex: number) {
  let diff = index - activeIndex;
  if (diff > totalItems / 2) diff -= totalItems;
  if (diff < -totalItems / 2) diff += totalItems;

  if (diff === 0) return styles.cardCenter;
  if (diff === -1) return styles.cardLeft1;
  if (diff === 1) return styles.cardRight1;
  if (diff === -2) return styles.cardLeft2;
  if (diff === 2) return styles.cardRight2;
  return styles.cardHidden;
}

const OurCourses = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const [showChoice, setShowChoice] = useState(false);
  const router = useRouter();

  const handlePrev = () => setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
  const handleNext = () => setActiveIndex((prev) => (prev + 1) % totalItems);

  const handleCardClick = (index: number) => {
    if (index === activeIndex) {
      setDetailIndex(index);
    } else {
      setActiveIndex(index);
    }
  };

  const activeCourse = coursesData[activeIndex];
  const detailCourse = detailIndex !== null ? coursesData[detailIndex] : null;

  return (
    <section className={styles.coursesSection}>
      {/* Header */}
      <div className={styles.header}>
        <HeadingTwo h1="Our" t1="Courses" />
        <CustomButton text="Know More" onClick={() => setShowChoice(true)} />
      </div>

      <div className={`${styles.coursesBenefits} mvk-benefits`}>
        <HeadingTwo
          h1="Who should join our"
          t1="SSB coaching program?"
          style={{ fontSize: "15px", fontWeight: 500, marginBottom: "8px" }}
        />

        <ul>
          <li>NDA aspirants</li>
          <li>CDS aspirants</li>
          <li>AFCAT aspirants</li>
          <li>10+2 TES candidates</li>
          <li>10+2 B. Tech. entry (Navy) candidates</li>
          <li>NCC special entry candidates</li>
          <li>Service entry candidates (SD list commission, ACC entry, CW Scheme, SCO & PC-SL entries)</li>
          <li>SSC (Tech) and SSC (Non Tech) aspirants</li>
          <li>TGC aspirants</li>
          <li>SSC (JAG) aspirants</li>
          <li>
            SSC Navy aspirants (Executive, Law, Pilot, Naval Air Operations, Engineering, Electrical, Logistics,
            Naval Armament, Naval Constructor, Air Traffic Control)
          </li>
        </ul>
      </div>

      {/* 3D Fan Carousel */}
      <div className={styles.carouselHeader}>
        <button className={styles.navBtn} onClick={handlePrev} aria-label="Previous course">
          <FaChevronLeft />
        </button>
        <span className={styles.carouselHint}>Click the front card for full details</span>
        <button className={styles.navBtn} onClick={handleNext} aria-label="Next course">
          <FaChevronRight />
        </button>
      </div>

      <div className={styles.stage}>
        {coursesData.map((course, index) => (
          <div
            key={course.id}
            className={`${styles.card3d} ${getCardPositionClass(index, activeIndex)}`}
            onClick={() => handleCardClick(index)}
            role="button"
            tabIndex={0}
          >
            <img src={course.image} alt={course.title} />
            <div className={styles.cardBlur} />
            <div className={styles.cardGradient} />
            <div className={styles.card3dContent}>
              <span className={styles.card3dNumber}>{course.number}</span>
              <h3 className={styles.card3dTitle}>{course.title}</h3>
              <p className={styles.card3dSubtitle}>
                {course.subtitle || `${course.sessions} Sessions · ${course.hours} Hours`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Caption underneath the cards */}
      {activeCourse && <p className={styles.caption}>{activeCourse.description}</p>}

      {/* CARD INDICATOR DOTS */}
      <div className={styles.cardIndicator}>
        {coursesData.map((_, index) => (
          <div
            key={index}
            className={`${styles.indicatorDot} ${activeIndex === index ? styles.active : ""}`}
            onClick={() => setActiveIndex(index)}
            title={`Course ${index + 1}`}
          />
        ))}
      </div>

      {/* ONLINE / OFFLINE CHOICE MODAL */}
      {showChoice && (
        <div className={styles.detailOverlay} onClick={() => setShowChoice(false)}>
          <div className={styles.choiceModal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.detailClose} onClick={() => setShowChoice(false)} aria-label="Close">
              <FaTimes />
            </button>
            <h2 className={styles.choiceTitle}>How would you like to train?</h2>
            <p className={styles.choiceLead}>Pick a track to see courses, batches and pricing.</p>
            <div className={styles.choiceOptions}>
              <button className={styles.choiceOption} onClick={() => router.push("/Courses")}>
                <span className={styles.choiceOptionTitle}>Online</span>
                <span className={styles.choiceOptionDesc}>Mentor-led coaching from anywhere in India</span>
              </button>
              <button className={styles.choiceOption} onClick={() => router.push("/CoursesOffline")}>
                <span className={styles.choiceOptionTitle}>Offline</span>
                <span className={styles.choiceOptionDesc}>12-day residential programme at our Nagpur campus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COURSE DETAIL MODAL */}
      {detailCourse && (
        <div className={styles.detailOverlay} onClick={() => setDetailIndex(null)}>
          <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.detailClose} onClick={() => setDetailIndex(null)} aria-label="Close">
              <FaTimes />
            </button>
            <div className={styles.detailImageWrap}>
              <img src={detailCourse.image} alt={detailCourse.title} />
            </div>
            <div className={styles.detailBody}>
              <span className={styles.detailNumber}>{detailCourse.number}</span>
              <h2 className={styles.detailTitle}>{detailCourse.title}</h2>
              <p className={styles.detailDescription}>{detailCourse.description}</p>
              <div className={styles.detailStatsRow}>
                {detailCourse.isOffline ? (
                  <div className={styles.detailStat}>
                    <strong>{detailCourse.subtitle}</strong>
                    <span>Programme</span>
                  </div>
                ) : (
                  <>
                    <div className={styles.detailStat}>
                      <strong>{detailCourse.sessions}</strong>
                      <span>Sessions</span>
                    </div>
                    <div className={styles.detailStat}>
                      <strong>{detailCourse.hours}</strong>
                      <span>Learning Hours</span>
                    </div>
                  </>
                )}
                <div className={styles.detailStat}>
                  <strong>&#8377;{detailCourse.price}</strong>
                  <span>Course Fee</span>
                </div>
              </div>
              <CustomButton
                text={detailCourse.isOffline ? "Know More" : "Enroll Now"}
                onClick={() => router.push(detailCourse.isOffline ? "/CoursesOffline" : "/Batches")}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default OurCourses;
