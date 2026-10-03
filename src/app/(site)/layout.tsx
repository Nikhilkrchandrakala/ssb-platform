import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
import { connectDB } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { ContactSettings } from "@/server/models";
import { SiteUserProvider, type SiteUser } from "@/components/site/SiteUserProvider";
import Footer from "@/components/site/Footer";
import CookieBanner from "@/components/site/CookieBanner";

// Bootstrap self-hosted from the npm package (not the CDN) so it's bundled
// directly into this page's own CSS chunk instead of a separate network
// fetch — the CDN `@import` briefly showed unstyled/black text on cold-cache
// first loads while it downloaded, and (in dev) was fragile to Next's CSS
// chunk ordering. Font Awesome stays on the CDN below (no npm package
// installed for it, and it doesn't have the same FOUC-on-text risk).
import "bootstrap/dist/css/bootstrap.min.css";
import "../legacy-bootstrap-cdn.css";
import "../legacy-index.css";
import "../legacy-app.css";
import "../legacy-custom.css";
// custom-theme.css is intentionally NOT imported here: in the legacy CRA app it
// was only ever imported by the auth/profile pages (SignIn, SignUp,
// AccountRecovery, Successful, auth/callback, auth/phone-verify,
// ProfileDashboard, OrderHistory, PaymentHistory, profile) — never site-wide.
// Importing it globally would leak its `html, body { background: #050507 }`
// (and other auth-portal-only rules) onto every public page. Each of those
// pages imports it directly instead.

const DEFAULT_DESCRIPTION =
  "Assessor-led SSB preparation by an ex-GTO. Join online mentoring with VTX™, India's first virtual GTO ground, or the 12-day residential SSB camp in Nagpur.";

export const metadata: Metadata = {
  description: DEFAULT_DESCRIPTION,
  // icons/manifest intentionally omitted , inherited from the root layout
  // (src/app/layout.tsx), which now carries the full PWA icon set. Next.js
  // metadata merging replaces `icons` wholesale rather than deep-merging it,
  // so redeclaring even one field here would shadow the rest.
  openGraph: {
    description: DEFAULT_DESCRIPTION,
    url: "https://ssbwithisv.in",
    images: ["https://ssbwithisv.in/assets/logo/ISV2.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    description: DEFAULT_DESCRIPTION,
    images: ["https://ssbwithisv.in/assets/logo/ISV2.png"],
  },
  other: {
    "google-site-verification": "gZe4DQcZuXij8m0UWN37T4lwovBfurQvfmqleyu8058",
  },
};

async function getContactSettings() {
  try {
    await connectDB();
    const settings = await ContactSettings.findOne().lean<{ whatsappNumber?: string; callNumber?: string }>();
    return settings ? { whatsappNumber: settings.whatsappNumber, callNumber: settings.callNumber } : null;
  } catch (err) {
    console.error("[layout] failed to fetch contact settings, falling back to defaults:", err);
    return null;
  }
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, contactSettings] = await Promise.all([getCurrentUser(), getContactSettings()]);

  return (
    <SiteUserProvider initialUser={user as SiteUser | null}>
      {/* Bootstrap + Font Awesome are loaded via the `legacy-bootstrap-cdn.css` import above (see that file for why). */}

      <noscript>
        <iframe
          src="https://www.googletagmanager.com/ns.html?id=GTM-WBMZT8BP"
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>

      <Script async src="https://www.googletagmanager.com/gtag/js?id=G-MPVGNGE0NX" strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-MPVGNGE0NX');`}
      </Script>
      <Script id="gtm-init" strategy="afterInteractive">
        {`(function (w, d, s, l, i) {
            w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
            var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
            j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
          })(window, document, 'script', 'dataLayer', 'GTM-WBMZT8BP');`}
      </Script>

      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <Script src="https://cdn-in.pagesense.io/js/60070446894/c47efbddcb31458ab634e57373f70600.js" strategy="lazyOnload" />

      <Script id="zoho-init" strategy="lazyOnload">
        {`window.$zoho = window.$zoho || {};
          $zoho.salesiq = $zoho.salesiq || { ready: function () {} };
          $zoho.salesiq.ready = function () { $zoho.salesiq.floatbutton.visible("hide"); };`}
      </Script>
      <Script
        id="zsiqscript"
        src="https://salesiq.zohopublic.in/widget?wc=siqc08ba46cfbc1f55a60348a1fa7a43c8c13ee00806f8a303d6411d3b3493cae77"
        strategy="lazyOnload"
      />

      <Toaster position="top-center" reverseOrder={false} />
      <CookieBanner />

      {children}

      <Footer contactSettings={contactSettings} />
    </SiteUserProvider>
  );
}
