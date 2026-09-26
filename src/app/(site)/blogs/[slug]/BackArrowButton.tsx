"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BiArrowBack } from "react-icons/bi";
import { safeBack } from "@/lib/safeBack";
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
      <button
        type="button"
        className={styles.arrowBackBtn}
        onClick={() => safeBack(router, "/blogs")}
        aria-label="Go back to blogs"
        title="Go back"
      >
        <BiArrowBack />
      </button>
    </div>
  );
}
