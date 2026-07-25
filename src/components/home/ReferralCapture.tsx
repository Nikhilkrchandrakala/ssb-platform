"use client";

import { useEffect } from "react";

/**
 * Captures a `?ref=` query param on the home page landing and stores it in
 * localStorage so it can be attached to a signup/lead later. Ported out of
 * legacy Home.jsx's inline useEffect (there is no server-side equivalent for
 * this — the whole Home page is a Server Component for metadata/JSON-LD, so
 * this one side effect lives in its own tiny client component).
 */
export default function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");

    if (ref) {
      localStorage.setItem("referralCode", ref);
    }
  }, []);

  return null;
}
