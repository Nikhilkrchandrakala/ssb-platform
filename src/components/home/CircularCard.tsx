"use client";

import { motion, useAnimationControls } from "framer-motion";
import styles from "@/style/Navbar.module.css";
import useCountUp from "./useCountUp";

interface CircularCardProps {
  number: number;
  title: string;
  timeDel: string | number;
  index: number;
}

export default function CircularCard({ number, title, timeDel, index }: CircularCardProps) {
  const controls = useAnimationControls();
  const { ref, count } = useCountUp(Number(number), 2000);

  const runAnimation = () => {
    controls.set({ rotate: 0 });

    controls.start({
      rotate: 360,
      transition: {
        duration: Number(timeDel),
        ease: "easeInOut",
      },
    });
  };

  const handleViewportEnter = () => {
    // stagger logic
    setTimeout(() => {
      runAnimation();
    }, index * 600); // 0ms, 600ms, 1200ms...
  };

  return (
    <div className={styles.containerOfCircle}>
      <div className={styles.wrapper}>
        <motion.div
          className={styles.circle}
          onMouseEnter={runAnimation}
          onViewportEnter={handleViewportEnter}
          viewport={{ amount: 0.5 }}
        >
          <motion.div className={styles.orbit} animate={controls}>
            <div className={styles.dot}></div>
          </motion.div>

          <div ref={ref} className={styles.center}>
            <span className={styles.number}>{count}</span>
            <span className={styles.plus}>+</span>
          </div>
        </motion.div>
      </div>

      <p className={styles.circleOutSideContent}>{title}</p>
    </div>
  );
}
