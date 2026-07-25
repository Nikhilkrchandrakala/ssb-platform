import type { Metadata } from "next";
import Script from "next/script";

import "./styles/legacy-bootstrap-admin-cdn.css";
import "./styles/legacy-admin-global.css";
import "./styles/legacy-admin-header.css";
import "./styles/legacy-gateway.css";

export const metadata: Metadata = {
  title: "SSB Admin Portal",
  icons: { icon: "/assets/logo/ISV2.png" },
};

// Shell for the entire /admin segment (both the public login/recovery pages
// and the (protected) route group) — loads the Bootstrap 5 / Font Awesome /
// SweetAlert2 stack the legacy admin-ssbwithisv panel depended on, same CDN
// versions, so ported page markup/classes need no rework. The CSS itself is
// loaded via the `legacy-bootstrap-admin-cdn.css` import above, not a <link>
// here — see that file for why.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/sweetalert2@11" strategy="afterInteractive" />

      {children}
    </>
  );
}
