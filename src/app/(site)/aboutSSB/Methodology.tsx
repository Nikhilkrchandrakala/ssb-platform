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
  return (
    <section className={styles.section}>
      <Background />
      <div className={styles.wrapper}>
        {/* TITLE */}
        <h2 className={styles.title}>
          Methodology & Chronology of Selection of Officers <br />
          at the Services Selection Board
        </h2>

        {/* 3-COLUMN ROADMAP TABLE */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Stage 1 Testing</th>
                <th className={styles.th}>Stage 2 Testing</th>
                <th className={styles.th}>Board Conference</th>
              </tr>
            </thead>
            <tbody>
              {/* ROW 1: CHRONOLOGY / TIMELINE */}
              <tr className={styles.trTimeline}>
                <td className={styles.tdCol}>
                  <div className={styles.rowLabel}>Phase / Timeline</div>
                  <div className={styles.timelineValue}>Day 1 (Screening)</div>
                </td>
                <td className={styles.tdCol}>
                  <div className={styles.rowLabel}>Phase / Timeline</div>
                  <div className={styles.timelineValue}>Days 2 - 4 (Detailed Assessment)</div>
                </td>
                <td className={styles.tdCol}>
                  <div className={styles.rowLabel}>Phase / Timeline</div>
                  <div className={styles.timelineValue}>Day 5 (Final Selection)</div>
                </td>
              </tr>

              {/* ROW 2: CORE ASSESSMENTS */}
              <tr>
                <td className={styles.tdCol}>
                  <div className={styles.rowLabel}>Core Assessments</div>
                  <div className={styles.tableItem}>
                    <strong className={styles.itemTitle}>Officer Intelligence Rating (OIR)</strong>
                    <p className={styles.itemDesc}>Verbal and Non-Verbal intelligence tests to assess reasoning ability.</p>
                  </div>
                  <div className={styles.tableItem}>
                    <strong className={styles.itemTitle}>Picture Perception & Description (PPDT)</strong>
                    <p className={styles.itemDesc}>Candidates write a story on a picture and participate in group discussion.</p>
                  </div>
                </td>
                <td className={styles.tdCol}>
                  <div className={styles.rowLabel}>Core Assessments</div>
                  <div className={styles.tableItem}>
                    <strong className={styles.itemTitle}>Personal Interview (IO)</strong>
                    <p className={styles.itemDesc}>One-on-one interview to evaluate character, general awareness, values, and background.</p>
                  </div>
                  <div className={styles.tableItem}>
                    <strong className={styles.itemTitle}>Psychological Tests (Psych)</strong>
                    <p className={styles.itemDesc}>Thematic Apperception Test (TAT), Word Association Test (WAT), Situation Reaction (SRT), and Self Description (SDT).</p>
                  </div>
                  <div className={styles.tableItem}>
                    <strong className={styles.itemTitle}>Group Testing (GTO)</strong>
                    <div className={styles.itemDesc}>
                      The GTO evaluates team dynamics, group effectiveness, and leadership skills.
                      <div className={styles.gtoTasksTitle}>Comprises 09 group situational tasks:</div>
                      <ol className={styles.gtoTasksList}>
                        <li>Group Discussion (GD)</li>
                        <li>Group Planning Exercise (GPE)</li>
                        <li>Progressive Group Task (PGT)</li>
                        <li>Group Obstacle Race (GOR)</li>
                        <li>Half Group Task (HGT)</li>
                        <li>Lecturette (Lect)</li>
                        <li>Individual Obstacles (IO)</li>
                        <li>Command Task (CT)</li>
                        <li>Final Group Task (FGT)</li>
                      </ol>
                    </div>
                  </div>
                </td>
                <td className={styles.tdCol}>
                  <div className={styles.rowLabel}>Core Assessments</div>
                  <div className={styles.tableItem}>
                    <strong className={styles.itemTitle}>Conference Procedure</strong>
                    <p className={styles.itemDesc}>Candidates meet the board members together. The assessors discuss findings to make final recommendations.</p>
                  </div>
                  <div className={styles.tableItem}>
                    <strong className={styles.itemTitle}>Final Recommendation</strong>
                    <p className={styles.itemDesc}>Candidates recommended undergo medical examinations for the final merit list (NDA, IMA, INA, AFA, OTA).</p>
                  </div>
                </td>
              </tr>

              {/* ROW 3: OBJECTIVE & FOCUS */}
              <tr>
                <td className={styles.tdCol}>
                  <div className={styles.rowLabel}>Objective & Focus</div>
                  <p className={styles.itemDesc}>Evaluate basic cognitive abilities and initial communication skills to filter candidates for Stage 2.</p>
                </td>
                <td className={styles.tdCol}>
                  <div className={styles.rowLabel}>Objective & Focus</div>
                  <p className={styles.itemDesc}>Perform a deep 3-dimensional assessment (Manso, Vacha, Karmana) of personality, social effectiveness, and leadership qualities in VUCA situations.</p>
                </td>
                <td className={styles.tdCol}>
                  <div className={styles.rowLabel}>Objective & Focus</div>
                  <p className={styles.itemDesc}>Reconcile independent evaluations by all three specialists (IO, GTO, Psych) to make a joint final selection decision.</p>
                </td>
              </tr>

              {/* ROW 4: OUTCOME */}
              <tr>
                <td className={styles.tdCol}>
                  <div className={styles.rowLabel}>Expected Outcome</div>
                  <span className={styles.outcomeBadge}>Screened-In / Out</span>
                </td>
                <td className={styles.tdCol}>
                  <div className={styles.rowLabel}>Expected Outcome</div>
                  <span className={styles.outcomeBadge}>Detailed Profile Compiled</span>
                </td>
                <td className={styles.tdCol}>
                  <div className={styles.rowLabel}>Expected Outcome</div>
                  <span className={styles.outcomeBadge}>Recommended / Not Recommended</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={styles.bottomLineWrapper}>
          <div className={style.topLine}>
            <span className={style.line}></span>
            <span className={`${style.dot} ${style.dotLeftToRight}`}></span>
          </div>
        </div>
      </div>
    </section>
  );
}
