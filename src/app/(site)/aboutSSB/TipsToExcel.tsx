"use client";

import { useState } from "react";
import styles from "@/style/TipsToExcel.module.css";

interface TipItem {
  title: string;
  desc: string;
}

const tipsData: TipItem[] = [
  {
    title: "Enhance your general awareness",
    desc: `Stay updated with current affairs, national and international events, and defense-related news. A well-informed candidate stands out during group discussions and interviews.`,
  },
  {
    title: "Practice time management",
    desc: `Time management is crucial during the psychological tests and group activities. Practice solving problems quickly and efficiently.`,
  },
  {
    title: "Prepare for the personal interview",
    desc: `Be well-versed with your own background, interests, and aspirations. Anticipate common interview questions and practice articulating your responses confidently.`,
  },
  {
    title: "Participate in group activities",
    desc: `Engage in group activities with friends or in social settings to improve your teamwork and communication skills.`,
  },
  {
    title: "Stay physically fit",
    desc: `A healthy body is essential for a demanding career in the Armed Forces. Maintain a regular fitness routine and stay physically active.`,
  },
];

export default function TipsToExcel() {
  const [active, setActive] = useState<number | null>(0);

  return (
    <section className={styles.section}>
      {/* HEADER */}
      <div className={styles.header}>
        <h1>Tips to excel at Services Selection Board</h1>
        <p>
          Succeeding in the Services Selection Board requires diligent preparation and a focused approach. Here are
          some valuable tips to help you excel.
        </p>

        <h2>Understand the Officer Like Qualities (OLQs)</h2>

        <p style={{ marginTop: "20px" }}>
          The Services Selection Board looks for shades of Officer Like Qualities (OLQs) in candidates. Officer Like
          Qualities are nothing but a method to interpret one’s personality. There are 15 OLQs as enumerated below:
        </p>
      </div>

      {/* CONTENT */}
      <div className={styles.content}>
        {/* LEFT : FACTORS */}
        <div className={styles.factors}>
          <div className={styles.factorCard}>
            <h3 className={styles.factorCard_heading_OfH4}>Factor 1</h3>
            <h3 className={styles.factorCard_heading_OfH4}>Planning and Organising</h3>
            <ul>
              <li>Effective Intelligence</li>
              <li>Reasoning Ability</li>
              <li>Organising Ability</li>
              <li>Power of Expression</li>
            </ul>
          </div>

          <div className={styles.factorCard}>
            <h3 className={styles.factorCard_heading_OfH4}>Factor 2</h3>
            <h3 className={styles.factorCard_heading_OfH4}>Social Adjustment</h3>
            <ul>
              <li>Social Adaptability</li>
              <li>Cooperation</li>
              <li>Sense of Responsibility</li>
            </ul>
          </div>

          <div className={styles.factorCard}>
            <h3 className={styles.factorCard_heading_OfH4}>Factor 3</h3>
            <h3 className={styles.factorCard_heading_OfH4}>Social Effectiveness</h3>
            <ul>
              <li>Initiative</li>
              <li>Self Confidence</li>
              <li>Speed of Decision</li>
              <li>Ability to Influence the Group</li>
              <li>Liveliness</li>
            </ul>
          </div>

          <div className={styles.factorCard}>
            <h3 className={styles.factorCard_heading_OfH4}>Factor 4</h3>
            <h3 className={styles.factorCard_heading_OfH4}>Dynamic</h3>
            <ul>
              <li>Determination</li>
              <li>Courage</li>
              <li>Stamina</li>
            </ul>
          </div>
        </div>

        {/* RIGHT : TIPS */}
        <div className={styles.tips}>
          {tipsData?.map((item, index) => (
            <div
              key={index}
              className={`${styles.tip} ${active === index ? styles.open : ""}`}
              onClick={() => setActive(active === index ? null : index)}
            >
              <div className={styles.tipTitle}>{item.title}</div>

              {item.desc && (
                <div className={`${styles.tipContent} ${active === index ? styles.show : ""}`}>
                  <p>{item.desc}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
