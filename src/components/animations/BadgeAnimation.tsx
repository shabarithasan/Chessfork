"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface BadgeAnimationProps {
  children: ReactNode;
  classification: string;
  index?: number;
  className?: string;
}

const CLASSIFICATION_EMOJI: Record<string, string> = {
  Brilliant: "★",
  Best: "",
  Excellent: "!",
  Inaccuracy: "?!",
  Mistake: "?",
  Blunder: "💀",
};

const animationConfig = {
  Brilliant: { scale: [0, 1.3, 1], rotate: [0, 10, -10, 0], duration: 0.6 },
  Best: { scale: [0, 1.1, 1], rotate: [0, 0], duration: 0.4 },
  Blunder: { scale: [0, 1, 1], rotate: [0, -5, 5, 0], duration: 0.5 },
  Mistake: { scale: [0, 1, 1], rotate: [0, -3, 3, 0], duration: 0.45 },
  Inaccuracy: { scale: [0, 1, 1], rotate: [0, 0], duration: 0.4 },
  Excellent: { scale: [0, 1.1, 1], rotate: [0, 0], duration: 0.4 },
};

export function BadgeAnimation({ children, classification, index = 0, className = "" }: BadgeAnimationProps) {
  const config = animationConfig[classification as keyof typeof animationConfig] ?? animationConfig.Best;

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: 1,
        scale: config.scale,
        rotate: config.rotate,
      }}
      transition={{
        duration: config.duration,
        delay: index * 0.08,
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={classification === "Blunder" ? { scale: 1.2, rotate: 5 } : { scale: 1.1 }}
    >
      {children}
    </motion.span>
  );
}

export function CriticalPulse({ children, isCritical }: { children: ReactNode; isCritical: boolean }) {
  return (
    <motion.span
      animate={isCritical ? { boxShadow: ["0 0 0 0 rgba(239,68,68,0.4)", "0 0 0 8px rgba(239,68,68,0)", "0 0 0 0 rgba(239,68,68,0)"] } : {}}
      transition={isCritical ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
      className="inline-block rounded"
    >
      {children}
    </motion.span>
  );
}

export function StaggerChildren({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function fadeInVariants(index = 0) {
  return {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.35,
        delay: index * 0.06,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };
}
