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

  const steps = [
    {
      title: "Step 1: Understand the Officer Like Qualities (OLQs)",
      isOLQ: true,
      desc: "The Services Selection Board looks for shades of Officer Like Qualities (OLQs) in candidates. Officer Like Qualities are nothing but a method to interpret one’s personality. There are 15 OLQs as enumerated below:"
    },
    {
      title: "Step 2: Enhance your general awareness",
      desc: "Stay updated with current affairs, national and international events, and defense-related news. A well-informed candidate stands out during group discussions and interviews."
    },
    {
      title: "Step 3: Practice time management",
      desc: "Time management is crucial during the psychological tests and group activities. Practice solving problems quickly and efficiently."
    },
    {
      title: "Step 4: Prepare for the personal interview",
      desc: "Be well-versed with your own background, interests, and aspirations. Anticipate common interview questions and practice articulating your responses confidently."
    },
    {
      title: "Step 5: Participate in group activities",
      desc: "Engage in group activities with friends or in social settings to improve your teamwork and communication skills."
    },
    {
      title: "Step 6: Stay physically fit",
      desc: "A healthy body is essential for a demanding career in the Armed Forces. Maintain a regular fitness routine and stay physically active."
    }
  ];

  return (
    <section className={styles.section}>
      {/* HEADER */}
      <div className={styles.header}>
        <h1>Tips to excel at Services Selection Board</h1>
        <p>
          Succeeding in the Services Selection Board requires diligent preparation and a focused approach. Here are
          some valuable tips to help you excel.
        </p>
      </div>

      {/* CONTENT */}
      <div className={styles.stepsContainer}>
        {steps.map((step, index) => {
          const isOpen = active === index;
          return (
            <div
              key={index}
              className={`${styles.stepBlock} ${isOpen ? styles.open : ""}`}
            >
              {/* BLOCK HEADER */}
              <div 
                className={styles.stepTitle} 
                onClick={() => setActive(isOpen ? null : index)}
              >
                <span>{step.title}</span>
                <span className={styles.icon}>{isOpen ? "−" : "+"}</span>
              </div>

              {/* BLOCK CONTENT */}
              <div className={`${styles.stepContent} ${isOpen ? styles.show : ""}`}>
                <div className={styles.stepInner}>
                  {step.isOLQ ? (
                    <div className={styles.olqContent}>
                      <p className={styles.olqText}>{step.desc}</p>
                      
                      <div className={styles.factorsGrid}>
                        <div className={styles.factorCard}>
                          <div className={styles.factorNumber}>Factor 1</div>
                          <h4 className={styles.factorTitle}>Planning & Organising</h4>
                          <ul className={styles.factorList}>
                            <li>Effective Intelligence</li>
                            <li>Reasoning Ability</li>
                            <li>Organising Ability</li>
                            <li>Power of Expression</li>
                          </ul>
                        </div>

                        <div className={styles.factorCard}>
                          <div className={styles.factorNumber}>Factor 2</div>
                          <h4 className={styles.factorTitle}>Social Adjustment</h4>
                          <ul className={styles.factorList}>
                            <li>Social Adaptability</li>
                            <li>Cooperation</li>
                            <li>Sense of Responsibility</li>
                          </ul>
                        </div>

                        <div className={styles.factorCard}>
                          <div className={styles.factorNumber}>Factor 3</div>
                          <h4 className={styles.factorTitle}>Social Effectiveness</h4>
                          <ul className={styles.factorList}>
                            <li>Initiative</li>
                            <li>Self Confidence</li>
                            <li>Speed of Decision</li>
                            <li>Ability to Influence the Group</li>
                            <li>Liveliness</li>
                          </ul>
                        </div>

                        <div className={styles.factorCard}>
                          <div className={styles.factorNumber}>Factor 4</div>
                          <h4 className={styles.factorTitle}>Dynamic</h4>
                          <ul className={styles.factorList}>
                            <li>Determination</li>
                            <li>Courage</li>
                            <li>Stamina</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.stepDescText}>{step.desc}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
