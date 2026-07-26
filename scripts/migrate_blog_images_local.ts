import fs from "fs";
import path from "path";

// Same env-loading pattern as the phaseN_sales_verify.ts scripts.
const envFiles = [".env.local", ".env", "env", ".env.development"];
for (const envFile of envFiles) {
  const file = path.join(process.cwd(), envFile);
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

// One-time migration: blog cover images from before the R2->local-disk switch
// are stored as full `http://api.ssbwithisv.in/uploads/blogs/images/...` URLs
// (the old pre-migration Express server). That server takes ~15s per image to
// respond, which is why /blogs and /admin/BlogList were taking 16-22s to load.
// This downloads each unique legacy image once into this app's own
// public/uploads/blogs/images/ (served locally, same as every other upload
// since the R2-drop) and rewrites the stored URL on every Blog doc that
// references it. Idempotent: skips any URL that isn't still pointing at the
// legacy domain, and skips downloads whose local file already exists.
const LEGACY_ORIGIN_RE = /^https?:\/\/api\.ssbwithisv\.in\/(.+)$/;

async function downloadTo(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
}

async function main() {
  const { connectDB } = await import("../src/server/db");
  const { Blog } = await import("../src/server/models/Blog");

  await connectDB();

  const blogs = await Blog.find({ "images.imageUrl": { $regex: "api\\.ssbwithisv\\.in" } });
  console.log(`Found ${blogs.length} blog(s) with at least one legacy-hosted image.`);

  const urlToLocal = new Map<string, string>(); // legacy URL -> new local URL
  let downloaded = 0;
  let failed = 0;
  let skippedExisting = 0;

  // Collect all unique legacy URLs first so each is only downloaded once,
  // even if multiple blogs (or multiple images on one blog) share it.
  const uniqueUrls = new Set<string>();
  for (const blog of blogs) {
    for (const img of blog.images || []) {
      if (img.imageUrl && LEGACY_ORIGIN_RE.test(img.imageUrl)) uniqueUrls.add(img.imageUrl);
    }
  }
  console.log(`${uniqueUrls.size} unique legacy image URL(s) to migrate.\n`);

  // Modest concurrency — the legacy server is slow per-request but this
  // still finishes far faster than downloading one at a time.
  const CONCURRENCY = 6;
  const urls = Array.from(uniqueUrls);
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      const match = url.match(LEGACY_ORIGIN_RE);
      if (!match) continue;
      const relPath = match[1]; // e.g. "uploads/blogs/images/167xxxx-name.png"
      const destPath = path.join(process.cwd(), "public", relPath);
      const localUrl = `/${relPath}`;
      if (fs.existsSync(destPath)) {
        skippedExisting++;
        urlToLocal.set(url, localUrl);
        console.log(`SKIP (already local): ${relPath}`);
        continue;
      }
      try {
        await downloadTo(url, destPath);
        urlToLocal.set(url, localUrl);
        downloaded++;
        console.log(`OK: ${relPath}`);
      } catch (err) {
        failed++;
        console.log(`FAIL: ${url} -> ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\nDownloaded: ${downloaded}, already-local: ${skippedExisting}, failed: ${failed}`);

  console.log("\nRewriting Blog documents for every successfully-migrated URL...");
  let docsUpdated = 0;
  for (const blog of blogs) {
    let changed = false;
    for (const img of blog.images || []) {
      if (img.imageUrl && urlToLocal.has(img.imageUrl)) {
        img.imageUrl = urlToLocal.get(img.imageUrl)!;
        changed = true;
      }
    }
    if (changed) {
      await blog.save();
      docsUpdated++;
    }
  }
  console.log(`Updated ${docsUpdated} blog document(s).`);

  const remaining = await Blog.countDocuments({ "images.imageUrl": { $regex: "api\\.ssbwithisv\\.in" } });
  console.log(`\nBlogs still referencing the legacy domain (download failures only): ${remaining}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
