"use client";

import { useState } from "react";
import styles from "@/style/Methodology.module.css";
import style from "@/style/Sidebar.module.css";
import Background from "@/components/home/Background";

interface MethodologyItem {
  title: string;
  desc?: string;
  titleTwo?: string;
  descTwo?: string[];
}

interface MethodologyStage {
  intro: string;
  items: MethodologyItem[];
}

type StageKey = "stage1" | "stage2" | "conference";

const DATA: Record<StageKey, MethodologyStage> = {
  stage1: {
    intro: "Stage 1 is a screening stage consisting of intelligence and perception tests:",
    items: [
      {
        title: "Officer Intelligence Rating (OIR)",
        desc: "Verbal and Non-Verbal intelligence tests to assess reasoning ability.",
      },
      {
        title: "Picture Perception & Description Test (PPDT)",
        desc: "Candidates write a story on a picture and participate in group discussion.",
      },
    ],
  },

  stage2: {
    intro: `Candidates that are retained after Stage 1 testing undergo detailed personality assessment in Stage 2.
       It comprises of three assessments by 03 different specialists:`,
    items: [
      {
        title: "Personal Interview by Interviewing Officer",
      },
      {
        title: "Psych Tests",
        desc: "Thematic Apperception Test (TAT), Word Association Test (WAT), Situation Reaction Test (SRT) and Self Description Test (SDT) evaluated by a Psychologist or Technical Officer",
      },
      {
        title: "Group Testing by Group Testing Officer",
        desc: `The Group Testing Officer evaluates candidates' group effectiveness, team dynamics, leadership qualities, and decision-making skills in Volatile_Uncertain_Complex_Ambiguous (VUCA) situations.`,
        titleTwo: "The Group Testing comprises of 09 group situational tasks",
        descTwo: [
          `  01. Group Discussion (GD)`,
          `      02. Group Planning Exercise (GPE)`,
          `      03. Progressive Group Task (PGT)`,
          `      04. Group Obstacle Race (GOR)`,
          `      05. Half Group Task (HGT)`,
          `      06. Lecturette (Lect)`,
          `      07. Individual Obstacles (IO)`,
          `      08.  Command Task (CT)`,
          `      09.  Final Group Task (FGT)`,
        ],
      },
    ],
  },

  conference: {
    intro: "Board Conference is the final stage where overall performance is reviewed:",
    items: [
      {
        title: "Conference Procedure",
        desc: `Candidates meet the board members together for the first and the last time. The assessors associated with the assessment of each candidate discuss their findings and make up their mind for final recommendation.`,
      },
      {
        title: "Final Recommendation",
        desc: "Once recommended by the board, the candidates is allotted a fresh chest number that has + sign. Thereafter, s/he undergoes a medical examination at a service hospital. Only after clearing the medical board successfully, the candidate is considered into the final merit list on the basis of overall marks obtained in relevant written exam and SSB. If the candidate appears in the merit list, s/he is invited to undergo military training at officer training academies viz. NDA, IMA, INA, AFA, OTA as per the entry.",
      },
    ],
  },
};

export default function Methodology() {
  const [activeTab, setActiveTab] = useState<StageKey>("stage2");

  const currentData = DATA[activeTab];

  return (
    <section className={styles.section}>
      <Background />
      <div className={styles.wrapper}>
        {/* TITLE */}
        <h2 className={styles.title}>
          Methodology of selection of officers <br />
          at Services Selection Board
        </h2>

        {/* TABS */}
        <div className={styles.tabs}>
          <span
            className={`${styles.tab} ${activeTab === "stage1" ? styles.active : ""}`}
            onClick={() => setActiveTab("stage1")}
          >
            Stage 1 Testing
          </span>

          <span
            className={`${styles.tab} ${activeTab === "stage2" ? styles.active : ""}`}
            onClick={() => setActiveTab("stage2")}
          >
            Stage 2 Testing
          </span>

          <span
            className={`${styles.tab} ${activeTab === "conference" ? styles.active : ""}`}
            onClick={() => setActiveTab("conference")}
          >
            Board Conference
          </span>
        </div>

        {/* CONTENT */}
        <div className={styles.content}>
          <p className={styles.intro}>{currentData.intro}</p>

          {currentData.items.map((item, index) => (
            <div key={index}>
              <div className={styles.item}>
                <span className={styles.index}>{index + 1}.</span>
                <span className={styles.text}>{item.title}</span>
              </div>

              {item.desc && <p className={styles.subText}>{item.desc}</p>}

              {item.titleTwo && <p className={styles.subTextTwo}>{item.titleTwo}</p>}

              {item?.descTwo &&
                item.descTwo.map((line, idx) => (
                  <div className={styles.subTextWrapper} key={idx}>
                    <p className={styles.subText}>{line}</p>
                  </div>
                ))}

              {index !== currentData.items.length - 1 && <div className={styles.divider}></div>}
            </div>
          ))}

          <div className={styles.bottomLineWrapper}>
            <div className={style.topLine}>
              <span className={style.line}></span>
              <span className={`${style.dot} ${style.dotLeftToRight}`}></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
