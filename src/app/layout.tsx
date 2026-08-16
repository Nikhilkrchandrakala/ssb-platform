import type { Metadata, Viewport } from "next";
import "./globals.css";
import ImageRetryOnError from "@/components/ImageRetryOnError";

export const metadata: Metadata = {
  title: "SSB with ISV",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ImageRetryOnError />
        {children}
      </body>
    </html>
  );
}
