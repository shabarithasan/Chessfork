"use client";

import ChessEvaluationGraph from "./ChessEvaluationGraph";
import { useState } from "react";
import { PandaMascot } from "@/components/mascot/PandaMascot";

/* ── Types ── */

interface ReportTabPlayer {
  name: string;
  avatarUrl?: string;
  accuracy: number;
}

export interface ReportTabStats {
  Brilliant: { left: number; right: number };
  Excellent: { left: number; right: number };
  Great: { left: number; right: number };
  Best: { left: number; right: number };
  Good: { left: number; right: number };
  Inaccuracy: { left: number; right: number };
  Mistake: { left: number; right: number };
  Blunder: { left: number; right: number };
}

interface ReportTabPhase {
  left: "good" | "bad";
  right: "good" | "bad";
}

interface ReportTabProps {
  player1: ReportTabPlayer;
  player2: ReportTabPlayer;
  statistics: ReportTabStats;
  gameRating: { left: number; right: number };
  coachReview: { left: string; right: string };
  phaseAnalysis: {
    opening: ReportTabPhase;
    middlegame: ReportTabPhase;
    endgame: ReportTabPhase;
  };
  mistakesCount: number;
  graphData?: { currentScore: string };
  gameHistory?: Array<{ moveNumber: number; score: number; status: string }>;
  currentMoveIndex?: number;
  onPointClick?: (index: number) => void;
  onClassificationClick?: (key: keyof ReportTabStats, side: "left" | "right") => void;
  onStartReview?: () => void;
  onLearnFromMistakes?: () => void;
}

/* ── Badge image map (chessigma CDN) ── */

const BADGE_IMG: Record<string, string> = {
  sigma: "https://cdn.chessigma.dev/moves/sigma.png",
  very_good: "https://cdn.chessigma.dev/moves/very_good.png",
  best: "https://cdn.chessigma.dev/moves/best.png",
  good: "https://cdn.chessigma.dev/moves/good.png",
  inaccuracy: "https://cdn.chessigma.dev/moves/inaccuracy.png",
  mistake: "https://cdn.chessigma.dev/moves/mistake.png",
  blunder: "https://cdn.chessigma.dev/moves/blunder.png",
};

/* ── Stat config (maps to chessigma labels & badges) ── */

const STAT_ROWS: {
  key: keyof ReportTabStats;
  label: string;
  badge: string;
  zeroColor: string;
  countColor: string;
}[] = [
  { key: "Brilliant", label: "Sigma",    badge: "sigma",     zeroColor: "#525252", countColor: "#525252" },
  { key: "Excellent", label: "Awesome",  badge: "very_good", zeroColor: "#525252", countColor: "#658ba7" },
  { key: "Great",     label: "Great",    badge: "good",      zeroColor: "#525252", countColor: "#6b8841" },
  { key: "Best",      label: "Best",     badge: "best",      zeroColor: "#525252", countColor: "#6b8841" },
  { key: "Good",      label: "Good",     badge: "good",      zeroColor: "#525252", countColor: "#6b8841" },
  { key: "Inaccuracy",label: "Strange",  badge: "inaccuracy",zeroColor: "#525252", countColor: "#eac069" },
  { key: "Mistake",   label: "Bad",      badge: "mistake",   zeroColor: "#525252", countColor: "#d88c39" },
  { key: "Blunder",   label: "Clown",    badge: "blunder",   zeroColor: "#525252", countColor: "#a2251c" },
];

/* ── Panda SVG Mascot ── */

/* ── Coach Review Badge SVG ── */

