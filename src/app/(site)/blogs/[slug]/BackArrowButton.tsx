"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BiArrowBack } from "react-icons/bi";
import styles from "@/style/BlogDetails.module.css";

export default function BackArrowButton() {
  const router = useRouter();
  const [showBackArrow, setShowBackArrow] = useState(false);

  useEffect(() => {
    const headerHeight = 500;
    const handleScroll = () => {
      setShowBackArrow(window.scrollY > headerHeight);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`${styles.arrowBackContainer} ${showBackArrow ? styles.visible : styles.hidden}`}>
      <div className={styles.arrowBackBtn}>
        <BiArrowBack style={{ cursor: "pointer" }} onClick={() => router.back()} title="Go back" />
      </div>
    </div>
  );
}
