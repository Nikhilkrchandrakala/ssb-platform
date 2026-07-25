import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Local-disk storage. This app deploys to a persistent Hostinger VPS (not
// serverless), so there's no need for an object-storage service — this is
// the same thing the legacy Express backend did (multer `diskStorage` under
// `uploads/`), just re-homed under Next.js's `public/` folder so `next
// start` serves it back out directly with no extra route needed.
//
// This file is still named/exported as "r2" (uploadToR2/deleteFromR2/
// keyFromR2Url) on purpose: every call site across the app (PIQ/dossier,
// profile photos, magazine, gallery, blog, courses, candidates) already
// imports these three functions with this exact shape, so keeping the names
// stable means zero call-site changes. Cloudflare R2 was evaluated during
// the migration but never provisioned (credentials were left blank in
// .env.local — see STATUS-REPORT.md); swap this module back to the real S3
// client if R2 (or any other object store) is ever wired up later.
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const SITE_BASE_URL = (process.env.CLIENT_URL ?? "https://ssbwithisv.in").replace(/\/$/, "");

export type UploadFolder =
  | "blogs"
  | "gallery"
  | "courses"
  | "magazine"
  | "profile"
  | "candidates"
  | "battery";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/**
 * Streams a File/Blob straight to local disk under `public/uploads/<folder>/`.
 * Returns the public URL to store on the Mongo document.
 */
export async function uploadToR2(
  folder: UploadFolder,
  file: File,
  opts?: { fileName?: string }
): Promise<{ url: string; key: string }> {
  const ext =
    opts?.fileName?.split(".").pop() ||
    EXT_BY_MIME[file.type] ||
    "bin";
  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  const key = `${folder}/${fileName}`;

  const dir = path.join(UPLOAD_ROOT, folder);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, fileName), buffer);

  return { url: `${SITE_BASE_URL}/uploads/${key}`, key };
}

export async function deleteFromR2(key: string): Promise<void> {
  const filePath = path.join(UPLOAD_ROOT, ...key.split("/"));
  await unlink(filePath).catch(() => {
    // Best-effort: matches the old delete-then-ignore-404 behavior callers already rely on.
  });
}

/** Derives the local-disk key from a previously-issued public URL, for deletes/replacements. */
export function keyFromR2Url(url: string): string | null {
  const marker = "/uploads/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export function isR2Configured(): boolean {
  return true; // local disk needs no external credentials — always "configured"
}

export const R2_BUCKET_NAME: string | undefined = undefined;
export const R2_PUBLIC_URL: string | undefined = undefined;
