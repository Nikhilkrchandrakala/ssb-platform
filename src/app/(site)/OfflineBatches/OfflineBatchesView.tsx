"use client";

import { useRouter } from "next/navigation";
import { FaArrowLeft, FaArrowRight, FaClock, FaLaptop } from "react-icons/fa";
import { safeBack } from "@/lib/safeBack";
import styles from "@/style/JoinSSBPage.module.css";

export default function OfflineBatchesView() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <button
        type="button"
        className={styles.backLink}
        onClick={() => safeBack(router, "/JoinSSB")}
        aria-label="Go back"
      >
        <FaArrowLeft /> <span>Back</span>
      </button>

      <span className={styles.eyebrow}>
        <FaClock /> Offline Batches
      </span>
      <h1 className={styles.title}>Coming Soon</h1>
      <p className={styles.subtitle}>
        Our offline SSB batches are currently being scheduled. In the meantime, join our live online mentoring
        batches with DIPR certified ex-SSB assessors and VTX™ virtual GTO ground practice.
      </p>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
        <button
          type="button"
          className={styles.cardCta}
          style={{ maxWidth: "300px", padding: "14px 28px" }}
          onClick={() => router.push("/Batches")}
        >
          <FaLaptop /> Browse Online Batches <FaArrowRight />
        </button>
      </div>
    </div>
  );
}
