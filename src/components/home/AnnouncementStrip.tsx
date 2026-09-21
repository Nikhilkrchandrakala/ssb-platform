import Link from "next/link";
import styles from "@/style/AnnouncementStrip.module.css";

export default function AnnouncementStrip() {
  return (
    <div className={styles.strip}>
      <p className={styles.text}>SSB with ISV is now offline. Nagpur Batch 1 begins 26th October 2026.</p>
      <Link href="/ssb-offline-coaching" className={styles.btn}>
        Click to know more →
      </Link>
    </div>
  );
}
