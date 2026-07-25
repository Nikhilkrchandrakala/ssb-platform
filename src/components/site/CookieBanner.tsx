"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "@/style/CookieBanner.css";

export default function CookieBanner() {
  const [show, setShow] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Starts hidden (matches SSR) then flips visible post-mount if no
    // consent is stored — can't read localStorage during server render.
    const consent = localStorage.getItem("cookieConsent");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!consent) setShow(true);
  }, []);

  const setConsent = (analytics: boolean, marketing: boolean) => {
    localStorage.setItem(
      "cookieConsent",
      JSON.stringify({ essential: true, analytics, marketing, timestamp: new Date().toISOString() })
    );
    setShow(false);
    window.dispatchEvent(new Event("cookieConsentChanged"));
  };

  if (!show) return null;

  return (
    <div className="cookie-banner">
      <p className="cookie-text">
        We use cookies and similar technologies to improve website functionality, analyse traffic, and personalise
        content. By clicking &ldquo;Accept&rdquo;, you consent to the use of cookies as described in our{" "}
        <span className="cookie-link" onClick={() => router.push("/PrivacyPolicy")}>
          Privacy Policy
        </span>
        .
      </p>

      <div className="cookie-actions">
        <button className="btn accept" onClick={() => setConsent(true, true)}>
          Accept All
        </button>
        <button className="btn reject" onClick={() => setConsent(false, false)}>
          Reject Non-Essential
        </button>
        <button className="btn link" onClick={() => router.push("/PrivacyPolicy")}>
          View Privacy Policy
        </button>
      </div>
    </div>
  );
}
