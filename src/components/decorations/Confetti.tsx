"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  shape: "circle" | "square";
}

interface ConfettiProps {
  trigger: boolean;
  duration?: number;
}

const COLORS = ["#22C55E", "#FBBF24", "#4ADE80", "#FDE047", "#86EFAC", "#FACC15"];

export function Confetti({ trigger, duration = 2500 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const idCounter = useRef(0);

  useEffect(() => {
    if (!trigger) return;

    const newParticles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      newParticles.push({
        id: ++idCounter.current,
        x: 40 + Math.random() * 20,
        y: -5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * 360,
        shape: Math.random() > 0.5 ? "circle" : "square",
      });
    }
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
    }, duration);

    return () => clearTimeout(timer);
  }, [trigger, duration]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: p.shape === "circle" ? "50%" : "2px",
              backgroundColor: p.color,
            }}
            initial={{ opacity: 1, y: 0, rotate: 0, x: 0 }}
            animate={{
              opacity: [1, 0.8, 0],
              y: [0, 60 + Math.random() * 40, 100],
              x: [-15 + Math.random() * 30, -10 + Math.random() * 20, -5 + Math.random() * 10],
              rotate: [0, p.rotation, p.rotation * 2],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: duration / 1000,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
