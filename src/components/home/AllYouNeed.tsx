"use client";

import { useRouter } from "next/navigation";
import CustomButton from "@/components/site/CustomButton";
import HeadingTwo from "@/components/site/HeadingTwo";
import styles from "@/style/AllYouNeed.module.css";

const AllYouNeed = () => {
  const router = useRouter();
  const handelClick = () => {
    router.push("/aboutSSB");
  };

  return (
    <section className={styles.section}>
      {/* BACKGROUND IMAGE */}
      <div className={styles.bgImage}></div>

      {/* LEFT FOREGROUND IMAGE */}
      <div className={styles.leftImage}></div>

      {/* CONTENT */}
      <div className={styles.contentMain}>
        <div className={styles.content}>
          <div className={styles.heading}>
            <HeadingTwo h1="All you need to know" t1={" about SSB"} />
          </div>

          <div className={styles.infoBox}>
            <div className={styles.sectionGlowTwo}></div>

            <p>
              The Services Selection Board (SSB) is not an exam, it is a five-day leadership assessment designed to
              identify shades of Officer-Like-Qualities in candidates aspiring to join the Indian Armed Forces in
              the officer cadre. From psychological test and group situational tasks to personal interviews, the
              SSB process.
            </p>

            <CustomButton text={"KNOW MORE"} onClick={handelClick} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AllYouNeed;
