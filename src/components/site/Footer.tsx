"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "@/style/Footer.module.css";

interface ContactSettings {
  whatsappNumber?: string;
  callNumber?: string;
}

function formatPhoneNumber(num?: string) {
  if (num && num.length === 10) return `${num.substring(0, 5)} ${num.substring(5)}`;
  return num;
}

export default function Footer({ contactSettings }: { contactSettings: ContactSettings | null }) {
  const router = useRouter();
  const [hideJoinBtn, setHideJoinBtn] = useState(true);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Reads localStorage on mount (unavailable during SSR) then re-reads on
    // the cross-component consent-change event dispatched by CookieBanner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHideJoinBtn(!localStorage.getItem("cookieConsent"));
    const handleConsentChange = () => setHideJoinBtn(!localStorage.getItem("cookieConsent"));
    window.addEventListener("cookieConsentChanged", handleConsentChange);
    return () => window.removeEventListener("cookieConsentChanged", handleConsentChange);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.05 });
    const el = footerRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, []);

  const whatsappNumRaw = contactSettings?.whatsappNumber || "8420422821";
  const callNumRaw = contactSettings?.callNumber || "7483617249";
  const whatsappNumFormatted = formatPhoneNumber(whatsappNumRaw);
  const callNumFormatted = formatPhoneNumber(callNumRaw);

  const openZohoChat = () => {
    if (window.$zoho?.salesiq) {
      window.$zoho.salesiq.floatwindow?.visible("show");
    }
  };

  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer} ref={footerRef}>
      <div className={styles.container}>
        <div className={styles.logoBox}>
          <img src="/assets/logo/ISV.webp" alt="Joint Services Academy" className={styles.logo} />
          <div className={styles.socials}>
            <a href="https://www.youtube.com/@ssbwithisv" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <i className="fa fa-youtube-play"></i>
            </a>
            <a href="https://www.linkedin.com/company/ssbwithisv/posts" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <i className="fa fa-linkedin-square"></i>
            </a>
            <a href="https://www.instagram.com/ssbwithisv/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i className="fa fa-instagram"></i>
            </a>
            <a href="https://www.facebook.com/ssbwithisv/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i className="fa fa-facebook"></i>
            </a>
          </div>
        </div>

        {!hideJoinBtn && !isFooterVisible && (
          <div className="modern-floating-dock-left">
            <button className="dock-join-btn" onClick={() => router.push("/Batches")}>
              <span>Join SSB Batch</span>
            </button>
          </div>
        )}

        {!hideJoinBtn && !isFooterVisible && (
          <div className="modern-floating-dock-right">
            <div className="dock-actions">
              <button onClick={openZohoChat} className="dock-icon-btn chat" title="Chat with us" aria-label="Chat with us">
                <i className="fa fa-comments"></i>
              </button>
              <a href={`https://wa.me/91${whatsappNumRaw}`} target="_blank" rel="noopener noreferrer" className="dock-icon-btn whatsapp" aria-label="Chat on WhatsApp">
                <i className="fa fa-whatsapp"></i>
              </a>
            </div>
          </div>
        )}

        <div className={styles.links}>
          <h3 className="fs- fw-bold">Useful Links</h3>
          <ul>
            <li onClick={() => router.push("/")}>Home</li>
            <li onClick={() => router.push("/aboutSSB")}>What is SSB?</li>
            <li onClick={() => router.push("/ContactUS")}>Enquire with us</li>
            <li onClick={() => router.push("/PrivacyPolicy")}>Privacy policy</li>
          </ul>
        </div>

        <div className={styles.links}>
          <h3>Our Services</h3>
          <ul>
            <li onClick={() => router.push("/Courses")}>Courses</li>
            <li onClick={() => router.push("/Magazine")}>Magazine</li>
            <li onClick={() => router.push("/blogs")}>Blogs</li>
          </ul>
        </div>

        <div className={styles.contact}>
          <div>
            <h3>Contact Us</h3>

            <div className={styles.contactRow}>
              <a href={`https://wa.me/91${whatsappNumRaw}`} target="_blank" rel="noopener noreferrer" className={styles.contactItem}>
                <p>
                  <i className="fa fa-whatsapp"></i> Whatsapp only +91 {whatsappNumFormatted}
                </p>
              </a>

              <a href={`tel:+91${callNumRaw}`} className={styles.contactItem}>
                <p>
                  <i className="fa fa-phone"></i> Call only +91 {callNumFormatted}, +91 90246 67319
                </p>
              </a>

              <p>
                <i className="fa fa-envelope"></i> info@ssbwithisv.in
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.copyrightBox}>
        <span className={styles.copy}>© Copyright 2021 – {year} SSB with ISV, CS Joint Services Academy Pvt. Ltd.</span>
      </div>
      <div className={styles.watermarkText}>SSB with ISV</div>
    </footer>
  );
}
