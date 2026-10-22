"use client";

import { useRouter } from "next/navigation";
import HeadingTwo from "@/components/site/HeadingTwo";
import CustomButton from "@/components/site/CustomButton";
import styles from "@/style/CommunicationSection.module.css";
import {
  FaCalendarAlt,
  FaClock,
  FaMicrophoneAlt,
  FaCheckCircle,
  FaComments,
  FaBrain,
  FaBriefcase,
  FaBullhorn,
} from "react-icons/fa";

const TOPICS = [
  {
    number: "TOPIC 01",
    title: "Communication Theory, Grammar & Phonetics",
    icon: FaComments,
    desc: "The building blocks: how communication actually works, common spoken-grammar errors, and the sounds and stress patterns that shape clear pronunciation.",
  },
  {
    number: "TOPIC 02",
    title: "Thought Structure, Clichés & Storytelling",
    icon: FaBrain,
    desc: "Learning to organize ideas on the spot, cut filler words and corporate jargon, refine accent for clarity, and tell stories that hold attention.",
  },
  {
    number: "TOPIC 03",
    title: "Professional Communication & Interview Mastery",
    icon: FaBriefcase,
    desc: "STAR-format answers for interviews, formal vs. casual workplace tone, giving and receiving feedback, and addressing seniors, peers, and juniors appropriately.",
  },
  {
    number: "TOPIC 04",
    title: "Public Address & Crisis Communication",
    icon: FaBullhorn,
    desc: "Speaking to larger audiences, presenting with confidence, and staying composed while de-escalating tense, high-stakes situations.",
  },
];

export default function CommunicationSection() {
  const router = useRouter();

  return (
    <section className={styles.section} id="communication-bootcamp-section">
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <div className={styles.badge}>
              <span className={styles.newBadgeTag}>NEW</span>
              <span className={styles.badgeText}>
                Online Soft Skills &amp; Communication Mastery
              </span>
            </div>
            <HeadingTwo
              h1="4 Weeks"
              t1="Soft Skills Bootcamp"
              className={styles.titleHeading}
            />
            <h3 className={styles.leadSubtitle}>
              A 4-Week Program in Disciplined, Confident Speech
            </h3>
            <p className={styles.leadDescription}>
              A structured online program for anyone preparing to speak with
              clarity and authority — in classrooms, interviews, or the
              workplace. Built on repetition, correction, and live
              accountability rather than passive lectures.
            </p>
          </div>
        </div>

        {/* Feature Pills */}
        <div className={styles.metaPills}>
          <div className={styles.pill}>
            <FaCalendarAlt className={styles.pillIcon} />
            <span>4 Weeks Intensive (Mon – Fri)</span>
          </div>
          <div className={styles.pill}>
            <FaClock className={styles.pillIcon} />
            <span>9:30 AM – 10:30 AM Daily + Alt Saturday Drills</span>
          </div>
          <div className={styles.pill}>
            <FaMicrophoneAlt className={styles.pillIcon} />
            <span>Entry Baseline &amp; Graded Capstone</span>
          </div>
          <div className={styles.pill}>
            <FaCheckCircle className={styles.pillIcon} />
            <span>Live Repetition &amp; Real Conditions</span>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className={styles.topicsGrid}>
          {TOPICS.map((topic) => {
            const Icon = topic.icon;
            return (
              <div key={topic.number} className={styles.topicCard}>
                <div className={styles.topicHeader}>
                  <span className={styles.topicNumber}>{topic.number}</span>
                  <div className={styles.topicIconBox}>
                    <Icon />
                  </div>
                </div>
                <h4 className={styles.topicTitle}>{topic.title}</h4>
                <p className={styles.topicDesc}>{topic.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Mentor Callout & CTA Banner */}
        <div className={styles.bottomBanner}>
          <div className={styles.mentorInfo}>
            <div className={styles.mentorAvatar}>
              <img
                src="/assets/img/mentors/N2.jpeg"
                alt="Lt. Commander Niati Hirway (Retd.)"
                loading="lazy"
              />
            </div>
            <div className={styles.mentorText}>
              <span className={styles.mentorRole}>Lead Course Mentor</span>
              <h4>Lt. Commander Niati Hirway (Retd.)</h4>
              <p className={styles.mentorSub}>
                Ex-Naval Air Traffic Control Officer
              </p>
            </div>
          </div>

          <div className={styles.actionArea}>
            <CustomButton
              text="EXPLORE BOOTCAMP & BATCHES"
              onClick={() => router.push("/SoftskillBootcamp")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
