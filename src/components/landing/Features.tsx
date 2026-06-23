"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";

import { cn } from "@/lib/utils";

const FeatureEffects = dynamic(() => import("./FeatureEffects").then((mod) => mod.FeatureEffects), { ssr: false });

type Feature = {
  body: string;
  eyebrow: string;
  headline: string[];
  id: string;
  mirrored?: boolean;
  pills?: string[];
  visual: "engine" | "coach" | "share";
};

const features: Feature[] = [
  {
    id: "engine",
    eyebrow: "ENGINE",
    headline: ["The world's strongest chess engine.", "In your browser. For free."],
    body:
      "Knightowl runs Stockfish 18 — the same engine grandmasters use to prepare for world championships. Every move gets analyzed at depth 18+, giving you insights that used to cost hundreds per month.",
    pills: ["Depth 18+", "3 Lines per move", "Stockfish 18"],
    visual: "engine",
  },
  {
    id: "coach",
    eyebrow: "AI COACH",
    headline: ["Stop guessing why you lose.", "Start knowing."],
    body:
      "Our AI coach analyzes patterns across all your games. Not just one blunder — your recurring weaknesses, your strongest openings, and exactly what to practice next to climb the fastest.",
    mirrored: true,
    visual: "coach",
  },
  {
    id: "share",
    eyebrow: "SHARE",
    headline: ["Show the world", "your best games."],
    body:
      "One click generates a beautiful report card — perfect for sharing on X, Reddit, or WhatsApp. Every card includes accuracy, opening name, move grades, and your Knightowl watermark.",
    visual: "share",
  },
];

function FeatureHeadline({ lines }: { lines: string[] }) {
  return (
    <h2 className="knightowl-feature-headline mt-4 font-display text-[36px] font-extrabold leading-[1.1] tracking-normal text-[var(--text-primary)] md:text-[52px]">
      {lines.map((line) => (
        <span className="block overflow-hidden" key={line}>
          {line.split(" ").map((word, index) => (
            <span className="inline-block overflow-hidden align-bottom" key={`${word}-${index}`}>
              <span className="knightowl-feature-word inline-block pr-[0.26em]">{word}</span>
            </span>
          ))}
        </span>
      ))}
    </h2>
  );
}

