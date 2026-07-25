"use client";

import { useCallback, useEffect, useState } from "react";
import CustomHeader from "@/components/site/CustomHeader";
import EnquiryForm from "@/components/site/EnquiryForm";

interface GalleryImage {
  _id?: string;
  imageUrl: string;
  imageText?: string;
}

const headerData = {
  heading: "Moments of Excellence",
  text: "Explore our journey through images capturing training sessions, successful candidates, and memorable moments.",
  banner: "/assets/website/gal.webp",
};

export default function GalleryView() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/allGalleryImages")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: GalleryImage[]) => {
        if (!cancelled) setImages(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setImages([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, nextImage, prevImage]);

  // Keep the body scroll lock in sync with the lightbox — an effect rather than toggling
  // it inline inside openLightbox/closeLightbox — and always revert on unmount.
  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [lightboxOpen]);

  return (
    <>
      <CustomHeader heading={headerData.heading} text={headerData.text} banner={headerData.banner} />

      <section className="container sectionspace60">
        <div className="gallery-grid">
          {images.map((image, index) => (
            <div key={image._id || index} className="gallery-item" onClick={() => openLightbox(index)}>
              <div className="gallery-image-wrapper">
                <img src={image.imageUrl} alt="gallery" loading="lazy" />
              </div>
              <p style={{ textAlign: "center", marginTop: "10px" }}>{image.imageText || "Image description not available."}</p>
            </div>
          ))}
        </div>

        {images.length === 0 && (
          <div className="gallery-empty">
            <div style={{ textAlign: "center" }}>No images found.</div>
          </div>
        )}
      </section>

      {lightboxOpen && (
        <div className="lightbox-modal" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox}>
            ×
          </button>

          <button
            className="lightbox-prev"
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
          >
            ◀
          </button>

          <button
            className="lightbox-next"
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
          >
            ▶
          </button>

          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={images[currentImageIndex]?.imageUrl} alt="preview" />
            <p style={{ textAlign: "center", marginTop: "10px" }}>
              {images[currentImageIndex]?.imageText || "Image description not available."}
            </p>

            <div className="lightbox-counter">
              {currentImageIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}

      <EnquiryForm />
    </>
  );
}
