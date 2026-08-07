"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Mood = "happy" | "sad" | "confused";

interface FrogMascotProps {
  mood?: Mood;
  size?: number;
  className?: string;
}

const QUIPS: Record<Mood, string[]> = {
  happy: ["Ribbit-rific!", "Croak~! ♔", "Leap frog!", "Bullseye!", "Ribbit!"],
  sad: ["Croak... ♘", "Ribbit? :(", "Frogot to check!", "Oof.", "Toad-ally missed!"],
  confused: ["Ribbit?!", "Froggen'd!", "??! ♕", "Hoppy mess!", "Wha— 🐸?"],
};

export function FrogMascot({ mood = "happy", size = 80, className = "" }: FrogMascotProps) {
  const [clickMood, setClickMood] = useState<Mood | null>(null);
  const [quip, setQuip] = useState("");

  const displayMood = clickMood ?? mood;

  const handleClick = useCallback(() => {
    const m = ["happy", "sad", "confused"][Math.floor(Math.random() * 3)] as Mood;
    setClickMood(m);
    const qs = QUIPS[m];
    setQuip(qs[Math.floor(Math.random() * qs.length)]);
    setTimeout(() => {
      setClickMood(null);
      setQuip("");
    }, 2000);
  }, []);

  const eyeOffset = displayMood === "happy" ? -1 : displayMood === "sad" ? 2 : 0;
  const mouthPath = displayMood === "happy"
    ? "M 32 52 Q 40 62 48 52"
    : displayMood === "sad"
      ? "M 32 56 Q 40 48 48 56"
      : "M 30 54 Q 40 54 50 54";
  const mouthStroke = displayMood === "happy" ? "#22C55E" : displayMood === "sad" ? "#EF4444" : "#FBBF24";
  const browLeft = displayMood === "confused"
    ? { x1: 28, y1: 34, x2: 36, y2: 38 }
    : { x1: 28, y1: 36, x2: 36, y2: 36 };
  const browRight = displayMood === "confused"
    ? { x1: 44, y1: 38, x2: 52, y2: 34 }
    : { x1: 44, y1: 36, x2: 52, y2: 36 };

  return (
    <motion.div
      className={`relative inline-block cursor-pointer select-none ${className}`}
      style={{ width: size, height: size }}
      whileHover={{ scale: 1.15 }}
      onClick={handleClick}
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg viewBox="0 0 80 80" width={size} height={size}>
        {/* Body */}
        <ellipse cx="40" cy="54" rx="22" ry="16" fill="#22C55E" />
        {/* Head */}
        <circle cx="40" cy="38" r="18" fill="#22C55E" />
        {/* Eyes */}
        <circle cx="32" cy="34" r="6" fill="white" />
        <circle cx="48" cy="34" r="6" fill="white" />
        <motion.circle
          cx={32} cy={34 + eyeOffset} r="3" fill="#111827"
          animate={{ cy: 34 + eyeOffset }}
          transition={{ duration: 0.3 }}
        />
        <motion.circle
          cx={48} cy={34 + eyeOffset} r="3" fill="#111827"
          animate={{ cy: 34 + eyeOffset }}
          transition={{ duration: 0.3 }}
        />
        {/* Brows */}
        <line {...browLeft} stroke="#065F46" strokeWidth="2" strokeLinecap="round" />
        <line {...browRight} stroke="#065F46" strokeWidth="2" strokeLinecap="round" />
        {/* Mouth */}
        <motion.path
          d={mouthPath}
          fill="none"
          stroke={mouthStroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{ d: mouthPath }}
          transition={{ duration: 0.3 }}
        />
        {/* Cheeks */}
        {displayMood === "happy" && (
          <>
            <circle cx="24" cy="42" r="4" fill="#4ADE80" opacity={0.4} />
            <circle cx="56" cy="42" r="4" fill="#4ADE80" opacity={0.4} />
          </>
        )}
        {/* Blush for confused */}
        {displayMood === "confused" && (
          <>
            <circle cx="24" cy="44" r="4" fill="#FBBF24" opacity={0.3} />
            <circle cx="56" cy="44" r="4" fill="#FBBF24" opacity={0.3} />
          </>
        )}
        {/* Belly */}
        <ellipse cx="40" cy="56" rx="12" ry="8" fill="#86EFAC" opacity={0.6} />
        {/* Back legs */}
        <ellipse cx="22" cy="62" rx="8" ry="5" fill="#16A34A" />
        <ellipse cx="58" cy="62" rx="8" ry="5" fill="#16A34A" />
        {/* Front legs */}
        <ellipse cx="26" cy="68" rx="4" ry="6" fill="#22C55E" />
        <ellipse cx="54" cy="68" rx="4" ry="6" fill="#22C55E" />
      </svg>

      {/* Speech bubble */}
      <AnimatePresence>
        {quip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            className="absolute -left-4 -top-8 z-50 whitespace-nowrap rounded-lg bg-[#1a1a1a] px-2.5 py-1.5 text-[10px] font-bold text-amber-400 shadow-lg"
          >
            {quip}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
