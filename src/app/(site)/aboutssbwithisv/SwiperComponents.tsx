"use client";

import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel } from "swiper/modules";
import "swiper/css";

import styles from "@/style/Journey.module.css";
import { journeyData } from "@/util/data";

export default function SwiperComponents() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className={styles.section}>
      <section className="team-section container  ">
        <div className="row flex-column flex-md-row align-items-center gy-3">
          <div className="col-12 col-lg-9 order-1 order-lg-1">
            <div className="sct-title">
              <h2>Our journey</h2>
            </div>
          </div>
        </div>

        <div className="row col-12 mx-auto">
          <div className="col-xl-11 col-lg-10 mx-auto">
            <div className={styles.wrapper}>
              {/* TIMELINE */}
              <div className={styles.timeline}>
                <div className={styles.baseLine}></div>

                <div
                  className={styles.progressLine}
                  style={{
                    height: `${(activeIndex / (journeyData.length - 1)) * 100}%`,
                  }}
                />

                {journeyData.map((_, i) => (
                  <span
                    key={i}
                    className={`${styles.dot} ${i <= activeIndex ? styles.active : ""}`}
                    style={{ top: `${(i / (journeyData.length - 1)) * 100}%` }}
                  />
                ))}
              </div>

              {/* SWIPER */}
              <Swiper
                direction="vertical"
                slidesPerView={1}
                mousewheel={{
                  forceToAxis: true,
                  sensitivity: 1,
                  releaseOnEdges: true,
                }}
                modules={[Mousewheel]}
                onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
                className={styles.swiper}
              >
                {journeyData.map((item, i) => (
                  <SwiperSlide key={i}>
                    <div className={styles.slide}>
                      <span className={styles.date}>{item.date}</span>
                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>

                      <div className={styles.imageBox}>
                        <img src={item.image} alt={item.title} />
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
