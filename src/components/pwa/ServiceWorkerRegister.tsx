"use client";

import { useEffect } from "react";

// Registered only in production: in dev, Next serves unhashed/hot-reloading
// assets, so a service worker caching them would show stale code after every
// edit and be confusing to debug. Silently does nothing on browsers without
// service worker support (Lighthouse/older browsers) instead of throwing.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[pwa] service worker registration failed:", err);
    });
  }, []);

  return null;
}
