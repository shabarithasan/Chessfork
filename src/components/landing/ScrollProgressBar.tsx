"use client";

import { motion, useScroll } from "framer-motion";

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();

  return (
    <>
      <motion.div className="knightowl-scroll-progress" style={{ scaleX: scrollYProgress }} aria-hidden="true" />

      <style>{`
        .knightowl-scroll-progress {
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
          height: 2px;
          left: 0;
          position: fixed;
          right: 0;
          top: 0;
          transform-origin: 0 50%;
          will-change: transform;
          z-index: 90;
        }
      `}</style>
    </>
  );
}
