"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { recordNavigation } from "@/lib/safeBack";
import { FaTimes } from "react-icons/fa";

/**
 * Guards both Zoho SalesIQ Chatbot lifecycle and in-app navigation on iOS devices:
 * 1. Automatically records in-app route changes so `safeBack()` knows whether a
 *    prior page exists in the current session (critical for standalone iOS PWAs).
 * 2. Monitors the Zoho SalesIQ chat window state. When open on mobile/iOS devices
 *    where the built-in close button can be clipped behind the Dynamic Island /
 *    Notch or fail touch hit-testing, provides an infallible, high-contrast
 *    native close button floating at maximum z-index.
 */
export default function ZohoChatGuard() {
  const pathname = usePathname();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);

  // 1. Record route changes for safeBack() in-app history tracking
  useEffect(() => {
    recordNavigation();
  }, [pathname]);

  // 2. Detect Zoho SalesIQ Chatbot window visibility
  const checkChatState = useCallback(() => {
    if (typeof window === "undefined") return;

    // A. Check Zoho SalesIQ JS API if available
    try {
      const z = (
        window as unknown as {
          $zoho?: { salesiq?: { floatwindow?: { visible: () => string | boolean } } };
        }
      ).$zoho;
      const status = z?.salesiq?.floatwindow?.visible?.();
      if (status === "show" || status === true) {
        setIsChatOpen(true);
        return;
      } else if (status === "hide" || status === false) {
        setIsChatOpen(false);
        return;
      }
    } catch {}

    // B. Check DOM elements injected by Zoho (#siq_cht, .zsiq_flt_wrp, iframe[id*='siq'])
    const chatEl = document.querySelector(
      "#siq_cht, .zsiq_floatmain, .zsiq_flt_wrp, iframe[id*='siq'], iframe#siqiframe"
    );
    if (chatEl) {
      const style = window.getComputedStyle(chatEl);
      if (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0"
      ) {
        const rect = chatEl.getBoundingClientRect();
        // The open mobile chat window occupies substantial screen space (>150px)
        if (rect.width > 150 && rect.height > 150) {
          setIsChatOpen(true);
          return;
        }
      }
    }
    setIsChatOpen(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const interval = setInterval(checkChatState, 500);

    observerRef.current = new MutationObserver(() => {
      checkChatState();
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    return () => {
      clearInterval(interval);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [checkChatState]);

  const handleClose = () => {
    // A. Command Zoho API to dismiss
    try {
      const z = (
        window as unknown as {
          $zoho?: { salesiq?: { floatwindow?: { visible: (v: string) => void } } };
        }
      ).$zoho;
      z?.salesiq?.floatwindow?.visible?.("hide");
    } catch {}

    // B. Fallback direct DOM hide on Zoho wrappers in case API is unresponsive
    try {
      const chatEls = document.querySelectorAll(
        "#siq_cht, .zsiq_floatmain, .zsiq_flt_wrp, iframe[id*='siq'], iframe#siqiframe"
      );
      chatEls.forEach((el) => {
        (el as HTMLElement).style.setProperty("display", "none", "important");
      });
    } catch {}

    setIsChatOpen(false);
  };

  if (!isChatOpen) return null;

  return (
    <button
      type="button"
      className="zoho-native-close-btn"
      onClick={handleClose}
      aria-label="Close Chat Window"
      title="Close Chat Window"
    >
      <FaTimes /> <span>Close</span>
    </button>
  );
}
