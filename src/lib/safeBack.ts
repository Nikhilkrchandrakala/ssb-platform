/**
 * Safely navigates back in Next.js App Router, with robust support for
 * installed iOS PWAs (Standalone mode) where browser back buttons are hidden
 * and window.history may lack a previous entry if the user opened the app
 * directly or refreshed.
 */
export function safeBack(
  router: { back: () => void; push: (url: string) => void },
  fallbackPath: string = "/"
) {
  if (typeof window === "undefined") {
    router.push(fallbackPath);
    return;
  }

  // If this window session has no prior history, go straight to fallbackPath
  if (window.history.length <= 1) {
    router.push(fallbackPath);
    return;
  }

  const initialPath = window.location.pathname;
  router.back();

  // Watchdog timer: If router.back() didn't change the path within 280ms
  // (e.g. no prior history stack entry exists in standalone WebKit session),
  // automatically navigate to fallbackPath so the user is never stuck.
  setTimeout(() => {
    if (window.location.pathname === initialPath) {
      router.push(fallbackPath);
    }
  }, 280);
}
