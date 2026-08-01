"use client";

const FALLBACK = "/assets/logo/ISV.webp";

export default function BlogThumb({ src, alt }: { src?: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || FALLBACK}
      alt={alt}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = FALLBACK;
      }}
    />
  );
}
