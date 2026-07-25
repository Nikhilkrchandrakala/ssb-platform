"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import styles from "@/style/BlogDetails.module.css";

interface BlogImage {
  imageUrl: string;
  imageText?: string;
}

export default function BlogImageSlider({ images, title }: { images: BlogImage[]; title: string }) {
  return (
    <div className={styles.sliderWrapper}>
      <Swiper
        spaceBetween={20}
        slidesPerView={1}
        loop={true}
        autoplay={{
          delay: 2000,
          disableOnInteraction: false,
        }}
        modules={[Autoplay]}
      >
        {images.map((img, i) => (
          <SwiperSlide key={i}>
            <div className={styles.BlogImageWrapper}>
              <img src={img.imageUrl} alt={title} />
              <div className={styles.imageOverlay}></div>
            </div>
            <p className={styles.TextImage}>{img.imageText}</p>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
