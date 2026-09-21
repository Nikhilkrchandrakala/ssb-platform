import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
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
 * path until the process is restarted.
 *
 * In development, if a requested upload file does not exist locally (e.g.
 * in a fresh repo clone or when assets exist on production VPS), this route
 * seamlessly falls back to fetching and caching the asset from the live site
 * (https://ssbwithisv.in/uploads/...) so images never appear broken locally.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  if (!segments || segments.length === 0) return new NextResponse(null, { status: 404 });

  // Defense in depth against path traversal
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
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    // In dev, fallback-fetch from production if file isn't on local disk yet
    if (process.env.NODE_ENV !== "production" || process.env.FALLBACK_UPLOADS_URL) {
      const prodBase = process.env.FALLBACK_UPLOADS_URL || "https://ssbwithisv.in/uploads";
      const remoteUrl = `${prodBase}/${segments.map(encodeURIComponent).join("/")}`;
      try {
        const prodRes = await fetch(remoteUrl);
        if (prodRes.ok) {
          const arrayBuffer = await prodRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Best-effort local cache on disk
          try {
            await mkdir(path.dirname(filePath), { recursive: true });
            await writeFile(filePath, buffer);
          } catch {
            // Non-fatal if local write fails
          }

          const ext = filePath.split(".").pop()?.toLowerCase() || "";
          const contentType = prodRes.headers.get("content-type") || MIME_BY_EXT[ext] || "application/octet-stream";

          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Length": String(buffer.length),
              "Cache-Control": "public, max-age=86400",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
      } catch {
        // Fall through to 404 below
      }
    }
    return new NextResponse(null, { status: 404 });
  }
}