function CoachBadge({ label }: { label: string }) {
  const isBad = label === "bad";
  const color = isBad ? "#c0392b" : "#27ae60";
  const dark = isBad ? "#5a1610" : "#1e6b3a";
  return (
    <svg viewBox="0 0 300 300" width={52} height={52} style={{ flex: "0 0 auto", transform: "rotate(-5deg)" }}>
      <svg x={89} y={52} width={122} height={96} viewBox="232 172 576 452" overflow="visible">
        <path fill={color} d="M586.011 223.837C591.491 213.352 597.194 202.671 605.445 194.058C631.188 167.186 673.829 160.354 706.735 177.519C743.148 196.514 757.944 239.666 749.808 278.455C748.678 283.841 747.137 289.122 745.559 294.392C768.652 313.183 783.4 337.442 795.932 363.92C802.988 380.485 809.77 402.12 811.889 420.059C818.927 477.383 807.679 528.215 771.643 574.286C768.485 578.272 765.209 582.163 761.82 585.954C755.094 580.426 713.707 557.967 705.723 556.645C705.374 557.151 704.31 558.806 703.927 559.107C698.772 558.847 678.284 569.941 671.893 572.618C656.652 579.002 641.414 585.939 625.848 591.609C603.28 599.851 580.367 607.118 557.173 613.387C549.247 615.514 541.287 617.514 533.297 619.385C531.819 619.74 523.008 621.733 522.164 622.08C519.522 622.426 515.873 622.327 514.316 622.554C511.352 621.09 494.629 617.467 490.589 616.421C474.366 612.358 458.277 607.778 442.347 602.688C413.031 593.273 384.654 582.83 356.878 569.446C347.729 565.038 338.492 560.518 329.252 556.321L328.298 557.547C324.188 557.61 295.14 574.309 289.611 577.695C287.765 578.825 279.188 584.327 277.905 584.527C271.633 576.213 264.4 567.221 258.978 558.448C231.747 514.385 222.87 471.647 229.713 420.721C232.195 405.54 238.702 377.053 246.568 363.399C257.942 337.839 275.504 311.823 297.592 294.3C291.474 277.729 291.335 253.811 295.636 236.766C301.283 213.871 315.83 194.174 336.052 182.043C355.825 170.176 379.52 166.7 401.868 172.389C431.377 179.971 447.367 198.422 462.034 223.4C473.456 219.435 481.401 217.445 493.06 214.633C503.371 213.078 527.627 211.369 537.477 213.213C556.77 215.336 567.612 217.494 586.011 223.837Z" />
        <path fill={dark} d="M518.491 390.052C538.005 375.931 551.816 371.279 576.579 374.723C616.129 380.224 637.992 425.707 678.787 425.435C685.368 425.392 699.443 419.508 704.589 424.219C706.041 427.155 703.982 432.628 702.899 435.791C697.141 452.603 684.393 465.089 669.964 474.705C666.67 476.468 663.451 478.246 660.095 479.892C618.395 500.333 565.927 492.509 532.435 460.221C527.235 455.208 523.099 449.904 518.638 444.243C482.004 495.887 420.751 503.21 366.922 474.183C350.719 463.434 336.399 448.358 332.372 428.717C331.979 426.802 331.893 425.815 332.658 424.015C336.12 420.577 344.277 423.733 348.599 424.636C378.076 430.799 401.739 407.506 423.581 391.62C454.144 369.391 488.015 366.769 518.491 390.052Z" />
        <rect x={489} y={532} width={60} height={9} rx={4.5} fill={dark} />
        <rect x={578} y={254} width={152} height={46} rx={22} fill={dark} />
        <rect x={314} y={254} width={152} height={46} rx={22} fill={dark} />
        <path fill="#f0c4bf" d="M605.415 310.717C620.64 313.024 639.03 308.759 654.589 310.553C659.31 311.098 674.629 311.595 679.099 310.75C678.578 320.829 677.057 328.403 670.161 336.218C663.565 343.693 654.735 348.359 644.725 348.95C634.643 349.551 624.746 346.048 617.287 339.238C608.462 331.243 606.024 322.152 605.415 310.717Z" />
        <path fill={dark} d="M605.415 310.717C620.64 313.024 639.03 308.759 654.589 310.553C659.31 311.098 674.629 311.595 679.099 310.75C678.578 320.829 677.057 328.403 670.161 336.218C663.565 343.693 654.735 348.359 644.725 348.95C634.643 349.551 624.746 346.048 617.287 339.238C608.462 331.243 606.024 322.152 605.415 310.717Z" />
        <path fill="#f0c4bf" d="M361.345 310.92C364.061 309.732 428.056 309.925 435.05 310.394C434.746 313.827 434.515 316.989 433.742 320.355C426.873 350.24 388.222 359.336 369.048 335.169C363.221 327.825 361.529 320.134 361.345 310.92Z" />
        <path fill={dark} d="M361.345 310.92C364.061 309.732 428.056 309.925 435.05 310.394C434.746 313.827 434.515 316.989 433.742 320.355C426.873 350.24 388.222 359.336 369.048 335.169C363.221 327.825 361.529 320.134 361.345 310.92Z" />
        <path fill={dark} d="M541.635 342.297C545.578 341.15 549.703 343.422 550.843 347.367C551.982 351.313 549.703 355.434 545.755 356.566C541.818 357.695 537.71 355.423 536.573 351.488C535.437 347.553 537.701 343.441 541.635 342.297Z" />
        <path fill={dark} d="M496.01 342.396C498.565 341.566 501.369 342.185 503.337 344.014C505.304 345.843 506.126 348.595 505.484 351.204C504.842 353.812 502.837 355.868 500.246 356.575C496.369 357.633 492.356 355.404 491.206 351.554C490.056 347.703 492.188 343.638 496.01 342.396Z" />
      </svg>
      <g fill={color} stroke={color}>
        <circle cx={150} cy={150} r={138} fill="none" strokeWidth={4} />
        <circle cx={150} cy={150} r={118} fill="none" strokeWidth={9} />
        <text x={150} y={194} stroke="none" fontFamily="'Space Grotesk', Inter, sans-serif" fontWeight={800} fontSize={52} textAnchor="middle" dominantBaseline="middle" textLength={140} lengthAdjust="spacingAndGlyphs">
          {label.toUpperCase()}
        </text>
      </g>
    </svg>
  );
}

