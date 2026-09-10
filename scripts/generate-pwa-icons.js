/**
 * One-off generator for every PWA image asset (app icons, favicon, Apple
 * splash screens) from the site's existing brand mark, so nobody has to
 * hand-export dozens of sizes in an image editor. Re-run with
 * `node scripts/generate-pwa-icons.js` any time the source logo changes.
 *
 * Source: public/assets/logo/ISV2.png — the same crest already used as the
 * site's favicon/apple-touch-icon (see src/app/(site)/layout.tsx before this
 * change). Reusing it keeps the installed app icon visually identical to the
 * favicon people already see today instead of introducing a new mark.
 *
 * Output: public/icons/*, public/favicon.ico, public/splash/*
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const SOURCE_LOGO = path.join(ROOT, "public/assets/logo/ISV2.png");
const ICONS_DIR = path.join(ROOT, "public/icons");
const SPLASH_DIR = path.join(ROOT, "public/splash");

// Brand colors pulled from src/app/legacy-custom.css (--secondary-color /
// the near-black surfaces used across the real site chrome, e.g. the
// Contact Us dialog background) — kept identical so the icon padding and
// splash screen background don't introduce a new color.
const BG = "#0b0b0b";

async function flattenOnBg(size, contentScale) {
  const inner = Math.round(size * contentScale);
  const logo = await sharp(SOURCE_LOGO)
    .resize(inner, inner, { fit: "contain", background: BG })
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

async function buildIcons() {
  fs.mkdirSync(ICONS_DIR, { recursive: true });

  // "any" icons: small breathing-room padding only (~8%), same look as the
  // existing favicon — used when the OS draws the icon as-is, no mask.
  for (const size of [192, 512]) {
    const buf = await flattenOnBg(size, 0.86);
    fs.writeFileSync(path.join(ICONS_DIR, `icon-${size}.png`), buf);
  }

  // "maskable" icons: Android may crop to a circle/squircle/etc, so the
  // crest has to sit inside the safe-zone (the center ~80% of the canvas)
  // with the background filling all the way to the edge — otherwise a
  // circular mask would clip the gold ring.
  for (const size of [192, 512]) {
    const buf = await flattenOnBg(size, 0.6);
    fs.writeFileSync(path.join(ICONS_DIR, `icon-maskable-${size}.png`), buf);
  }

  // Apple touch icon: iOS renders transparency as solid black, so this must
  // be fully opaque; iOS also applies its own corner rounding, so no extra
  // safe-zone padding is needed beyond the icon's natural margin.
  const apple = await flattenOnBg(180, 0.86);
  fs.writeFileSync(path.join(ICONS_DIR, "apple-touch-icon.png"), apple);

  // Classic favicon sizes, plus a favicon.ico for browsers that still ask
  // for one directly (favicon.ico is served from public/, not public/icons/,
  // by long-standing browser convention).
  const favicon16 = await flattenOnBg(16, 0.86);
  const favicon32 = await flattenOnBg(32, 0.86);
  fs.writeFileSync(path.join(ICONS_DIR, "favicon-16.png"), favicon16);
  fs.writeFileSync(path.join(ICONS_DIR, "favicon-32.png"), favicon32);
  fs.writeFileSync(path.join(ROOT, "public/favicon.ico"), buildIco([favicon16, favicon32]));

  console.log("Icons written to public/icons/ and public/favicon.ico");
}

// Minimal ICO container that embeds PNG data directly per entry — supported
// by every browser and by Windows Vista+ (no separate BMP/ICO codec needed).
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + 16 * count;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const entries = [];
  pngBuffers.forEach((buf, i) => {
    const entryOffset = 6 + 16 * i;
    // sharp always outputs square PNGs here, so read the side from the
    // buffer's own PNG header (bytes 16-19 = width, big-endian) rather than
    // threading the size through separately.
    const dim = buf.readUInt32BE(16);
    header.writeUInt8(dim >= 256 ? 0 : dim, entryOffset); // width
    header.writeUInt8(dim >= 256 ? 0 : dim, entryOffset + 1); // height
    header.writeUInt8(0, entryOffset + 2); // color count
    header.writeUInt8(0, entryOffset + 3); // reserved
    header.writeUInt16LE(1, entryOffset + 4); // planes
    header.writeUInt16LE(32, entryOffset + 6); // bit count
    header.writeUInt32LE(buf.length, entryOffset + 8); // bytes in resource
    header.writeUInt32LE(offset, entryOffset + 12); // offset
    offset += buf.length;
    entries.push(buf);
  });

  return Buffer.concat([header, ...entries]);
}

// Apple splash screens: iOS still keys these off exact device-pixel
// dimensions via `apple-touch-startup-image` media queries (no manifest
// fallback works reliably across current iOS versions), so we ship the
// portrait size for every iPhone/iPad screen still on sale. Each entry's
// `media` string is wired up in src/app/layout.tsx.
const SPLASH_SIZES = [
  { width: 640, height: 1136 }, // iPhone SE/5/5s/5c, iPod touch
  { width: 750, height: 1334 }, // iPhone 6/7/8/SE2/SE3
  { width: 1242, height: 2208 }, // iPhone 6+/7+/8+
  { width: 1125, height: 2436 }, // iPhone X/XS/11 Pro
  { width: 828, height: 1792 }, // iPhone XR/11
  { width: 1242, height: 2688 }, // iPhone XS Max/11 Pro Max
  { width: 1170, height: 2532 }, // iPhone 12/13/14
  { width: 1179, height: 2556 }, // iPhone 14 Pro/15/16
  { width: 1284, height: 2778 }, // iPhone 12/13 Pro Max
  { width: 1290, height: 2796 }, // iPhone 14 Pro Max/15 Plus/15-16 Pro Max
  { width: 1620, height: 2160 }, // iPad 10.2"
  { width: 1640, height: 2360 }, // iPad Air 10.9"/11"
  { width: 1668, height: 2388 }, // iPad Pro 11"
  { width: 2048, height: 2732 }, // iPad Pro 12.9"
];

async function buildSplashScreens() {
  fs.mkdirSync(SPLASH_DIR, { recursive: true });
  for (const { width, height } of SPLASH_SIZES) {
    const logoSize = Math.round(Math.min(width, height) * 0.38);
    const logo = await sharp(SOURCE_LOGO)
      .resize(logoSize, logoSize, { fit: "contain", background: BG })
      .toBuffer();
    const buf = await sharp({
      create: { width, height, channels: 4, background: BG },
    })
      .composite([{ input: logo, gravity: "center" }])
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    fs.writeFileSync(path.join(SPLASH_DIR, `apple-splash-${width}-${height}.png`), buf);
  }
  console.log(`Splash screens written to public/splash/ (${SPLASH_SIZES.length} sizes)`);
}

async function main() {
  await buildIcons();
  await buildSplashScreens();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
