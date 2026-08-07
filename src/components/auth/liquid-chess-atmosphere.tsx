"use client";

import { motion } from "framer-motion";

/**
 * Golden sparkle particles that drift across the scene,
 * matching the floating golden dots in the reference image.
 */
function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createSeededRandom(0xc0ffee);
const particles = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${5 + random() * 90}%`,
  top: `${5 + random() * 90}%`,
  size: 1.5 + random() * 3,
  delay: random() * 6,
  duration: 4 + random() * 5,
}));

export function LiquidChessAtmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* ─── Fullscreen cinematic chess background ─── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/chess-login-bg.jpg')" }}
      />

      {/* ─── Dark overlay for depth & readability ─── */}
      <div className="absolute inset-0 bg-black/40" />

      {/* ─── Slow-moving radial gold glow (top-left) ─── */}
      <motion.div
        animate={{
          scale: [1, 1.2, 0.95, 1],
          x: [0, 60, -30, 0],
          y: [0, -40, 30, 0],
        }}
        className="absolute -left-40 -top-40 size-[36rem] rounded-full bg-amber-500/8 blur-[120px]"
        transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
      />

      {/* ─── Slow-moving radial gold glow (bottom-right) ─── */}
      <motion.div
        animate={{
          scale: [1.1, 0.9, 1.15, 1.1],
          x: [0, -60, 20, 0],
          y: [0, 50, -30, 0],
        }}
        className="absolute -bottom-32 -right-36 size-[32rem] rounded-full bg-amber-400/6 blur-[110px]"
        transition={{ duration: 22, ease: "easeInOut", repeat: Infinity }}
      />

      {/* ─── Orbiting golden arc (top) ─── */}
      <motion.div
        animate={{ rotate: [0, 360] }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        transition={{ duration: 45, ease: "linear", repeat: Infinity }}
      >
        <div className="size-[50vw] max-w-[700px] rounded-full border border-amber-400/10" />
      </motion.div>

      {/* ─── Orbiting golden arc (inner) ─── */}
      <motion.div
        animate={{ rotate: [360, 0] }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        transition={{ duration: 55, ease: "linear", repeat: Infinity }}
      >
        <div className="size-[36vw] max-w-[520px] rounded-full border border-amber-300/8" />
      </motion.div>

      {/* ─── Floating golden sparkle particles ─── */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          animate={{
            opacity: [0, 0.9, 0.5, 0],
            y: [0, -30, -15, 0],
            scale: [0.6, 1, 0.8, 0.6],
          }}
          className="absolute rounded-full bg-amber-300"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
          }}
          transition={{
            delay: p.delay,
            duration: p.duration,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />
      ))}

      {/* ─── Subtle vignette for cinematic feel ─── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.65)_100%)]" />
    </div>
  );
}
