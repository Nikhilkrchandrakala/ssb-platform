import Link from "next/link";
import styles from "@/style/AnnouncementStrip.module.css";

export default function AnnouncementStrip() {
  return (
    <div className={styles.strip}>
      <p className={styles.text}>New Online SSB Batches are open! Train live with DIPR certified ex-SSB assessors.</p>
      <Link href="/Batches" className={styles.btn}>
        Explore Batches →
      </Link>
    </div>
  );
}
