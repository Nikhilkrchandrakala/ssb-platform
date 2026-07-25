"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/style/OurCourses.module.css";
import CustomButton from "@/components/site/CustomButton";
import { coursesData } from "@/util/data";
import HeadingTwo from "@/components/site/HeadingTwo";

const OurCourses = () => {
  const [activeCard, setActiveCard] = useState(0);
  const courseListRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Set up refs for each card
  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, coursesData.length);
  }, []);

  // Handle scroll to detect active card
  const handleScroll = () => {
    if (!courseListRef.current) return;

    if (isMobile) {
      // Horizontal scroll detection for mobile
      const scrollLeft = courseListRef.current.scrollLeft;
      const containerWidth = courseListRef.current.clientWidth;
      const cardWidth = cardRefs.current[0]?.clientWidth || 0;
      const scrollPosition = scrollLeft + containerWidth / 2;

      // Calculate which card is in the middle
      const activeIndex = Math.floor(scrollPosition / (cardWidth + 20));
      if (activeIndex >= 0 && activeIndex < coursesData.length) {
        setActiveCard(activeIndex);
      }
    } else {
      // Vertical scroll detection for desktop
      const scrollTop = courseListRef.current.scrollTop;
      const containerHeight = courseListRef.current.clientHeight;
      const scrollPosition = scrollTop + containerHeight / 2;

      for (let i = 0; i < cardRefs.current.length; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;

        const cardTop = card.offsetTop;
        const cardHeight = card.clientHeight;
        const cardBottom = cardTop + cardHeight;

        if (scrollPosition >= cardTop && scrollPosition <= cardBottom) {
          setActiveCard(i);
          break;
        }
      }
    }
  };

  // Click on card to make it active
  const handleCardClick = (index: number) => {
    setActiveCard(index);
    if (isMobile) {
      // Horizontal scroll for mobile
      const card = cardRefs.current[index];
      const container = courseListRef.current;
      if (card && container) {
        const cardLeft = card.offsetLeft;
        const containerWidth = container.clientWidth;
        const cardWidth = card.clientWidth;
        const scrollTo = cardLeft - containerWidth / 2 + cardWidth / 2;

        container.scrollTo({
          left: scrollTo,
          behavior: "smooth",
        });
      }
    } else {
      // Vertical scroll for desktop
      cardRefs.current[index]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // Click on indicator dot
  const handleIndicatorClick = (index: number) => {
    handleCardClick(index);
  };

  const router = useRouter();

  return (
    <section className={styles.coursesSection}>
      {/* Header */}
      <div className={styles.header}>
        <HeadingTwo h1="Our" t1="Courses" />
        <CustomButton text="Know More" onClick={() => router.push("/Courses")} />
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

      {/* Content */}
      <div className={styles.content}>
        {/* LEFT LIST - Desktop / Horizontal Cards - Mobile */}
        <div
          className={`${styles.courseList} ${isMobile ? styles.mobileList : ""}`}
          ref={courseListRef}
          onScroll={handleScroll}
        >
          {coursesData?.map((course, index) => (
            <div
              key={course.id}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className={`${styles.courseCard} ${activeCard === index ? styles.active : styles.inactive}`}
              onClick={() => handleCardClick(index)}
            >
              <div className={styles.cardContent}>
                {/* Corner Brackets */}
                <div className={`${styles.corner} ${styles.tl}`}></div>
                <div className={`${styles.corner} ${styles.tr}`}></div>
                <div className={`${styles.corner} ${styles.bl}`}></div>
                <div className={`${styles.corner} ${styles.br}`}></div>

                {/* Card Content */}
                <div className={styles.cardInner}>
                  <h1 className={styles.number}>{course.number}</h1>
                  <h2>{course.title}</h2>
                  <p>Total Sessions - {course.sessions}</p>
                  <p>Total Learning Hours - {course.hours}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CARD INDICATOR DOTS */}
        <div className={styles.cardIndicator}>
          {coursesData.map((_, index) => (
            <div
              key={index}
              className={`${styles.indicatorDot} ${activeCard === index ? styles.active : ""}`}
              onClick={() => handleIndicatorClick(index)}
              title={`Course ${index + 1}`}
            />
          ))}
        </div>

        {/* RIGHT IMAGE PANEL */}
        <div
          className={styles.preview}
          style={{
            backgroundImage: `url(${coursesData[activeCard]?.image || "/assets/img/courses/default.webp"})`,
          }}
        >
          <div className={styles.previewOverlay}>
            <h1 className={styles.courseTitle}>
              <span className={styles.white}>{coursesData[activeCard]?.description}</span>
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurCourses;
