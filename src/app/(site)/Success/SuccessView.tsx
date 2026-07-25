"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BiCheckCircle } from "react-icons/bi";
import confetti from "canvas-confetti";
import styles from "@/style/SuccessPage.module.css";

/**
 * Ported from legacy `components/SuccessPage.jsx`. Deliberately dropped: the 150-second
 * countdown timer and its UI (its JSX section was already empty/commented-out in legacy —
 * the timer state existed but was never rendered), and the `location.state` /
 * `lastPaymentDetails` localStorage plumbing (legacy never passed router state into this
 * route — `navigate("/Success")` in the checkout flow takes no state — so that code path
 * was always dead). What's kept, matching actual legacy behaviour: the confetti burst and
 * the redirect home after a few seconds.
 */
export default function SuccessView() {
  const router = useRouter();

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#d2a100", "#ffd700", "#ffed4a"],
    });

    const timer = setTimeout(() => {
      router.push("/");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className={styles.successPage}>
      <div className={styles.successContainer}>
        <div className={styles.checkmarkWrapper}>
          <div className={styles.checkmarkCircle}>
            <BiCheckCircle className={styles.checkmarkIcon} />
          </div>
        </div>

        <h1 className={styles.successTitle}>Payment Successful!</h1>
        <p className={styles.successMessage}>
          Thank you for your purchase. Your transaction has been completed successfully.
        </p>
      </div>
    </div>
  );
}
