/**
 * Safely navigates back in Next.js App Router, with robust support for
 * installed iOS PWAs (Standalone mode) and mobile Safari where browser
 * history entries can behave unexpectedly or lack previous pages.
 */

const NAV_DEPTH_KEY = "ssb_nav_depth";

/**
 * Tracks route changes in sessionStorage so safeBack knows with 100% certainty
 * whether a prior page exists in the current user session.
 */
export function recordNavigation() {
  if (typeof window === "undefined") return;
  try {
    const current = parseInt(sessionStorage.getItem(NAV_DEPTH_KEY) || "0", 10);
    sessionStorage.setItem(NAV_DEPTH_KEY, String(current + 1));
  } catch {}
}

export function safeBack(
  router: { back: () => void; push: (url: string) => void },
  fallbackPath: string = "/"
) {
  if (typeof window === "undefined") {
    router.push(fallbackPath);
    return;
  }

  // Detect iOS and Standalone PWA mode
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone =
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches);

  let navDepth = 0;
  try {
    navDepth = parseInt(sessionStorage.getItem(NAV_DEPTH_KEY) || "0", 10);
  } catch {}

  const hasSameOriginReferrer = Boolean(
    document.referrer && document.referrer.startsWith(window.location.origin)
  );

  // If in standalone mode or on iOS with NO verified in-app navigation and NO same-origin referrer:
  // The user arrived directly (homescreen launch, external link, or refresh).
  // Calling router.back() would either do nothing or attempt to exit the app sandbox.
  // Go straight to fallbackPath with zero delay.
  if ((isStandalone || isIos) && navDepth <= 1 && !hasSameOriginReferrer) {
    router.push(fallbackPath);
    return;
  }

  // If window.history explicitly says there is only 1 entry, go straight to fallbackPath
  if (window.history.length <= 1) {
    router.push(fallbackPath);
    return;
  }

  const initialPath = window.location.pathname;
  let didNavigate = false;

  const onPopState = () => {
    didNavigate = true;
    window.removeEventListener("popstate", onPopState);
  };
  window.addEventListener("popstate", onPopState);

  // Decrement nav depth since we are navigating backward
  try {
    if (navDepth > 1) {
      sessionStorage.setItem(NAV_DEPTH_KEY, String(navDepth - 1));
    }
  } catch {}

  try {
    router.back();
  } catch {
    router.push(fallbackPath);
    return;
  }

  // Watchdog timer: On iOS, async RSC rendering can take 300-450ms.
  // Use a 500ms safety window. If path hasn't changed and popstate hasn't fired,
  // push fallbackPath so the user is never stranded.
  setTimeout(() => {
    window.removeEventListener("popstate", onPopState);
    if (!didNavigate && window.location.pathname === initialPath) {
      router.push(fallbackPath);
    }
  }, 500);
}

