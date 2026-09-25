import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientDomGuard from "@/components/ClientDomGuard";
import ImageRetryOnError from "@/components/ImageRetryOnError";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { APPLE_SPLASH_SCREENS } from "@/components/pwa/appleSplashScreens";

// PWA icon/manifest metadata lives here (root layout) rather than per-segment
// so it applies uniformly to (site), /admin, and /psych-battery alike —
// Next.js metadata merging replaces a parent's `icons` object wholesale if a
// child segment declares its own, so the three now-removed per-segment
// `icons` overrides (which only ever set a bare favicon) would otherwise
// have shadowed the fuller icon set below on those routes.
export const metadata: Metadata = {
  title: "SSB with ISV",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "SSB with ISV",
    statusBarStyle: "black-translucent",
  },
  other: {
    // Next only emits the modern `mobile-web-app-capable` tag from
    // `appleWebApp.capable` above; iOS only started honoring that standard
    // tag in 17.4 (WebKit changelog), so the legacy Apple-prefixed one is
    // added explicitly to still get the no-browser-chrome standalone
    // window on older iOS versions.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth" suppressHydrationWarning translate="no">
      {/* apple-touch-startup-image has no equivalent in the Metadata API (it
          only supports `apple.startupImage` with a single flat size list,
          not per-device `media` queries), so these are rendered as raw
          <link> tags — Next.js App Router merges a layout's own <head>
          content with what it generates from `metadata` above. */}
      <head>
        <meta name="google" content="notranslate" />
        {APPLE_SPLASH_SCREENS.map((screen) => (
          <link
            key={`${screen.pixelWidth}x${screen.pixelHeight}`}
            rel="apple-touch-startup-image"
            href={`/splash/apple-splash-${screen.pixelWidth}-${screen.pixelHeight}.png`}
            media={screen.media}
          />
        ))}
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ClientDomGuard />
        <ImageRetryOnError />
        <ServiceWorkerRegister />
        <InstallPrompt />
        {children}
      </body>
    </html>
  );
}
