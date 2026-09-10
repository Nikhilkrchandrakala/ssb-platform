// Maps each generated public/splash/apple-splash-*.png (see
// scripts/generate-pwa-icons.js) to the exact `apple-touch-startup-image`
// media query iOS uses to pick a splash screen — keyed by CSS device-width /
// device-height (not the PNG's own pixel dimensions) plus pixel ratio.
// iOS has no fallback for an unlisted device, so this list only covers
// iPhone/iPad models currently sold; older/retired models simply won't get
// a custom splash screen (harmless — iOS just shows a blank background).
export const APPLE_SPLASH_SCREENS = [
  { width: 640, height: 1136, dpr: 2 },
  { width: 750, height: 1334, dpr: 2 },
  { width: 1242, height: 2208, dpr: 3 },
  { width: 1125, height: 2436, dpr: 3 },
  { width: 828, height: 1792, dpr: 2 },
  { width: 1242, height: 2688, dpr: 3 },
  { width: 1170, height: 2532, dpr: 3 },
  { width: 1179, height: 2556, dpr: 3 },
  { width: 1284, height: 2778, dpr: 3 },
  { width: 1290, height: 2796, dpr: 3 },
  { width: 1620, height: 2160, dpr: 2 },
  { width: 1640, height: 2360, dpr: 2 },
  { width: 1668, height: 2388, dpr: 2 },
  { width: 2048, height: 2732, dpr: 2 },
].map(({ width, height, dpr }) => ({
  pixelWidth: width,
  pixelHeight: height,
  media: `(device-width: ${width / dpr}px) and (device-height: ${height / dpr}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
}));
