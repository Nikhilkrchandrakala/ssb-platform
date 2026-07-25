import styles from "@/style/Timeline.module.css";

export default function DaySchedule() {
  return (
    <div className={styles.container}>
      <h1 className={styles.header}>Day wise assessment schedule</h1>

      <div className={styles.timelineWrapper}>
        {/* ROW 1 */}
        <div className={styles.row}>
          <div className={styles.box}>DAY 1 - STAGE 1 TESTING (OIR & PPDT)</div>
          <div className={styles.connectorH}>
            <div className={styles.dot} />
          </div>
          <div className={styles.box}>DAY 2 - PSYCH TESTS (TAT, WAT, SRT, SDT)</div>
          <div className={styles.connectorH}>
            <div className={styles.dot} />
          </div>
          <div className={styles.textNode}>Personal Interview</div>
          {/* Vertical Drop 1 */}
          <div className={styles.verticalDropRight}>
            <div className={styles.dotV} />
          </div>
        </div>

        {/* ROW 2 (Flowing Right to Left) */}
        <div className={`${styles.row} ${styles.rowReverse}`}>
          <div className={styles.box}>DAY 3 - GTO 1 DAY (GD, GPE, PGT, GOR, HGT, LECTURETTE)</div>
          <div className={styles.connectorH}>
            <div className={styles.dot} />
          </div>
          <div className={styles.textNode}>Personal Interview</div>
          <div className={styles.connectorH}>
            <div className={styles.dot} />
          </div>
          <div className={styles.box}>DAY 4 - GTO 2 DAY (IO, CT, FGT)</div>
          {/* Vertical Drop 2 */}
          <div className={styles.verticalDropLeft}>
            <div className={styles.dotV} />
          </div>
        </div>

        {/* ROW 3 */}
        <div className={styles.LastRow}>
          <div className={styles.textNode}>Personal Interview</div>
          <div className={styles.connectorH}>
            <div className={styles.dot} />
          </div>
          <div className={styles.box}>DAY 5 - BOARD CONFERENCE</div>
        </div>
      </div>
    </div>
  );
}
