"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import styles from "@/style/SelectionMap.module.css";
import { STATES } from "@/util/data";

export type SelectionTab = "army" | "navy" | "airforce";

interface StateData {
  id: string;
  name: string;
  army: boolean;
  navy: boolean;
  airforce: boolean;
  path: string;
  label?: string;
  label2?: string;
  label3?: string;
}

export interface HoveredRegion {
  name: string;
  label: string;
  x: number;
  y: number;
}

interface IndiaSVGProps {
  activeTab: SelectionTab;
  hoveredRegion: HoveredRegion | null;
  setHoveredRegion: (region: HoveredRegion | null) => void;
}

const states = STATES as StateData[];

export default function IndiaSVG({ activeTab, hoveredRegion, setHoveredRegion }: IndiaSVGProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const paths = svgElement.querySelectorAll("path");

    const animateStates = () => {
      gsap.fromTo(
        paths,
        {
          x: () => gsap.utils.random(-800, 800),
          y: () => gsap.utils.random(-800, 800),
          opacity: 0,
          scale: 0.5,
        },
        {
          x: 0,
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 2,
          ease: "power3.out",
          stagger: {
            each: 0.05,
            from: "random",
          },
        }
      );
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting) {
          setIsInView(true);

          if (!hasAnimated) {
            animateStates();
            setHasAnimated(true);
          }
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(svgElement);

    return () => observer.disconnect();
  }, [hasAnimated]);

  // Re-run animation when tab changes, but only if already in view.
  useEffect(() => {
    if (!isInView || !svgRef.current) return;

    const paths = svgRef.current.querySelectorAll("path");

    gsap.fromTo(
      paths,
      {
        opacity: 0,
        scale: 0.7,
      },
      {
        opacity: 1,
        scale: 1,
        duration: 1,
        ease: "power2.out",
        stagger: 0.03,
      }
    );
  }, [activeTab, isInView]);

  return (
    <>
      <svg ref={svgRef} viewBox="0 0 1000 1100" className={styles.svg}>
        {states.map((state) => {
          const isActive = state[activeTab];

          return (
            <path
              key={state.id}
              d={state.path}
              className={`${styles.state} ${isActive ? styles.activeState : ""}`}
              onMouseEnter={(e) =>
                setHoveredRegion({
                  name: state.name,
                  label:
                    activeTab === "army"
                      ? state.label || state.name
                      : activeTab === "navy"
                        ? state.label2 || state.name
                        : state.label3 || state.name,
                  x: e.clientX,
                  y: e.clientY,
                })
              }
              onMouseLeave={() => setHoveredRegion(null)}
            />
          );
        })}
      </svg>

      {hoveredRegion && (
        <div
          className={styles.tooltip}
          style={{
            left: hoveredRegion.x + 10,
            top: hoveredRegion.y + 10,
          }}
        >
          {hoveredRegion.label}
        </div>
      )}
    </>
  );
}
