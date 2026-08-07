"use client";

import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import Link from "next/link";
import { Fragment, useRef } from "react";
import { CoolMode } from "@/registry/magicui/cool-mode";
import { MagicCard } from "@/registry/magicui/magic-card";

const headlineLines = [
  [
    { text: "Analyze.", accent: false },
    { text: "Learn.", accent: false },
  ],
  [{ text: "Dominate.", accent: true }],
];

const squares = Array.from({ length: 64 }, (_, index) => {
  const row = Math.floor(index / 8);
  const col = index % 8;
  return { row, col, light: (row + col) % 2 === 0 };
});

const pieces = [
  { piece: "♔", col: 6, row: 1, color: "#050508" },
  { piece: "♕", col: 3, row: 3, color: "#050508" },
  { piece: "♖", col: 0, row: 7, color: "#f0f4f8" },
  { piece: "♗", col: 5, row: 5, color: "#f0f4f8" },
  { piece: "♘", col: 2, row: 6, color: "#050508" },
  { piece: "♙", col: 4, row: 2, color: "#050508" },
];

const heroEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

const wordVariants: Variants = {
  hidden: { y: 100, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.8, ease: heroEase },
  },
};

export function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const { scrollY } = useScroll();
  const cardRotateX = useTransform(scrollYProgress, [0, 0.75], [8, 0]);
  const cardScale = useTransform(scrollYProgress, [0, 1], [1, 0.97]);
  const scrollIndicatorOpacity = useTransform(scrollY, [0, 70, 150], [1, 0.35, 0]);

  return (
    <section
      ref={sectionRef}
      className="knightowl-hero relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden px-5 py-20 text-center md:px-8 md:py-32 lg:px-12 lg:py-40"
    >
      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col items-center">
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.65, ease: heroEase }}
          className="rounded-full border border-[#00d4aa30] bg-[#00d4aa08] px-4 py-1.5 text-[13px] font-medium tracking-[0.02em] text-[var(--accent)]"
        >
          ⚡ Powered by Stockfish 18 — The strongest engine ever
        </motion.div>

        <motion.h1
          variants={{
            hidden: {},
            show: {
              transition: {
                delayChildren: 0.5,
                staggerChildren: 0.1,
              },
            },
          }}
          initial="hidden"
          animate="show"
          className="knightowl-hero-headline mt-7 w-full max-w-full font-display text-[56px] font-extrabold leading-[0.95] tracking-normal text-[var(--text-primary)] md:text-[80px] lg:text-[clamp(88px,7.2vw,112px)] min-[1800px]:text-[120px]"
        >
          {headlineLines.map((line, lineIndex) => (
            <span key={lineIndex} className="block overflow-visible md:overflow-hidden md:whitespace-nowrap">
              {line.map((word, wordIndex) => (
                <Fragment key={word.text}>
                  <motion.span variants={wordVariants} className={word.accent ? "knightowl-hero-dominate inline-block italic" : "inline-block"}>
                    {word.text}
                  </motion.span>
                  {wordIndex < line.length - 1 ? " " : null}
                </Fragment>
              ))}
            </span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.75, ease: heroEase }}
          className="mt-6 max-w-[480px] text-center text-[15px] font-light leading-7 text-[var(--text-secondary)] md:text-[17px] md:leading-8"
        >
          Free unlimited chess analysis · Stockfish 18 · AI coaching · No account required
        </motion.p>

        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.75, ease: heroEase }}
          className="mt-8 flex flex-col items-center justify-center gap-3 md:flex-row"
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
            <CoolMode>
              <Link
                href="/analyze"
                data-cursor-hover
                className="knightowl-hero-primary inline-flex min-h-14 items-center justify-center rounded-full bg-[var(--accent)] px-8 text-base font-semibold text-[var(--bg-primary)]"
              >
                Analyze Your Games →
              </Link>
            </CoolMode>
          </motion.div>
          <motion.a
            href="#workflow"
            data-cursor-hover
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            className="knightowl-hero-secondary inline-flex min-h-14 items-center justify-center rounded-full border border-[var(--border)] bg-transparent px-8 text-base font-semibold text-[var(--text-secondary)]"
          >
            Watch Demo ▷
          </motion.a>
        </motion.div>

        <motion.div
          initial={{ y: 42, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.85, ease: heroEase }}
          style={{ rotateX: cardRotateX, scale: cardScale, transformPerspective: 1000 }}
          className="mt-8 w-full max-w-[680px] [transform-style:preserve-3d]"
        >
          <MagicCard
            gradientColor="#00d4aa"
            gradientFrom="#00d4aa40"
            gradientTo="#6366f140"
            gradientOpacity={1}
            className="knightowl-hero-card relative mx-auto rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] text-left"
          >
            <div className="relative h-full p-4 sm:p-5">
              <div className="absolute right-4 top-4 z-10 rounded-full border border-[#00d4aa30] bg-[#050508d9] px-3 py-1.5 font-mono text-xs text-[var(--accent)] shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                88% Accuracy · Stockfish 18
              </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_210px]">
              <div className="rounded-2xl border border-white/[0.06] bg-[#050508] p-3">
                <svg viewBox="0 0 352 352" role="img" aria-label="Knightowl chess analysis board" className="h-auto w-full overflow-hidden rounded-xl">
                  <defs>
                    <linearGradient id="moveLine" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#00d4aa" />
                      <stop offset="100%" stopColor="#00c2ff" />
                    </linearGradient>
                  </defs>
                  {squares.map((square) => (
                    <rect
                      key={`${square.row}-${square.col}`}
                      x={square.col * 44}
                      y={square.row * 44}
                      width="44"
                      height="44"
                      fill={square.light ? "#f0f4f8" : "#111118"}
                    />
                  ))}
                  <rect x="132" y="132" width="44" height="44" fill="#00d4aa24" stroke="#00d4aa" strokeWidth="2" />
                  <rect x="264" y="44" width="44" height="44" fill="#00c2ff20" stroke="#00c2ff" strokeWidth="2" />
                  <path d="M154 154 L286 66" stroke="url(#moveLine)" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
                  {pieces.map((piece) => (
                    <text
                      key={`${piece.piece}-${piece.col}-${piece.row}`}
                      x={piece.col * 44 + 22}
                      y={piece.row * 44 + 31}
                      fill={piece.color}
                      fontSize="29"
                      fontWeight="700"
                      textAnchor="middle"
                      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))" }}
                    >
                      {piece.piece}
                    </text>
                  ))}
                </svg>
              </div>

              <div className="hidden min-h-full flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 md:flex">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Best continuation</p>
                  <p className="mt-3 font-display text-4xl font-extrabold leading-none text-[var(--text-primary)]">Qe2+</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Pin the knight, keep pressure, and convert the extra tempo.</p>
                </div>
                <div className="space-y-2">
                  {["Critical swing", "Coach note", "Daily drill"].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
                      <span className="text-[var(--text-secondary)]">{item}</span>
                      <span className="size-2 rounded-full bg-[var(--accent)]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </MagicCard>
        </motion.div>
      </div>

      <motion.div
        style={{ opacity: scrollIndicatorOpacity }}
        className="pointer-events-none absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--text-muted)]"
      >
        <span>scroll</span>
        <span className="knightowl-scroll-chevron" aria-hidden="true">
          ↓
        </span>
      </motion.div>

      <style>{`
        .knightowl-hero-dominate {
          animation: knightowl-text-shimmer 3s linear infinite;
          background: linear-gradient(90deg, var(--accent), var(--accent-2), var(--accent));
          background-clip: text;
          background-size: 200% 100%;
          color: transparent;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          will-change: transform;
        }

        .knightowl-hero-headline span,
        .knightowl-hero-primary,
        .knightowl-hero-secondary {
          will-change: transform;
        }

        .knightowl-hero-primary {
          box-shadow: 0 0 0 rgba(0, 212, 170, 0);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .knightowl-hero-primary:hover {
          box-shadow: 0 0 40px #00d4aa40;
        }

        .knightowl-hero-secondary {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .knightowl-hero-secondary:hover {
          border-color: #00d4aa30;
          color: #f0f4f8;
        }

        .knightowl-hero-card {
          box-shadow:
            0 40px 80px rgba(0, 0, 0, 0.6),
            0 0 0 1px #ffffff08;
          animation: knightowl-card-float 4s ease-in-out infinite;
          transform-origin: center top;
          will-change: transform;
        }

        .knightowl-scroll-chevron {
          color: var(--accent);
          font-size: 18px;
          line-height: 1;
          animation: knightowl-chevron-bounce 1.5s ease-in-out infinite;
        }

        @keyframes knightowl-card-float {
          0%, 100% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-12px);
          }
        }

        @keyframes knightowl-chevron-bounce {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.45;
          }

          50% {
            transform: translateY(8px);
            opacity: 1;
          }
        }

        @keyframes knightowl-text-shimmer {
          0% {
            background-position: 0% 50%;
          }

          100% {
            background-position: 200% 50%;
          }
        }

        @media (max-width: 480px) {
          .knightowl-hero-headline {
            line-height: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .knightowl-hero-card,
          .knightowl-scroll-chevron {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
