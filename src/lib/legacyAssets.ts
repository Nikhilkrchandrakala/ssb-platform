// Pre-R2-migration records (magazine PDFs/covers, confirmed via direct Atlas
// query — all 84 `magazinepdfs` docs as of Phase 6) store a bare relative
// disk path (e.g. "uploads/magazine/pdf/xyz.pdf") from the legacy multer
// backend, instead of a full URL the way Gallery/Blog records from the same
// era do. Matches legacy magazine.js's own
// `mag.magazineFrontImage.startsWith('http') ? ... : `${API_BASE}/${...}``
// resolution — new uploads through this app's R2 pipeline already save a
// full https:// URL and pass through unchanged. Once these records are
// migrated to R2 (tracked in STATUS-REPORT.md), this prefix becomes a no-op
// and this helper can be dropped.
const LEGACY_ASSET_BASE_URL = "https://api.ssbwithisv.in";

export function resolveLegacyAssetUrl(path: string): string {
  return path.startsWith("http") ? path : `${LEGACY_ASSET_BASE_URL}/${path}`;
}
