"use client";

import { useEffect, useRef, useState } from "react";
import "@/style/heading.css";

export default function Heading({ h1, t1 }: { h1?: string; t1?: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState("play-sweep");

  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatus("play-sweep");

          requestAnimationFrame(() => {
            el.classList.add("active");

            timeoutId = setTimeout(() => {
              setStatus("sweep-done");
              el.classList.remove("active");
            }, 1600);
          });
        } else {
          el.classList.remove("active");
          setStatus("play-sweep");
          clearTimeout(timeoutId);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <h1 ref={headingRef} className={`headingOfSSb ${status}`}>
      <span className="word highlight first-part">{h1}</span>{" "}
      {t1 && <span className="word highlight second-part">{t1}</span>}
    </h1>
  );
}
