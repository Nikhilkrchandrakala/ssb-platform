/**
 * Dynamically loads the Razorpay checkout.js script on-demand when checkout is initiated.
 * Prevents loading the Razorpay SDK on non-checkout pages, removing the
 * "Unrecognized feature: 'otp-credentials'" console warning from the rest of the site.
 */
export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
