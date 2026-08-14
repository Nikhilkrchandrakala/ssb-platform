"use client";

import { useEffect } from "react";

const MAX_RETRIES = 2;
const RETRY_ATTR = "data-upload-retry-count";

/**
 * Mounted once in the root layout — no <img> call site needs to opt in.
 *
 * Confirmed via VPS nginx logs (2026-08-14): a psych-battery dossier photo
 * that was fully written to disk still 404'd on /uploads/... for ~6 minutes
 * before working again, with a response size matching Next's generic 404
 * page rather than our custom file-serving route (src/app/api/uploads/
 * [...path]/route.ts) — i.e. requests were briefly not reaching that route
 * at all, most likely during a deploy/restart transition. Rather than chase
 * the exact millisecond-level trigger (which won't necessarily repeat the
 * same way next time), this neutralizes the whole class of transient
 * origin/cache hiccups the same way a manual refresh already does: on any
 * <img> load failure for an /uploads/ URL, wait briefly and retry with a
 * cache-busting query param (also defeats a possibly-cached error response
 * at any CDN layer in front of the origin) up to MAX_RETRIES times.
 *
 * `error` events don't bubble, so this listens in the capture phase on
 * `document` instead of attaching a handler per-image.
 */
export default function ImageRetryOnError() {
  useEffect(() => {
    const handleError = (event: Event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (!img.src.includes("/uploads/")) return;

      const attempt = Number(img.getAttribute(RETRY_ATTR) || "0");
      if (attempt >= MAX_RETRIES) return;
      img.setAttribute(RETRY_ATTR, String(attempt + 1));

      const url = new URL(img.src, window.location.origin);
      url.searchParams.set("_retry", Date.now().toString());
      const delayMs = 700 * (attempt + 1);
      setTimeout(() => {
        img.src = url.toString();
      }, delayMs);
    };

    document.addEventListener("error", handleError, true);
    return () => document.removeEventListener("error", handleError, true);
  }, []);

  return null;
}
