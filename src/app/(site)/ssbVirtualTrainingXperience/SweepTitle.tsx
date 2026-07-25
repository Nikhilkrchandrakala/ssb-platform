"use client";

import { useEffect, useRef } from "react";

/**
 * Renders the shimmering "VTX is a preparatory bridge" headline and, after
 * the sweep animation finishes (2s, matching the CSS animation duration in
 * legacy-custom.css), adds "sweep-done" so the shimmer settles. Ported from
 * GtoTrain.jsx's `document.querySelector(".sct-title-gtx")` useEffect, using
 * a ref instead of a global selector since this is now a scoped component.
 */
export default function SweepTitle() {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.classList.add("sweep-done");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <h1 ref={ref} className="sct-title-gtx">
      <span className="title-gtx shimmerText">VTX™ is a preparatory bridge — designed to support authentic performance</span>
    </h1>
  );
}
