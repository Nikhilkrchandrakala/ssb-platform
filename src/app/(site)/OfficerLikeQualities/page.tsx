"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IoMdArrowBack } from "react-icons/io";
import { FaQuoteLeft } from "react-icons/fa";
import styles from "@/style/OfficerLikeQualities.module.css";

interface OLQComponent {
  name: string;
  desc: string;
}

interface OLQInfo {
  name: string;
  short: string;
  desc: string;
  subComponents?: OLQComponent[];
}

interface FactorInfo {
  num: string;
  name: string;
  bodyPart: string;
  alias: string;
  quote: string;
  qualities: OLQInfo[];
}

const factorsData: FactorInfo[] = [
  {
    num: "Factor I",
    name: "Planning and Organising",
    bodyPart: "Head / Brain",
    alias: "Good Speaker and Organiser",
    quote: "Intellectual ability to analyze situations and organize resources.",
    qualities: [
      {
        name: "Effective Intelligence (EI)",
        short: "EI",
        desc: "The capability to address and resolve practical situations of varying complexity. Unlike pure theoretical intellect, it measures how effectively a candidate can navigate real-world challenges, optimize resources, and generate logical workarounds under constraints.",
        subComponents: [
          {
            name: "Practical Intelligence",
            desc: "The capacity to develop independent, viable solutions to everyday situational problems."
          },
          {
            name: "Resourcefulness",
            desc: "The ability to improvise, utilizing whatever tools and information are at hand, especially when facing unexpected obstacles or tight constraints."
          }
        ]
      },
      {
        name: "Reasoning Ability (RA)",
        short: "RA",
        desc: "The aptitude to comprehend the core elements of a situation, analyze facts objectively, and reach logical conclusions free from emotional bias.",
        subComponents: [
          {
            name: "Receptivity",
            desc: "Being open-minded and eager to absorb new information and experiences attentively."
          },
          {
            name: "Inquiring Attitude",
            desc: "A proactive curiosity to seek knowledge and understand how things function."
          },
          {
            name: "Logical Reasoning",
            desc: "Arriving at conclusions based on cause-and-effect thinking rather than emotional impulse."
          },
          {
            name: "Seeing Essentials of a Problem",
            desc: "The capacity to prioritize issues, identify core bottlenecks, and focus effort where it matters most."
          }
        ]
      },
      {
        name: "Organising Ability (OA)",
        short: "OA",
        desc: "The capacity to structure and coordinate available assets, manpower, and tools in a systematic manner to achieve optimal results efficiently."
      },
      {
        name: "Power of Expression (POE)",
        short: "POE",
        desc: "The capability to articulate thoughts, plans, and instructions clearly, confidently, and persuasively so that others can easily understand."
      }
    ]
  },
  {
    num: "Factor II",
    name: "Social Adjustment",
    bodyPart: "Heart",
    alias: "Good Soldier",
    quote: "Adaptability, team spirit, and willing alignment with social boundaries.",
    qualities: [
      {
        name: "Social Adaptability (SA)",
        short: "SA",
        desc: "The ease with which a candidate adjusts to diverse social environments, getting along with superiors, peers, and subordinates alike.",
        subComponents: [
          {
            name: "Social Intelligence",
            desc: "Sensitivity to social dynamics and the ability to interact smoothly in group settings."
          },
          {
            name: "Attitude Towards Others",
            desc: "An empathetic outlook, appreciating other people's challenges and showing a genuine willingness to help."
          },
          {
            name: "Tact & Adaptability",
            desc: "Managing delicate interpersonal situations with sensitivity while remaining resilient in unfamiliar surroundings."
          }
        ]
      },
      {
        name: "Cooperation (COOP)",
        short: "COOP",
        desc: "A genuine willingness to work collaboratively in group activities. This entails placing the team's goals above personal interests and fostering mutual trust."
      },
      {
        name: "Sense of Responsibility (SoR)",
        short: "SoR",
        desc: "A deep commitment to duty and personal accountability. It involves executing tasks thoroughly and taking ownership of outcomes, even in unforeseen circumstances.",
        subComponents: [
          {
            name: "Sense of Duty",
            desc: "Firmly and reliably executing orders and completing assignments."
          },
          {
            name: "Discipline",
            desc: "Conforming to rules, regulations, and moral standards while maintaining strong self-control."
          }
        ]
      }
    ]
  },
  {
    num: "Factor III",
    name: "Social Effectiveness",
    bodyPart: "Gut",
    alias: "Good Leader",
    quote: "Initiative, decision speed, and group influence under pressure.",
    qualities: [
      {
        name: "Initiative",
        short: "INI",
        desc: "The drive to initiate action, take the first step in unfamiliar scenarios, and sustain momentum without needing external prompting."
      },
      {
        name: "Self-Confidence",
        short: "SC",
        desc: "An unwavering belief in one's own capabilities, allowing a person to stay composed and make sound decisions in stressful, unfamiliar, or high-stakes environments."
      },
      {
        name: "Speed of Decision (SoD)",
        short: "SoD",
        desc: "The capacity to make sound, actionable choices rapidly, especially in critical or time-sensitive situations.",
        subComponents: [
          {
            name: "Appropriateness",
            desc: "The quality, accuracy, and feasibility of the decided course of action."
          },
          {
            name: "Quickness",
            desc: "The speed and decisiveness of the thought process under pressure."
          }
        ]
      },
      {
        name: "Ability to Influence the Group",
        short: "AIG",
        desc: "The natural charisma and leadership capability to guide, motivate, and direct a group's collective energy toward achieving a common objective."
      },
      {
        name: "Liveliness",
        short: "LIV",
        desc: "A positive, cheerful disposition that keeps morale high and fosters a productive, energetic team spirit even when facing challenges."
      }
    ]
  },
  {
    num: "Factor IV",
    name: "Dynamic (Limb)",
    bodyPart: "Limbs",
    alias: "Good Worker",
    quote: "Stamina, determination, drive, and risk-taking capacity.",
    qualities: [
      {
        name: "Determination",
        short: "DET",
        desc: "The grit and perseverance to pursue goals relentlessly despite fatigue, obstacles, or setbacks.",
        subComponents: [
          {
            name: "Application to Work",
            desc: "Focusing mental and physical energy consistently on the task."
          },
          {
            name: "Drive",
            desc: "The inner motivation that fuels action under pressure and inspires others to press forward."
          }
        ]
      },
      {
        name: "Courage",
        short: "COU",
        desc: "The willingness to face danger and take calculated, purposeful risks with composure and presence of mind.",
        subComponents: [
          {
            name: "Meeting Appreciated Danger",
            desc: "Assessing dangers rationally and acting decisively rather than recklessly."
          },
          {
            name: "Spirit of Adventure",
            desc: "An enterprising desire to dare, explore, and handle high-risk situations."
          }
        ]
      },
      {
        name: "Stamina",
        short: "STA",
        desc: "The endurance to sustain prolonged physical and mental exertion without drop-offs in performance."
      }
    ]
  }
];

