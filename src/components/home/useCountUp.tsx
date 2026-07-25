"use client";

import { useEffect, useRef, useState } from "react";

export default function useCountUp(target: number, duration = 2000) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const node = ref.current;
    let animationFrame: number;

    const animate = (startTime: number) => {
      const step = (currentTime: number) => {
        const progress = Math.min((currentTime - startTime) / duration, 1);

        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * target));

        if (progress < 1) {
          animationFrame = requestAnimationFrame(step);
        }
      };

      animationFrame = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCount(0); // reset every time
          animate(performance.now());
        }
      },
      {
        threshold: 0.5, // 50% visible
      }
    );

    if (node) observer.observe(node);

    return () => {
      if (node) observer.unobserve(node);
      cancelAnimationFrame(animationFrame);
    };
  }, [target, duration]);

  return { ref, count };
}
