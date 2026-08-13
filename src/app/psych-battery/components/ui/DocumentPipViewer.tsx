"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "./Primitives";
import { cn } from "@/app/psych-battery/lib/utils";

// Chrome/Edge-only experimental API — https://developer.chrome.com/docs/web-platform/document-picture-in-picture.
// Not in TypeScript's lib.dom.d.ts yet, so it's declared here rather than
// pretending it's universally available; every call site feature-detects
// before touching it.
declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
      window: Window | null;
    };
  }
}

function copyStylesInto(win: Window, title: string) {
  // The PiP window starts with an empty <head> — copy the app's stylesheets
  // across so Tailwind classes render correctly inside it.
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      const css = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join("\n");
      const style = win.document.createElement("style");
      style.textContent = css;
      win.document.head.appendChild(style);
    } catch {
      // Cross-origin stylesheet (cssRules blocked) — link it instead.
      if (sheet.href) {
        const link = win.document.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        win.document.head.appendChild(link);
      }
    }
  });

  win.document.title = title;
  win.document.documentElement.className = document.documentElement.className;
  win.document.body.style.margin = "0";
  win.document.body.className = document.body.className;
}

/**
 * Imperative picture-in-picture controller.
 *
 * `request()` must be called *synchronously* from inside the click handler
 * that triggers it — Chrome/Edge only grant a real Document
 * Picture-in-Picture window when `requestWindow()` is invoked within the
 * original user-gesture call stack. Calling it from a `useEffect` (even one
 * that fires as a direct result of the same click) runs one tick too late:
 * the browser has already consumed the gesture's "transient activation" and
 * silently rejects the request every time, which is why this used to always
 * fall through to the Dialog fallback below.
 */
export function useDocumentPip() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const request = useCallback((title: string, width = 480, height = 640) => {
    const dpip = typeof window !== "undefined" ? window.documentPictureInPicture : undefined;
    if (!dpip) {
      setDialogOpen(true);
      return;
    }
    dpip
      .requestWindow({ width, height })
      .then((win) => {
        copyStylesInto(win, title);
        win.addEventListener("pagehide", () => setPipWindow(null));
        setPipWindow(win);
        setDialogOpen(false);
      })
      .catch(() => {
        // Rejected (denied, or some other transient-activation edge case) —
        // fall back to the in-page modal instead of failing silently.
        setDialogOpen(true);
      });
  }, []);

  const close = useCallback(() => {
    setPipWindow((win) => {
      win?.close();
      return null;
    });
    setDialogOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      pipWindow?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { request, close, pipWindow, dialogOpen };
}

/** Renders into the real PiP window if one's open, else the Dialog fallback. */
export function PipContent({
  pipWindow,
  dialogOpen,
  onClose,
  title,
  children,
}: {
  pipWindow: Window | null;
  dialogOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (pipWindow) {
    return createPortal(<div className="bg-app-bg text-app-text-bright min-h-screen p-4">{children}</div>, pipWindow.document.body);
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidth="max-w-xl" className="p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-app-border">
          <DialogTitle className="text-sm font-black text-app-text-bright uppercase tracking-widest truncate">{title}</DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-app-text-muted border border-app-border hover:text-app-text-bright hover:border-app-text-muted hover:bg-app-card transition-colors cursor-pointer"
              title="Close"
            >
              <X size={15} />
            </button>
          </DialogClose>
        </div>
        <div className="p-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

// Legacy pre-R2-migration submissions store PIQ pages as base64 blobs
// (piqFileData) and mark their position in `piqFiles` with a `db://`
// sentinel — those get proxied through the auth-gated piq-file route
// instead of being linked to directly. Everything uploaded since is a
// plain R2 URL. Mirrors SubmissionReviewView's buildFileUrl.
export function resolveFileUrl(submissionId: string, allPiqFiles: string[], path: string): string {
  if (path.startsWith("db://")) {
    const idx = allPiqFiles.indexOf(path);
    return `/api/psych/submissions/${submissionId}/piq-file/${idx !== -1 ? idx : 0}`;
  }
  return path;
}

// Must be checked against the *original* file path, not a resolved URL —
// the `db://` proxy URL above (/api/.../piq-file/0) has no file extension,
// so running this against the resolved URL always says "not a PDF" and a
// PDF ends up in an <img> tag (renders as a broken-image icon).
export function isPdfPath(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf");
}

export type GalleryItem = { url: string; isPdf: boolean };

/** Single-document-at-a-time gallery with prev/next, sized for a PiP window. */
export function FileGallery({ label, items }: { label: string; items: GalleryItem[] }) {
  const [index, setIndex] = useState(0);

  if (items.length === 0) {
    return <div className="text-xs text-app-text-muted p-8 text-center">No files uploaded yet.</div>;
  }

  const safeIndex = Math.min(index, items.length - 1);
  const item = items[safeIndex];

  return (
    <div className="space-y-3">
      {items.length > 1 && (
        <div className="flex items-center justify-between text-[10px] font-bold text-app-text-muted uppercase tracking-widest">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={safeIndex === 0}
            className="p-1 rounded disabled:opacity-30 hover:text-app-text-bright cursor-pointer disabled:cursor-default"
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            {label} — Page {safeIndex + 1} / {items.length}
          </span>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
            disabled={safeIndex === items.length - 1}
            className="p-1 rounded disabled:opacity-30 hover:text-app-text-bright cursor-pointer disabled:cursor-default"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden border border-app-border bg-black" style={{ height: 460 }}>
        {item.isPdf ? (
          <iframe key={item.url} src={`${item.url}#toolbar=0&navpanes=0`} className="w-full h-full border-0" title={`${label} page ${safeIndex + 1}`} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.url} src={item.url} alt={`${label} page ${safeIndex + 1}`} className="w-full h-full object-contain" />
        )}
      </div>

      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest",
          "text-app-text-muted hover:text-app-accent transition-colors"
        )}
      >
        <ExternalLink size={12} /> Open Full Size
      </a>
    </div>
  );
}