export default function OfficerLikeQualities() {
  const router = useRouter();
  const [activeFactorIndex, setActiveFactorIndex] = useState(0);

  const activeFactor = factorsData[activeFactorIndex];

  return (
    <div className={styles.olqRoot}>
      {/* FIXED BACK BUTTON */}
      <div onClick={() => router.back()} className={styles.BackBtn} title="Go Back">
        <IoMdArrowBack />
      </div>

      {/* FOLD 1: HEADER BANNER */}
      <section className={styles.foldIntro}>
        <div className={styles.container}>
          <div className={styles.header}>
            <span className={styles.subtitle}>SSB Evaluation Matrix</span>
            <div className={styles.title}>
              <h1>Officer Like Qualities (OLQs)</h1>
            </div>
            <p className={styles.headerDesc}>
              The selection process at the Services Selection Board evaluates candidates against 15 consolidated 
              <strong> Officer Like Qualities (OLQs)</strong>, grouped into four core personality factors. 
              Discover the correlation of these qualities with the human body and their detailed parameters below.
            </p>
          </div>
        </div>
      </section>

      {/* FOLD 2: HISTORICAL EVOLUTION */}
      <section className={styles.foldHistory}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Historical Evolution of OLQs</h2>
          <div className={styles.timeline}>
            <div className={styles.timelineStep}>
              <div className={styles.timelineYear}>1950</div>
              <div className={styles.timelineContent}>
                <h3>186 Qualities (OQRS)</h3>
                <p>
                  Originally drafted by the Psychological Research Wing (PRW). Opinion compiled from 167 senior 
                  Army Officers (Col and above) and 38 selection board members.
                </p>
              </div>
            </div>
            <div className={styles.timelineStep}>
              <div className={styles.timelineYear}>1954</div>
              <div className={styles.timelineContent}>
                <h3>29 Qualities</h3>
                <p>
                  Condensed to 29 qualities to eliminate non-essentials. However, assessments remained vague, 
                  highly overlapping, and too numerous for standard evaluation.
                </p>
              </div>
            </div>
            <div className={styles.timelineStep}>
              <div className={styles.timelineYear}>1956</div>
              <div className={styles.timelineContent}>
                <h3>15 OLQs (4 Factors)</h3>
                <p>
                  Consolidated into 15 definitive qualities grouped across 4 factors, aligning qualities with 
                  high correlation and establishing consistent assessor reliability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOLD 3: INTERACTIVE BODY MAP & CORRELATION */}
      <section className={styles.foldCorrelation}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Personality Correlation Model</h2>
          <div className={styles.correlationGrid}>
            {/* BODY MAP CARD */}
            <div className={styles.stickFigureContainer}>
              <h2 className={styles.stickTitle}>Correlation with the Human Body</h2>
              
              <div className={styles.bodyMapWrapper}>
                {/* Minimal SVG Stick Figure */}
                <svg className={styles.stickSvg} viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Head */}
                  <circle 
                    cx="50" 
                    cy="32" 
                    r="12" 
                    stroke={activeFactorIndex === 0 ? "#d2a100" : "#c6c5af"} 
                    strokeWidth="2.5" 
                    className={activeFactorIndex === 0 ? styles.stickGlow : ""}
                    fill={activeFactorIndex === 0 ? "rgba(210, 161, 0, 0.15)" : "none"}
                  />
                  {/* Spine */}
                  <line x1="50" y1="44" x2="50" y2="120" stroke="#f2f0e1" strokeWidth="2.5" />
                  {/* Arms */}
                  <line x1="50" y1="65" x2="20" y2="85" stroke="#f2f0e1" strokeWidth="2" />
                  <line x1="50" y1="65" x2="80" y2="85" stroke="#f2f0e1" strokeWidth="2" />
                  {/* Heart Point Indicator */}
                  <circle 
                    cx="50" 
                    cy="75" 
                    r="4" 
                    fill={activeFactorIndex === 1 ? "#d2a100" : "#ff4d4d"} 
                    className={activeFactorIndex === 1 ? styles.stickGlow : ""}
                  />
                  {/* Gut Point Indicator */}
                  <circle 
                    cx="50" 
                    cy="100" 
                    r="4" 
                    fill={activeFactorIndex === 2 ? "#d2a100" : "#4caf50"} 
                    className={activeFactorIndex === 2 ? styles.stickGlow : ""}
                  />
                  {/* Legs */}
                  <line x1="50" y1="120" x2="25" y2="180" stroke="#f2f0e1" strokeWidth="2.5" />
                  <line x1="50" y1="120" x2="75" y2="180" stroke="#f2f0e1" strokeWidth="2.5" />
                </svg>

                {/* Hotspot buttons overlay */}
                <div 
                  onClick={() => setActiveFactorIndex(0)} 
                  className={`${styles.hotspot} ${styles.hotspotHead} ${activeFactorIndex === 0 ? styles.hotspotActive : ""}`}
                >
                  <span className={styles.hotspotDot}></span>
                  <span>Factor I: Head</span>
                </div>

                <div 
                  onClick={() => setActiveFactorIndex(1)} 
                  className={`${styles.hotspot} ${styles.hotspotHeart} ${activeFactorIndex === 1 ? styles.hotspotActive : ""}`}
                >
                  <span className={styles.hotspotDot} style={{ background: "#ff4d4d", boxShadow: "0 0 8px #ff4d4d" }}></span>
                  <span>Factor II: Heart</span>
                </div>

                <div 
                  onClick={() => setActiveFactorIndex(2)} 
                  className={`${styles.hotspot} ${styles.hotspotGut} ${activeFactorIndex === 2 ? styles.hotspotActive : ""}`}
                >
                  <span className={styles.hotspotDot} style={{ background: "#4caf50", boxShadow: "0 0 8px #4caf50" }}></span>
                  <span>Factor III: Gut</span>
                </div>

                <div 
                  onClick={() => setActiveFactorIndex(3)} 
                  className={`${styles.hotspot} ${styles.hotspotLimbs} ${activeFactorIndex === 3 ? styles.hotspotActive : ""}`}
                >
                  <span className={styles.hotspotDot} style={{ background: "#9c27b0", boxShadow: "0 0 8px #9c27b0" }}></span>
                  <span>Factor IV: Limbs</span>
                </div>
              </div>
            </div>

            {/* FACTOR DETAIL INTERACTIVE BOX */}
            <div className={styles.factorOverviewCard}>
              <div className={styles.factorHeader}>
                <span className={styles.factorNum}>{activeFactor.num} — {activeFactor.bodyPart}</span>
                <h2 className={styles.factorName}>{activeFactor.name}</h2>
                <span className={styles.factorQuote}>“{activeFactor.alias}”</span>
              </div>

              <div className={styles.factorBody}>
                <h4>Core Qualities in this Factor</h4>
                <div className={styles.qualitiesGrid}>
                  {activeFactor.qualities.map((qual, idx) => (
                    <div key={idx} className={styles.qualityItem}>
                      {qual.name}
                    </div>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(198, 197, 175, 0.8)" }}>
                {activeFactor.quote} Selection assessors evaluate these qualities during tasks designed specifically 
                to trace behavior patterns mapped to this psychological dimension.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOLD 4: 15 OLQS DETAILED LIST */}
      <section className={styles.foldMatrix}>
        <div className={styles.container}>
          <h2 className={styles.olqsSectionTitle}>Detailed Matrix of the 15 OLQs</h2>
          <div className={styles.factorBlocks}>
            {factorsData.map((factor, fIdx) => (
              <div key={fIdx} className={styles.factorBlock}>
                <div className={styles.factorBlockHeader}>
                  <h3 className={styles.factorBlockTitle}>
                    {factor.num}: {factor.name} ({factor.bodyPart})
                  </h3>
                  <span className={styles.factorQuote} style={{ fontSize: "14px" }}>
                    Assessment Profile: <strong>{factor.alias}</strong>
                  </span>
                </div>

                <div className={styles.olqCards}>
                  {factor.qualities.map((olq, oIdx) => (
                    <div key={oIdx} className={styles.olqCard}>
                      <div className={styles.olqCardHeader}>
                        <span className={styles.olqName}>{olq.name}</span>
                        <span className={styles.olqShort}>{olq.short}</span>
                      </div>
                      <p className={styles.olqDesc}>{olq.desc}</p>
                      
                      {olq.subComponents && (
                        <div className={styles.subComponents}>
                          {olq.subComponents.map((sub, sIdx) => (
                            <div key={sIdx} className={styles.subComponentItem}>
                              <span className={styles.subName}>{sub.name}</span>
                              <span className={styles.subDesc}>{sub.desc}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOLD 5: QUOTES ROW */}
      <section className={styles.foldQuotes}>
        <div className={styles.container}>
          <div className={styles.quotesGrid}>
            <div className={styles.quoteCard}>
              <div className={styles.quoteIcon}>
                <FaQuoteLeft />
              </div>
              <p className={styles.quoteText}>
                "Courage is not the absence of fear, but rather the judgment that something else is more important than fear."
              </p>
              <div className={styles.quoteAuthor}>Factor IV — Courage Reference</div>
            </div>

            <div className={styles.quoteCard}>
              <div className={styles.quoteIcon}>
                <FaQuoteLeft />
              </div>
              <p className={styles.quoteText}>
                "Valour is stability, not of legs and arms but of courage and soul."
              </p>
              <div className={styles.quoteAuthor}>Factor IV — Endurance Reference</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
