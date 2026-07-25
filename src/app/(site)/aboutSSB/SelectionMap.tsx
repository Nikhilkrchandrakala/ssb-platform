"use client";

import { useState } from "react";
import styles from "@/style/SelectionMap.module.css";
import IndiaSVG, { type HoveredRegion, type SelectionTab } from "./IndiaSVG";

export default function SelectionMap() {
  const [activeTab, setActiveTab] = useState<SelectionTab>("army");
  const [hoveredRegion, setHoveredRegion] = useState<HoveredRegion | null>(null);

  const selectionCenters: Record<SelectionTab, string[]> = {
    army: [
      "31 | 32 – Selection Centre North, Jalandhar",
      "11 | 14 | 18 | 19 | 34 – Selection Centre East, Prayagraj",
      "20 | 21 | 22 – Selection Centre Central, Bhopal",
      "17 | 24 – Selection Centre South, Bangalore",
    ],

    airforce: [
      "1 AFSB – Dehradun",
      "2 AFSB – Mysore",
      "3 AFSB – Gandhinagar",
      "4 AFSB – Varanasi",
      "5 AFSB – Guwahati",
    ],

    navy: ["NSB Vizag", "33 SSB, Bhopal", "SSB (Kolkata)", "12 SSB, Bangalore"],
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>
        Services Selection Boards & <br />
        Air Force Selection Boards of India
      </h2>

      {/* TABS */}
      <div className={styles.tabs}>
        {(["army", "navy", "airforce"] as SelectionTab[]).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.active : ""}`}
            onClick={() => {
              setActiveTab(tab);
              setHoveredRegion(null);
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {/* MAP */}
        <div className={styles.mapWrapper}>
          <div className={styles.mapContainer}>
            <IndiaSVG activeTab={activeTab} hoveredRegion={hoveredRegion} setHoveredRegion={setHoveredRegion} />
          </div>
        </div>

        <div className={styles.SelectionMapCon}>
          {selectionCenters[activeTab]?.map((item, index) => (
            <p style={{ marginTop: "5px" }} key={index} className={styles.indexItem}>
              {item}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
