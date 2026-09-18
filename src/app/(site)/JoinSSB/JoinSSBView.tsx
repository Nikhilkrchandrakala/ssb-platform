"use client";

import { useRouter } from "next/navigation";
import { FaLaptop, FaBuilding, FaArrowRight, FaArrowLeft, FaCheckCircle, FaCompass } from "react-icons/fa";
import styles from "@/style/JoinSSBPage.module.css";

const CHOICES = [
  {
    key: "online",
    icon: FaLaptop,
    title: "Online Batches",
    description: "Live online SSB Hackathon and individual modules, from wherever you are.",
    features: ["Full 12-day Hackathon or single modules", "Screening, Psychology, Interview, GTO", "Learn live from anywhere"],
    href: "/Batches",
  },
  {
    key: "offline",
    icon: FaBuilding,
    title: "Offline Batches",
    description: "In-person training at our center, with direct hands-on mentorship.",
    features: ["Pay ₹5,000 online to register", "Balance settled at the center", "In-person, hands-on practice"],
    href: "/OfflineBatches",
  },
];

export default function JoinSSBView() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <button className={styles.backLink} onClick={() => router.push("/")}>
        <FaArrowLeft /> Home
      </button>

      <span className={styles.eyebrow}>
        <FaCompass /> Choose Your Path
      </span>
      <h1 className={styles.title}>How would you like to train?</h1>
      <p className={styles.subtitle}>
        Both paths are led by our expert SSB trainers — pick whichever fits how you want to prepare.
      </p>

      <div className={styles.grid}>
        {CHOICES.map((choice) => {
          const Icon = choice.icon;
          return (
            <div key={choice.key} className={styles.card} onClick={() => router.push(choice.href)}>
              <div className={styles.iconBadge}>
                <Icon />
              </div>
              <h3 className={styles.cardTitle}>{choice.title}</h3>
              <p className={styles.cardDescription}>{choice.description}</p>
              <ul className={styles.featureList}>
                {choice.features.map((f) => (
                  <li key={f}>
                    <FaCheckCircle /> {f}
                  </li>
                ))}
              </ul>
              <button className={styles.cardCta}>
                Browse Batches <FaArrowRight />
              </button>
            </div>
          );
        })}
      </div>

      <p className={styles.footNote}>Not sure which one? You can always switch between the two later.</p>
    </div>
  );
}