function EngineVisual() {
  return (
    <div className="knightowl-engine-card knightowl-feature-visual relative overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,#00d4aa18,transparent_34%)]" />
      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full border border-[#00c2ff40] bg-[#00c2ff10] px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]">
            BRILLIANT ⭐
          </span>
          <span className="font-mono text-sm text-[var(--accent)]">+2.4</span>
        </div>

        <div className="mt-9">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Best move was</p>
          <p className="mt-2 font-display text-6xl font-extrabold leading-none text-[var(--text-primary)]">Nf3</p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-[1fr_0.9fr]">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/[0.06] bg-[#050508]">
            <svg viewBox="0 0 320 320" className="h-full w-full" role="img" aria-label="Engine suggestion board">
              <defs>
                <linearGradient id="engineArrow" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#00d4aa" />
                  <stop offset="100%" stopColor="#00c2ff" />
                </linearGradient>
                <marker id="arrowHead" markerHeight="8" markerWidth="8" orient="auto" refX="6" refY="3">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#00d4aa" />
                </marker>
              </defs>
              {Array.from({ length: 64 }, (_, index) => {
                const row = Math.floor(index / 8);
                const col = index % 8;
                return <rect fill={(row + col) % 2 === 0 ? "#f0f4f8" : "#111118"} height="40" key={index} width="40" x={col * 40} y={row * 40} />;
              })}
              <line markerEnd="url(#arrowHead)" opacity="0.95" stroke="url(#engineArrow)" strokeLinecap="round" strokeWidth="5" x1="100" x2="220" y1="220" y2="100" />
              <line markerEnd="url(#arrowHead)" opacity="0.55" stroke="#00d4aa" strokeLinecap="round" strokeWidth="4" x1="180" x2="260" y1="260" y2="180" />
              <line markerEnd="url(#arrowHead)" opacity="0.4" stroke="#00c2ff" strokeLinecap="round" strokeWidth="4" x1="60" x2="140" y1="160" y2="80" />
              {([
                ["♘", 100, 229, "#050508"],
                ["♔", 220, 109, "#050508"],
                ["♕", 140, 149, "#050508"],
                ["♖", 60, 269, "#f0f4f8"],
              ] as const).map(([piece, x, y, color]) => (
                <text fill={color} fontSize="28" fontWeight="800" key={`${piece}-${x}`} textAnchor="middle" x={Number(x)} y={Number(y)}>
                  {piece}
                </text>
              ))}
            </svg>
          </div>

          <div className="space-y-3">
            {[
              ["1", "Nf3", "Develops with tempo"],
              ["2", "Bb5+", "Forces the king"],
              ["3", "Qe2", "Keeps the pin"],
            ].map(([rank, move, copy]) => (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4" key={move}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[var(--text-muted)]">LINE {rank}</span>
                  <strong className="text-[var(--accent)]">{move}</strong>
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CoachVisual() {
  const weaknessCards = [
    {
      color: "var(--red)",
      label: "Time pressure",
      stat: "73%",
      copy: "Endgames lost under 2 minutes",
    },
    {
      color: "var(--orange)",
      label: "Tactical pattern",
      stat: "41%",
      copy: "Missed knight forks after move 18",
    },
    {
      color: "var(--amber)",
      label: "Opening drift",
      stat: "62%",
      copy: "Early plans fade in Sicilian structures",
    },
  ];

  return (
    <div className="knightowl-feature-visual knightowl-coach-phone relative mx-auto w-full max-w-[430px] rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,#15151f,#08080d)] p-4 shadow-[0_40px_80px_rgba(0,0,0,0.55)]">
      <div className="rounded-[22px] border border-white/[0.06] bg-[#050508] p-5">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--accent)]">Coach report</p>
        <h3 className="mt-4 font-display text-4xl font-extrabold leading-none text-[var(--text-primary)]">Next climb plan</h3>

        <div className="mt-7 space-y-3">
          {weaknessCards.map((card) => (
            <article
              className="knightowl-coach-card rounded-2xl border bg-white/[0.025] p-4"
              key={card.label}
              style={{ borderColor: card.color, boxShadow: `inset 3px 0 0 ${card.color}` }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{card.label}</span>
                <span className="font-mono text-lg font-bold" style={{ color: card.color }}>
                  {card.stat}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{card.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShareVisual() {
  return (
    <div className="knightowl-feature-visual">
      <div className="knightowl-share-card relative mx-auto aspect-[1200/630] w-full max-w-[720px] overflow-hidden rounded-[20px] border border-[var(--border)] bg-[linear-gradient(135deg,#111118,#050508_52%,#0d0d14)] p-6 shadow-[0_40px_80px_rgba(0,0,0,0.55)]">
        <div className="knightowl-share-shine" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--accent)]">Knightowl report</p>
              <h3 className="mt-3 font-display text-[clamp(2rem,5vw,4.8rem)] font-extrabold leading-none text-[var(--text-primary)]">Brilliant win</h3>
            </div>
            <div className="rounded-full border border-[#00d4aa30] bg-[#00d4aa10] px-3 py-1.5 font-mono text-xs text-[var(--accent)]">88% ACC</div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="text-sm text-[var(--text-secondary)]">mr-demon-only</span>
                <strong className="text-[var(--text-primary)]">1-0</strong>
                <span className="text-sm text-[var(--text-secondary)]">opponent</span>
              </div>
              <p className="mt-4 text-sm text-[var(--text-secondary)]">Opening</p>
              <p className="font-display text-3xl font-bold text-[var(--text-primary)]">Sicilian Defense</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Best", "12"],
                ["Great", "24"],
                ["Miss", "1"],
              ].map(([label, value]) => (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3 text-center" key={label}>
                  <p className="font-mono text-xs text-[var(--text-muted)]">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Move grades · Opening · Accuracy · Watermark</span>
            <span>KNIGHTOWL</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureVisual({ visual }: { visual: Feature["visual"] }) {
  if (visual === "engine") {
    return <EngineVisual />;
  }

  if (visual === "coach") {
    return <CoachVisual />;
  }

  return <ShareVisual />;
}

function FeatureBlock({ feature }: { feature: Feature }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const visualRef = useRef<HTMLDivElement | null>(null);

  return (
    <section
      ref={sectionRef}
      className="knightowl-feature-section flex min-h-screen items-center px-5 py-20 md:px-8 md:py-32 lg:px-12 lg:py-40"
      id={feature.id === "engine" ? "features" : undefined}
    >
      <FeatureEffects featureId={feature.id} mirrored={feature.mirrored} sectionRef={sectionRef} visualRef={visualRef} />
      <div
        className={cn(
          "mx-auto grid w-full max-w-[1500px] items-center gap-12 md:grid-cols-2 md:gap-16",
          feature.mirrored ? "md:[&_.knightowl-feature-copy]:order-2 md:[&_.knightowl-feature-visual-wrap]:order-1" : "",
        )}
      >
        <div className="knightowl-feature-copy min-w-0">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">{feature.eyebrow}</p>
          <FeatureHeadline lines={feature.headline} />
          <p className="mt-6 max-w-[620px] text-[15px] font-light leading-7 text-[var(--text-secondary)] md:text-[17px] md:leading-8">{feature.body}</p>

          {feature.pills ? (
            <div className="mt-7 flex flex-wrap gap-2">
              {feature.pills.map((pill) => (
                <span className="rounded-full border border-[var(--border)] bg-white/[0.02] px-3 py-1.5 font-mono text-xs text-[var(--accent)]" key={pill}>
                  {pill}
                </span>
              ))}
            </div>
          ) : null}

          {feature.visual === "coach" ? (
            <div className="mt-7 rounded-lg border border-[#ef444430] border-l-[3px] border-l-[var(--red)] bg-[#ef444408] p-4">
              <p className="font-semibold text-[var(--text-primary)]">⚠️ Critical Weakness Found:</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                You lose 73% of endgames with under 2 minutes left. Drill: King activity in pawn endgames
              </p>
            </div>
          ) : null}
        </div>

        <div ref={visualRef} className="knightowl-feature-visual-wrap min-w-0">
          <FeatureVisual visual={feature.visual} />
        </div>
      </div>
    </section>
  );
}

export function Features() {
  return (
    <div className="knightowl-features">
      {features.map((feature) => (
        <FeatureBlock feature={feature} key={feature.id} />
      ))}

      <style>{`
        .knightowl-feature-section {
          background:
            radial-gradient(circle at 12% 20%, #00d4aa08, transparent 34%),
            radial-gradient(circle at 84% 70%, #00c2ff06, transparent 30%),
            var(--bg-primary);
        }

        .knightowl-feature-word,
        .knightowl-feature-visual-wrap,
        .knightowl-feature-visual {
          max-width: 100%;
          min-width: 0;
          will-change: transform;
        }

        .knightowl-feature-section:nth-child(2n) {
          background:
            radial-gradient(circle at 84% 20%, #00d4aa08, transparent 34%),
            radial-gradient(circle at 16% 70%, #6366f108, transparent 30%),
            var(--bg-primary);
        }

        .knightowl-engine-card {
          box-shadow:
            0 40px 80px rgba(0, 0, 0, 0.5),
            0 0 80px #00d4aa15,
            0 0 0 1px #ffffff08;
          transition:
            background 0.3s cubic-bezier(0.16, 1, 0.3, 1),
            border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .knightowl-coach-phone {
          box-shadow:
            0 40px 80px rgba(0, 0, 0, 0.55),
            0 0 80px #00d4aa12,
            0 0 0 1px #ffffff08;
          transition:
            background 0.3s cubic-bezier(0.16, 1, 0.3, 1),
            border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .knightowl-engine-card:hover,
        .knightowl-coach-phone:hover {
          background: #131320;
          border-color: rgba(0, 212, 170, 0.3);
          box-shadow:
            0 46px 95px rgba(0, 0, 0, 0.56),
            0 0 90px rgba(0, 212, 170, 0.12),
            0 0 0 1px #ffffff08;
          transform: translateY(-4px);
        }

        .knightowl-coach-card {
          transition:
            background 0.3s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .knightowl-coach-card:hover {
          background: #131320;
          transform: translateY(-4px);
        }

        .knightowl-share-card {
          transform: rotate(-3deg);
          transition:
            background 0.3s cubic-bezier(0.16, 1, 0.3, 1),
            border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .knightowl-share-card:hover {
          background: #131320;
          border-color: rgba(0, 212, 170, 0.3);
          box-shadow:
            0 50px 100px rgba(0, 0, 0, 0.58),
            0 0 80px #00d4aa18;
          transform: rotate(0deg) scale(1.02);
        }

        .knightowl-share-shine {
          animation: knightowl-share-shimmer 4s ease-in-out infinite;
          background: linear-gradient(110deg, transparent, rgba(255, 255, 255, 0.18), transparent);
          bottom: -40%;
          left: 0;
          position: absolute;
          top: -40%;
          transform: translateX(-140%) skewX(-18deg);
          will-change: transform;
          width: 28%;
          z-index: 1;
        }

        @keyframes knightowl-share-shimmer {
          0% {
            transform: translateX(-140%) skewX(-18deg);
          }

          45%, 100% {
            transform: translateX(430%) skewX(-18deg);
          }
        }

        @media (max-width: 640px) {
          .knightowl-feature-section {
            min-height: auto;
          }

          .knightowl-share-card {
            transform: rotate(0deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .knightowl-share-shine {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
