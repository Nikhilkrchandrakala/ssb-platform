"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own (non-standard) flag for "already added to home screen".
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

// Small, self-contained floating install pill — deliberately styled inline
// rather than via the site's legacy CSS files, since this component is
// mounted at the root layout and needs to render consistently on /admin and
// /psych-battery too, which don't load those stylesheets.
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (typeof window === "undefined" || localStorage.getItem(DISMISSED_KEY)) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    const handleInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleInstalled);

    // iOS Safari never fires beforeinstallprompt — show manual instructions
    // instead, once per browser (respecting the same dismissed flag).
    if (isIos()) {
      setShowIosHint(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install SSB with ISV app"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "16px",
        transform: "translateX(-50%)",
        zIndex: 2147483000,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        maxWidth: "calc(100vw - 24px)",
        padding: "10px 14px",
        borderRadius: "14px",
        background: "#0b0b0b",
        border: "1px solid #3b3930",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
        color: "#e0dcc8",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "13.5px",
      }}
    >
      <img src="/icons/icon-192.png" alt="" width={32} height={32} style={{ borderRadius: "8px", flexShrink: 0 }} />
      <span style={{ lineHeight: 1.3 }}>
        {showIosHint
          ? "Install this app: tap Share, then \"Add to Home Screen\"."
          : "Install the SSB with ISV app for quick, full-screen access."}
      </span>
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        {!showIosHint && (
          <button
            onClick={install}
            style={{
              background: "linear-gradient(135deg, #d2a100 0%, #f0c020 100%)",
              color: "#000",
              border: "none",
              borderRadius: "999px",
              padding: "6px 14px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: "transparent",
            color: "#bfbfbf",
            border: "none",
            fontSize: "16px",
            lineHeight: 1,
            cursor: "pointer",
            padding: "4px",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
