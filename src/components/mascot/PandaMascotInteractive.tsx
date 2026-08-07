"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Mood = "happy" | "sad" | "confused";

interface PandaMascotInteractiveProps {
  mood?: Mood;
  size?: number;
  className?: string;
}

const QUIPS: Record<Mood, string[]> = {
  happy: ["Bamboo-licious!", "Rawr~! ♔", "Panda power!", "Bear-ly trying!", "*nom nom*"],
  sad: ["*sigh* ♘", "Bamboo sad...", "Paw-sitively off!", "Oof.", "Missed it!"],
  confused: ["Rawr?!", "Panda-what?!", "??! ♕", "Bamboo-zled!", "Huh— 🐼?"],
};

export function PandaMascotInteractive({ mood = "happy", size = 80, className = "" }: PandaMascotInteractiveProps) {
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
    ? "M 34 44 Q 40 50 46 44"
    : displayMood === "sad"
      ? "M 34 47 Q 40 41 46 47"
      : "M 33 46 Q 40 46 47 46";
  const mouthStroke = displayMood === "happy" ? "#BDB73C" : displayMood === "sad" ? "#EF4444" : "#F59F1D";
  const browLeft = displayMood === "confused"
    ? { x1: 24, y1: 22, x2: 34, y2: 26 }
    : { x1: 24, y1: 24, x2: 34, y2: 24 };
  const browRight = displayMood === "confused"
    ? { x1: 46, y1: 26, x2: 56, y2: 22 }
    : { x1: 46, y1: 24, x2: 56, y2: 24 };
  const patchY = 30;
  const leftEyeX = 30;
  const rightEyeX = 50;

  return (
    <motion.div
      className={`relative inline-block cursor-pointer select-none ${className}`}
      style={{ width: size, height: size }}
      whileHover={{ scale: 1.15 }}
      onClick={handleClick}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg viewBox="0 0 80 80" width="100%" height="100%" style={{ display: "block" }}>
        {/* Ears */}
        <circle cx="22" cy="16" r="9" fill="#020202" />
        <circle cx="22" cy="16" r="5" fill="#2E3A52" />
        <circle cx="58" cy="16" r="9" fill="#020202" />
        <circle cx="58" cy="16" r="5" fill="#2E3A52" />

        {/* Body */}
        <ellipse cx="40" cy="56" rx="20" ry="16" fill="#BDB73C" />
        {/* Belly */}
        <ellipse cx="40" cy="58" rx="12" ry="10" fill="#ECDBBE" />

        {/* Arms */}
        <ellipse cx="22" cy="56" rx="7" ry="5" fill="#BDB73C" />
        <ellipse cx="58" cy="56" rx="7" ry="5" fill="#BDB73C" />

        {/* Legs */}
        <ellipse cx="24" cy="70" rx="8" ry="5" fill="#BDB73C" />
        <ellipse cx="56" cy="70" rx="8" ry="5" fill="#BDB73C" />

        {/* Head */}
        <circle cx="40" cy="33" r="20" fill="#ECDBBE" />

        {/* Eye patches — signature panda feature */}
        <ellipse cx={leftEyeX} cy={patchY} rx="10" ry="9" fill="#020202" />
        <ellipse cx={rightEyeX} cy={patchY} rx="10" ry="9" fill="#020202" />

        {/* Eyes */}
        <circle cx={leftEyeX} cy={patchY} r="5" fill="#F8F3E9" />
        <circle cx={rightEyeX} cy={patchY} r="5" fill="#F8F3E9" />

        {/* Pupils */}
        <motion.circle
          cx={leftEyeX} cy={patchY + eyeOffset} r="2.5" fill="#020202"
          animate={{ cy: patchY + eyeOffset }}
          transition={{ duration: 0.3 }}
        />
        <motion.circle
          cx={rightEyeX} cy={patchY + eyeOffset} r="2.5" fill="#020202"
          animate={{ cy: patchY + eyeOffset }}
          transition={{ duration: 0.3 }}
        />

        {/* Eyebrows */}
        <line {...browLeft} stroke="#020202" strokeWidth="2" strokeLinecap="round" />
        <line {...browRight} stroke="#020202" strokeWidth="2" strokeLinecap="round" />

        {/* Nose */}
        <ellipse cx="40" cy="40" rx="3" ry="2" fill="#020202" />

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

        {/* Mood cheeks */}
        {displayMood === "happy" && (
          <>
            <circle cx="23" cy="41" r="4" fill="#BDB73C" opacity={0.35} />
            <circle cx="57" cy="41" r="4" fill="#BDB73C" opacity={0.35} />
          </>
        )}
        {displayMood === "confused" && (
          <>
            <circle cx="23" cy="43" r="4" fill="#F59F1D" opacity={0.3} />
            <circle cx="57" cy="43" r="4" fill="#F59F1D" opacity={0.3} />
          </>
        )}
      </svg>

      {/* Speech bubble */}
      <AnimatePresence>
        {quip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            className="absolute -left-4 -top-8 z-50 whitespace-nowrap rounded-lg bg-[#1a1a1a] px-2.5 py-1.5 text-[10px] font-bold shadow-lg"
            style={{ color: "#BDB73C" }}
          >
            {quip}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
