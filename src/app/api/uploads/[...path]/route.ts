import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

// Mirrors src/server/storage/r2.ts's UPLOAD_ROOT exactly — this route only
// ever serves files that were written there.
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
  pdf: "application/pdf",
};

/**
 * Serves everything under public/uploads/* (next.config.ts rewrites
 * /uploads/:path* here via beforeFiles, ahead of Next's own public-folder
 * check) instead of letting Next's built-in static file serving handle it
 * directly.
 *
 * Next's production server (`next start`) snapshots the list of files under
 * public/ once at process startup for performance. Every upload in this app
 * writes straight to public/uploads/<folder>/ at runtime (local-disk
 * storage, see r2.ts's own header comment on why) — any file written after
 * that startup snapshot is invisible (404) through Next's normal static
 * path until the process is restarted. Confirmed 2026-08-14: two PIQ
 * uploads for a real student 404'd for ~6 minutes until an unrelated
 * `pm2 restart` happened to fix it by re-scanning the folder.
 *
 * Reading straight off the filesystem per-request here sidesteps that stale
 * cache entirely — the cost (one fs.stat/fs.readFile per request instead of
 * Next's optimized static path) is an acceptable trade for user-uploaded
 * content that must be visible immediately, not just after the next deploy.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  if (!segments || segments.length === 0) return new NextResponse(null, { status: 404 });

  // Defense in depth against path traversal — path.join below already
  // normalizes ".." sequences and the startsWith check below is the real
  // guard, but reject the obvious case outright too.
  if (segments.some((s) => s === "..")) {
    return new NextResponse(null, { status: 400 });
  }

  const filePath = path.join(UPLOAD_ROOT, ...segments);
  if (!filePath.startsWith(UPLOAD_ROOT)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) return new NextResponse(null, { status: 404 });

    const buffer = await readFile(filePath);
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const contentType = MIME_BY_EXT[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stats.size),
        "Cache-Control": "public, max-age=86400",
        // The site is reachable on both www and bare-domain hosts, so a page
        // served from one can request an /uploads/ URL that resolves to the
        // other — a cross-origin fetch from the browser's point of view.
        // pdf.js fetches PDFs directly (not via <img>/<a>), so without this
        // header Chromium browsers block the response outright with a CORS
        // error. Confirmed 2026-08-16: PdfViewer failed in Edge because the
        // page was on www.ssbwithisv.in and the PDF on ssbwithisv.in.
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
