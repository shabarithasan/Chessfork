"use client";

import { motion } from "framer-motion";

interface SquigglyLinesProps {
  color?: string;
  style?: "wave" | "spiral" | "zigzag";
  className?: string;
  width?: number;
  height?: number;
}

const WAVE_PATH = "M 0 20 C 20 0, 40 40, 60 20 S 100 40, 120 20 S 160 40, 180 20 S 220 40, 240 20";
const ZIGZAG_PATH = "M 0 20 L 15 0 L 30 20 L 45 0 L 60 20 L 75 0 L 90 20 L 105 0 L 120 20 L 135 0 L 150 20";
const SPIRAL_PATH = "M 20 20 C 20 0, 60 0, 60 20 C 60 40, 20 40, 20 20 C 20 10, 45 10, 45 20 C 45 30, 30 30, 30 20";

export function SquigglyLines({
  color = "#22C55E",
  style = "wave",
  className = "",
  width = 240,
  height = 40,
}: SquigglyLinesProps) {
  const path = style === "wave" ? WAVE_PATH : style === "zigzag" ? ZIGZAG_PATH : SPIRAL_PATH;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={`${className}`}
      style={{ overflow: "visible" }}
    >
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.35}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
      {/* Glow duplicate */}
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.1}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut", delay: 0.1 }}
      />
    </svg>
  );
}
