"use client";

import { useEffect, useState } from "react";
import styles from "@/style/OfficerEntriesChart.module.css";

export default function OfficerEntriesChart() {
  const [showTitle, setShowTitle] = useState(false);
  const [showCard1, setShowCard1] = useState(false);
  const [showCard2, setShowCard2] = useState(false);
  const [showCard3, setShowCard3] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowTitle(true), 150);
    const t2 = setTimeout(() => setShowCard1(true), 900);
    const t3 = setTimeout(() => setShowCard2(true), 1200);
    const t4 = setTimeout(() => setShowCard3(true), 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <div className={styles.chartSection}>
      {/* TITLE AREA */}
      <div className={`${styles.titleArea} ${showTitle ? styles.show : ""}`}>
        <div className={styles.subtitle}>Ways to become an officer</div>
        <h1 className={styles.mainTitle}>Different Officer Entries in the Indian Armed Forces</h1>
        <div className={styles.legend}>
          <span>SSC — Short Service Commission</span>
          <span className={styles.dotSeparator}>·</span>
          <span>PC — Permanent Commission</span>
        </div>
      </div>

      {/* ROADMAP TIMELINE */}
      <div className={`${styles.timelineWrapper} ${showTitle ? styles.show : ""}`}>
        <div className={styles.timelineLine}></div>
        <div className={styles.timelineNode}>
          <span className={styles.nodeNum}>01</span>
          <span className={styles.nodeLabel}>After 10+2</span>
        </div>
        <div className={styles.timelineNode}>
          <span className={styles.nodeNum}>02</span>
          <span className={styles.nodeLabel}>After Graduation</span>
        </div>
        <div className={styles.timelineNode}>
          <span className={styles.nodeNum}>03</span>
          <span className={styles.nodeLabel}>Service Entry</span>
        </div>
      </div>

      {/* GRID */}
      <div className={styles.grid}>
        {/* CARD 1: AFTER 10+2 */}
        <div className={`${styles.card} ${showCard1 ? styles.show : ""}`}>
          <div className={styles.cardHeader}>
            <span className={styles.headerDot}></span>
            <span className={styles.headerText}>After 10+2</span>
          </div>
          <div className={styles.cardBody}>
            {/* Written Exam */}
            <div className={styles.entryTypeBlock}>
              <span className={styles.badgeHeader}>Written Exam</span>
              <div className={styles.entryList}>
                <div className={styles.itemGroup}>
                  <span className={styles.entryButton}>NDA/NA (UPSC) — PC</span>
                  <div className={styles.branchList}>
                    <div className={styles.branchDesc}>After 3 years of training at NDA:</div>
                    <div className={styles.goldBox}>
                      <div>NDA → Army → IMA</div>
                      <div>NDA → Navy → INA</div>
                      <div>NDA → Air Force → AFA</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Non-Written Exam */}
            <div className={styles.entryTypeBlock}>
              <span className={styles.badgeHeader}>Non-Written Exam</span>
              <div className={styles.entryList}>
                <div className={styles.itemGroup}>
                  <span className={styles.entryButton}>10+2 TES (Army) — PC</span>
                  <div className={styles.branchList}>
                    <span className={styles.goldBadge}>CME (Pune), IMA</span>
                  </div>
                </div>
                <div className={styles.itemGroup}>
                  <span className={styles.entryButton}>10+2 B.Tech (Navy) — PC</span>
                  <div className={styles.branchList}>
                    <span className={styles.goldBadge}>INA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: AFTER GRADUATION */}
        <div className={`${styles.card} ${showCard2 ? styles.show : ""}`}>
          <div className={styles.cardHeader}>
            <span className={styles.headerDot}></span>
            <span className={styles.headerText}>After Graduation</span>
          </div>
          <div className={styles.cardBody}>
            {/* Written Exam */}
            <div className={styles.entryTypeBlock}>
              <span className={styles.badgeHeader}>Written Exam</span>
              <div className={styles.entryList}>
                <div className={styles.itemGroup}>
                  <span className={styles.entryButton}>CDSE (UPSC)</span>
                  <div className={styles.branchList}>
                    <div className={styles.branchDesc}>
                      <div>Army (PC) → IMA</div>
                      <div>Army (SSC) → OTA</div>
                      <div>Navy (PC) → INA</div>
                      <div>IAF (PC) → AFA</div>
                    </div>
                  </div>
                </div>
                <div className={styles.itemGroup}>
                  <span className={styles.entryButton}>AFCAT (Non UPSC)</span>
                  <div className={styles.branchList}>
                    <div className={styles.branchDesc}>
                      Flying (PC) · Logistics (SSC) · Meteorology (SSC) · Administration (SSC)
                    </div>
                    <span className={styles.goldBadge}>AFA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Non-Written Exam */}
            <div className={styles.entryTypeBlock}>
              <span className={styles.badgeHeader}>Non-Written Exam</span>
              <div className={styles.entryList}>
                <div className={styles.itemGroup}>
                  <span className={styles.entryButton}>NCC Special</span>
                  <div className={styles.branchList}>
                    <div className={styles.flexBadges}>
                      <span className={styles.flatBadge}>Army</span>
                      <span className={styles.flatBadge}>Navy</span>
                      <span className={styles.flatBadge}>Air Force</span>
                    </div>
                    <div className={styles.branchDesc}>Candidates with NCC 'C' Certificate</div>
                    <div className={styles.flexBadges}>
                      <span className={styles.goldBadge}>OTA</span>
                      <span className={styles.goldBadge}>INA</span>
                      <span className={styles.goldBadge}>AFA</span>
                    </div>
                  </div>
                </div>

                <div className={styles.itemGroup}>
                  <span className={styles.entryButton}>SSC (Navy)</span>
                  <div className={styles.branchList}>
                    <div className={styles.branchDesc}>
                      Executive · Electrical · Engineering · Pilot · Naval Air Ops · Logistics · Naval Armament · Constructor · Education · Submarine · IT
                    </div>
                    <span className={styles.goldBadge}>INA</span>
                  </div>
                </div>

                <div className={styles.itemGroup}>
                  <span className={styles.entryButton}>Technical Graduate Course (Army)</span>
                  <div className={styles.branchList}>
                    <span className={styles.goldBadge}>IMA</span>
                  </div>
                </div>

                <div className={styles.itemGroup}>
                  <span className={styles.entryButton}>Remount Veterinary Corps (Army)</span>
                  <div className={styles.branchList}>
                    <span className={styles.goldBadge}>RVCP</span>
                  </div>
                </div>

                <div className={styles.itemGroup}>
                  <span className={styles.entryButton}>Judge Advocate General (Army)</span>
                  <div className={styles.branchList}>
                    <span className={styles.badgeHeader} style={{ fontSize: "11px", marginBottom: "6px" }}>LLB + CLAT PG</span>
                    <div className={styles.flexBadges} style={{ gap: "12px" }}>
                      <div className={styles.miniCol}>
                        <span className={styles.flatBadge}>Army</span>
                        <span className={styles.goldBadge}>OTA</span>
                      </div>
                      <div className={styles.miniCol}>
                        <span className={styles.flatBadge}>Navy</span>
                        <span className={styles.goldBadge}>INA</span>
                      </div>
                      <div className={styles.miniCol}>
                        <span className={styles.flatBadge}>Air Force</span>
                        <span className={styles.goldBadge}>AFA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: SERVICE ENTRY */}
        <div className={`${styles.card} ${showCard3 ? styles.show : ""}`}>
          <div className={styles.cardHeader}>
            <span className={styles.headerDot}></span>
            <span className={styles.headerText}>Service Entry</span>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.entryList} style={{ borderLeft: "none", marginLeft: 0, paddingLeft: 0 }}>
              <div className={styles.itemGroup}>
                <span className={styles.entryButton}>Army</span>
                <div className={styles.branchList}>
                  <div className={styles.branchDesc}>Army Cadet College · Special Commission Officer · Permanent Commission / Special List</div>
                  <span className={styles.goldBadge}>IMA</span>
                </div>
              </div>

              <div className={styles.itemGroup}>
                <span className={styles.entryButton}>Navy</span>
                <div className={styles.branchList}>
                  <div className={styles.branchDesc}>Commission Worthy · Special Duties List</div>
                  <span className={styles.goldBadge}>INA</span>
                </div>
              </div>

              <div className={styles.itemGroup}>
                <span className={styles.entryButton}>Air Force</span>
                <div className={styles.branchList}>
                  <div className={styles.branchDesc}>Special Entry Commission</div>
                  <span className={styles.goldBadge}>AFA</span>
                </div>
              </div>

              <div className={styles.itemGroup}>
                <span className={styles.entryButton}>Army (AMC)</span>
                <div className={styles.branchList}>
                  <span className={styles.flatBadge} style={{ width: "fit-content", marginBottom: "6px" }}>AMC-NT</span>
                  <span className={styles.goldBadge}>AMC Centre &amp; College, Lucknow</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
