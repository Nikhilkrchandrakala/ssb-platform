"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/style/Navbar.module.css";
import useCountUp from "./useCountUp";

interface CircularCardProps {
  number: number;
  title: string;
  timeDel: string | number;
  index: number;
}

export default function CircularCard({ number, title, timeDel, index }: CircularCardProps) {
  const { ref, count } = useCountUp(Number(number), 2000);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const hasTriggeredInitial = useRef(false);

  const durationSec = Number(timeDel) || 2;

  const runAnimation = () => {
    setRotation((prev) => prev + 360);
  };

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggeredInitial.current) {
          hasTriggeredInitial.current = true;
          timer = setTimeout(() => {
            runAnimation();
          }, index * 500);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [index]);

  return (
    <div className={styles.containerOfCircle}>
      <div className={styles.wrapper}>
        <div
          ref={cardRef}
          className={styles.circle}
          onMouseEnter={runAnimation}
        >
          <div
            className={styles.orbit}
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: rotation > 0 ? `transform ${durationSec}s ease-in-out` : "none",
            }}
          >
            <div className={styles.dot}></div>
          </div>

          <div ref={ref} className={styles.center}>
            <span className={styles.number}>{count}</span>
            <span className={styles.plus}>+</span>
          </div>
        </div>
      </div>

      <p className={styles.circleOutSideContent}>{title}</p>
    </div>
  );
}
