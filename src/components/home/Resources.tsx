"use client";

import styles from "@/style/Resources.module.css";
import { resourcesData } from "@/util/data";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";
import CustomButton from "@/components/site/CustomButton";
import HeadingTwo from "@/components/site/HeadingTwo";
import { useRouter } from "next/navigation";
import { useSiteUser } from "@/components/site/SiteUserProvider";

const Resources = () => {
  const router = useRouter();
  const { user } = useSiteUser();

  return (
    <section className={styles.resourcesSection}>
      <div style={{ marginTop: "0" }} className="headingOfMargin  pl">
        <HeadingTwo h1="Resources for" t1="SSB preparation" />
      </div>
      {/* SCROLL LIST */}
      <div className={styles.cardsWrapper}>
        <Swiper
          slidesPerView={1}
          spaceBetween={20}
          loop={true}
          autoplay={{
            delay: 1500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          modules={[Autoplay]}
          breakpoints={{
            0: { slidesPerView: 1 },
            560: { slidesPerView: 2 },
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
            1420: { slidesPerView: 5 },
          }}
          className={styles.mySwiper}
        >
          {resourcesData?.map((item, index) => (
            <SwiperSlide key={index}>
              <div className={styles.card}>
                <div className={styles.imageBox}>
                  <img src={item.image} alt="" />
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {!user && (
        <p className="downloadYour">
          <span onClick={() => router.push("/SignUp")}>Sign up</span> to download your free magazine.
        </p>
      )}

      <div className="KnowMoreBtn">
        <CustomButton text="EXPLORE MORE" onClick={() => router.push("/Magazine")} />
      </div>
    </section>
  );
};

export default Resources;
