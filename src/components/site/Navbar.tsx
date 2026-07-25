"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/style/Navbar.module.css";
import { IoMenu } from "react-icons/io5";
import Sidebar from "./Sidebar";

interface NavbarProps {
  video?: { src: string };
  subtitle?: React.ReactNode;
  title?: React.ReactNode;
  title1?: React.ReactNode;
  subtitleTwo?: React.ReactNode;
  banner?: string;
  text?: React.ReactNode;
}

export default function Navbar({ video, subtitle, title, title1, subtitleTwo, banner, text }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className={`${styles.pageWrapper} ${open ? styles.sidebarOpen : ""}`}>
      <video className={styles.bgVideo} autoPlay muted loop playsInline preload="auto">
        <source src={video?.src} />
      </video>

      <div className={styles.pageWrapperMain}>
        <section className={styles.heroSection}>
          <div className={styles.topBar}>
            <img src="/assets/logo/ISV.webp" alt="Logo" className={styles.logo} onClick={() => router.push("/")} />
            <IoMenu className={styles.menuIcon} onClick={() => setOpen(true)} />
          </div>

          <header className={styles.header}>
            <div className={styles.subtitle}>{subtitle}</div>

            {banner && (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <img src={banner} alt="banner" style={{ width: "250px" }} />
              </div>
            )}

            <h1 className={styles.title}>
              <span className={styles.military}>{title}</span> <span className={styles.leadership}>{title1}</span>
            </h1>

            <div className={styles.subtitleTwo}>{subtitleTwo}</div>

            {text && <div className={styles.text}>{text}</div>}
          </header>
        </section>

        <Sidebar open={open} onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}
