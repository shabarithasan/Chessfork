"use client";

import { useEffect } from "react";
import gsap from "gsap";

// Smooth GSAP ticker
if (typeof window !== "undefined") {
  gsap.ticker.lagSmoothing(0);
}

export function SmoothScroller({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Lock native scrolling — the CinematicSequence handles all navigation
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  return <>{children}</>;
}
