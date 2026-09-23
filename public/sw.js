/**
 * Service worker for offline support / installability.
 *
 * Scope is deliberately narrow: this only caches the public marketing site's
 * static assets and page shells. It explicitly passes through (never caches)
 * anything under /admin, /psych-battery, or /api — those are authenticated,
 * per-user, frequently-changing app surfaces where a stale cached response
 * would show one user another user's data or a stale dashboard. Caching is
 * only safe here because these are anonymous, publicly-shared GET responses.
 *
 * Bump CACHE_VERSION whenever the precache list below changes — the old
 * cache is deleted on activate, so this is how updates roll out.
 */
const CACHE_VERSION = "v1";
const STATIC_CACHE = `ssbisv-static-${CACHE_VERSION}`;
const PAGE_CACHE = `ssbisv-pages-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// The app shell: enough to render *something* usable offline on first
// install, before any real navigation has populated the runtime caches.
const PRECACHE_URLS = [
  "/",
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Paths that must always go to the network untouched — never served from,
// or written to, any cache.
const NEVER_CACHE_PREFIXES = ["/api/", "/admin", "/psych-battery"];

function isNeverCache(url) {
  return NEVER_CACHE_PREFIXES.some((p) => url.pathname.startsWith(p));
}

// Static build output and media — safe to cache-first since Next.js
// fingerprints /_next/static/* filenames by content hash, and the rest are
// versioned image/font assets that rarely change in place.
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/splash/") ||
    url.pathname.startsWith("/font/") ||
    url.pathname.startsWith("/fonts/") ||
    /\.(?:css|js|woff2?|ttf|otf|eot|png|jpe?g|webp|gif|svg|ico)$/.test(url.pathname)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isNeverCache(url)) return;

  // Page navigations: network-first so visitors always get the live page
  // when online; fall back to a cached copy, then the offline shell, only
  // when the network is unreachable.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Static assets: stale-while-revalidate — serve the cached copy instantly
  // if present, and refresh it in the background for next time.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.status === 200) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
