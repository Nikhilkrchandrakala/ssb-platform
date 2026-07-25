"use client";

import { useState } from "react";
import "@/style/PhilosophySection.css";
import HeadingTwo from "@/components/site/HeadingTwo";
import { circles } from "@/util/data";

const Philosophy = () => {
  const [isActive, setIsActive] = useState(true);
  const [activeCircle, setActiveCircle] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleActivate = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    requestAnimationFrame(() => {
      setTimeout(() => {
        setIsActive(true);
        setIsAnimating(false);
      }, 400);
    });
  };

  const handleDeactivate = () => {
    setIsAnimating(true);
    setActiveCircle(null);
    setTimeout(() => {
      setIsActive(false);
      setIsAnimating(false);
    }, 300);
  };

  return (
    <section className="philosophy-root">
      {/* TOP TEXT */}
      <div className="top-text">
        <div style={{ marginTop: "0", marginBottom: "0" }} className="d-flex justify-content-center headingOfMargin">
          <HeadingTwo h1="Mentoring" t1="philosophy" />
        </div>
        <p className="ConceptofManasa">Concept of Manasa - Vacha – Karmana</p>

        <p className="recruitmentManasa">
          The recruitment of officers in the Indian Armed Forces through the Services Selection Board (SSB)
          evaluates thought, speech, and action together. The principle of Manasa-Vacha-Karmana—the alignment of
          thought, speech, and action—is central to this evaluation.
        </p>
      </div>

      {/* MAIN AREA */}
      <div className="main-area">
        {/* LEFT – CIRCLES */}
        <div className="circle-area">
          {/* SINGLE CIRCLE with smooth exit */}
          {!isActive && (
            <div className="coin_Of_single">
              <div className={`glow-wrapper ${isAnimating ? "exiting" : ""}`} onMouseEnter={handleActivate}>
                <div className="glow-circle">
                  <span>Limitless &amp; Fearless</span>
                </div>
              </div>

              <p className="recruitmentManasa">
                When the Manasa-Vacha-Karmana synchronizes, the human being becomes Limitless & Fearless
              </p>
            </div>
          )}

          {/* VENN DIAGRAM with smooth entrance */}
          {isActive && (
            <div className="venn-container">
              <div className="venn" onMouseLeave={handleDeactivate}>
                {circles.map((c) => (
                  <div
                    key={c.id}
                    className={`venn-circle ${c.id}
                                      ${activeCircle === c.id ? "focus" : ""}
                                      ${activeCircle && activeCircle !== c.id ? "dim" : ""}
                                    `}
                    onMouseEnter={() => setActiveCircle(c.id)}
                  >
                    <span>{c.id.charAt(0).toUpperCase() + c.id.slice(1)}</span>
                  </div>
                ))}

                {/* Intersection areas */}
                <div className="intersection intersection-1"></div>
                <div className="intersection intersection-2"></div>
                <div className="intersection intersection-3"></div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT – STATIC CONTENT with smooth entrance */}
        {isActive && (
          <div className="text-area">
            {circles.map((c) => (
              <div
                key={c.id}
                className={`text-block ${activeCircle === c.id ? "active" : ""}`}
                onMouseEnter={() => setActiveCircle(c.id)}
              >
                <h2>{c.title}</h2>
                <p style={{ fontStyle: "italic" }}>{c.desc}</p>
                <div>{c.desc2}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Philosophy;