/* ── Stat count display ── */

function StatCount({ count, color, onClick }: { count: number; color: string; onClick?: () => void }) {
  if (count === 0) {
    return (
      <span className="font-mono text-[13px] font-medium tabular-nums" style={{ color: "#525252" }}>
        {count}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer font-mono text-[13px] font-semibold tabular-nums transition-[filter,transform] duration-150 active:scale-[0.96] hover:brightness-125"
      style={{ color }}
    >
      {count}
    </button>
  );
}

/* ── Badge icon ── */

function BadgeIcon({ badge, label }: { badge: string; label: string }) {
  const src = BADGE_IMG[badge];
  if (!src) return null;
  return (
    <div title={label} className="inline-block">
      <img alt={label} width={16} height={16} decoding="async" src={src} style={{ color: "transparent" }} />
    </div>
  );
}

/* ── Phase icon ── */

function PhaseIcon({ rating }: { rating: "good" | "bad" }) {
  const src = rating === "good" ? BADGE_IMG.good : BADGE_IMG.blunder;
  return (
    <div title={rating === "good" ? "Good Move" : "Blunder"} className="inline-block">
      <img alt={rating === "good" ? "Good Move" : "Blunder"} width={18} height={18} decoding="async" src={src} style={{ color: "transparent" }} />
    </div>
  );
}

/* ── Main Component ── */

export function ReportTab({
  player1, player2, statistics, gameRating, coachReview, phaseAnalysis,
  mistakesCount, graphData, gameHistory, currentMoveIndex, onPointClick,
  onClassificationClick, onStartReview, onLearnFromMistakes,
}: ReportTabProps) {
  const [p1ImgError, setP1ImgError] = useState(false);
  const [p2ImgError, setP2ImgError] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const showP1Img = player1.avatarUrl && !p1ImgError;
  const showP2Img = player2.avatarUrl && !p2ImgError;

  const reportScores = (gameHistory ?? []).map((p) =>
    Math.max(0, Math.min(100, p.score / 2 + 50)),
  );
  const reportAnnotations: Record<number, string> = {};
  (gameHistory ?? []).forEach((p, i) => {
    const key = p.status;
    if (["brilliant", "excellent", "blunder", "mistake"].includes(key)) {
      reportAnnotations[i] = key;
    }
  });

  const visibleRows = showAll ? STAT_ROWS : STAT_ROWS.slice(0, 6);

  return (
    <div className="flex flex-col text-[#171717]">
      {/* ── 1. Mascot & Speech Bubble ── */}
      <div className="flex shrink-0 items-center gap-3 mb-3.5">
        <div className="shrink-0 drop-shadow-[0_5px_12px_rgba(0,0,0,.45)]">
          <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
            <PandaMascot size={96} />
          </div>
        </div>
        <div className="relative self-center rounded-xl bg-[#f5f5f4] px-3.5 py-[11px] text-[13.5px] font-medium leading-[1.42] text-neutral-800">
          <span className="absolute -left-[5px] top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 rounded-[2px] bg-[#f5f5f4]" />
          Let me show you the key moments.
        </div>
      </div>

      {/* ── 2. Evaluation Graph ── */}
      <ChessEvaluationGraph
        scores={reportScores}
        annotations={reportAnnotations}
        currentMoveIndex={currentMoveIndex}
        onMoveSelect={onPointClick}
      />

      {/* ── 3. Player Profiles & Stats ── */}
      <div className="shrink-0 mt-3">
        {/* Name row */}
        <div className="grid grid-cols-[1fr_104px_1fr] items-center h-[18px] mb-1.5">
          <span className="truncate text-center font-medium text-neutral-200 text-xs">
            {player1.name}
          </span>
          <span />
          <span className="truncate text-center font-medium text-neutral-200 text-xs">
            {player2.name}
          </span>
        </div>

        {/* Avatar row */}
        <div className="grid grid-cols-[1fr_104px_1fr] items-center h-16">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[10px] bg-neutral-700 text-[21px] font-bold text-neutral-300">
              {showP1Img ? (
                <img src={player1.avatarUrl} alt={player1.name} className="h-full w-full object-cover" onError={() => setP1ImgError(true)} />
              ) : (
                player1.name[0]?.toUpperCase() ?? "?"
              )}
            </div>
          </div>
          <span />
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[10px] bg-neutral-700 text-[21px] font-bold text-neutral-300 border-2 border-amber-400">
              {showP2Img ? (
                <img src={player2.avatarUrl} alt={player2.name} className="h-full w-full object-cover" onError={() => setP2ImgError(true)} />
              ) : (
                player2.name[0]?.toUpperCase() ?? "?"
              )}
            </div>
          </div>
        </div>

        {/* Accuracy row */}
        <div className="grid grid-cols-[1fr_104px_1fr] items-center h-[54px]">
          <div className="flex justify-center">
            <div className="flex items-center justify-center rounded-lg font-mono text-base font-semibold tabular-nums h-[42px] w-[88px] bg-[#f5f5f4] text-[#171717]">
              {(player1.accuracy ?? 0).toFixed(1)}
            </div>
          </div>
          <span className="text-center text-[12.5px] text-neutral-400">Accuracy</span>
          <div className="flex justify-center">
            <div className="flex items-center justify-center rounded-lg font-mono text-base font-semibold tabular-nums h-[42px] w-[88px] bg-neutral-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
              {(player2.accuracy ?? 0).toFixed(1)}
            </div>
          </div>
        </div>

        {/* Stat rows */}
        {visibleRows.map((row) => {
          const s = statistics[row.key];
          return (
            <div key={row.key} className="grid grid-cols-[1fr_104px_1fr] items-center h-[27px]">
              <div className="flex justify-center">
                <StatCount count={s.left} color={row.countColor} onClick={onClassificationClick ? () => onClassificationClick(row.key, "left") : undefined} />
              </div>
              <div className="flex items-center gap-2.5 justify-center">
                <BadgeIcon badge={row.badge} label={row.label} />
                <span className="text-[13px] text-neutral-300">{row.label}</span>
              </div>
              <div className="flex justify-center">
                <StatCount count={s.right} color={row.countColor} onClick={onClassificationClick ? () => onClassificationClick(row.key, "right") : undefined} />
              </div>
            </div>
          );
        })}

        {/* Toggle all button */}
        <button
          type="button"
          aria-label="Show all classifications"
          onClick={() => setShowAll(!showAll)}
          className="flex w-full items-center justify-center rounded-md text-neutral-400 transition-[background-color,color,transform] duration-150 active:scale-[0.98] hover:bg-neutral-700 hover:text-white h-6"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-[15px] w-[15px] transition-transform duration-200 ${showAll ? "rotate-180" : ""}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Game Rating */}
        <div className="grid grid-cols-[1fr_104px_1fr] items-center h-[54px]">
          <div className="flex justify-center">
            <div className="flex items-center justify-center rounded-lg font-mono text-base font-semibold tabular-nums h-[42px] w-[88px] bg-[#f5f5f4] text-[#171717]">
              {gameRating.left}
            </div>
          </div>
          <span className="text-center text-[12.5px] text-neutral-400">Game rating</span>
          <div className="flex justify-center">
            <div className="flex items-center justify-center rounded-lg font-mono text-base font-semibold tabular-nums h-[42px] w-[88px] bg-neutral-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
              {gameRating.right}
            </div>
          </div>
        </div>

        {/* Coach Review */}
        <div className="grid grid-cols-[1fr_104px_1fr] items-center h-[64px]">
          <div className="flex justify-center">
            <CoachBadge label={coachReview.left} />
          </div>
          <span className="text-center text-[12.5px] text-neutral-400">Coach Review</span>
          <div className="flex justify-center">
            <CoachBadge label={coachReview.right} />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-neutral-700/60 my-[9px]" />

        {/* Phase Analysis */}
        {(["opening", "middlegame", "endgame"] as const).map((phase) => (
          <div key={phase} className="grid grid-cols-[1fr_104px_1fr] items-center h-7">
            <div className="flex justify-center">
              <PhaseIcon rating={phaseAnalysis[phase].left} />
            </div>
            <span className="text-center text-[12.5px] text-neutral-400 capitalize">{phase}</span>
            <div className="flex justify-center">
              <PhaseIcon rating={phaseAnalysis[phase].right} />
            </div>
          </div>
        ))}
      </div>

      {/* Spacer */}
      <div className="mt-auto" />

      {/* CTA */}
      <button
        type="button"
        onClick={onStartReview}
        className="flex shrink-0 items-center justify-center rounded-lg bg-amber-400 text-[15px] font-semibold text-[#171717] shadow-[0_4px_14px_rgba(245,158,11,.2)] transition-[background-color,box-shadow,opacity,transform] duration-300 active:scale-[0.98] disabled:active:scale-100 hover:bg-amber-500 mt-4 h-[46px]"
      >
        Start review
      </button>

      {/* Footer */}
      <button
        type="button"
        onClick={onLearnFromMistakes}
        className="flex shrink-0 items-center justify-center gap-2 text-[13px] text-neutral-400 transition-[color,transform] duration-150 active:scale-[0.96] hover:text-white mt-[11px]"
      >
        Learn from your mistakes
        {mistakesCount > 0 && (
          <span className="rounded-full bg-[rgba(216,140,57,.16)] px-2 font-mono text-[11px] font-semibold leading-4 tabular-nums text-[#d88c39]">
            {mistakesCount}
          </span>
        )}
      </button>
    </div>
  );
}
