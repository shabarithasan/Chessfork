"use client";

import { Chess, type Square } from "chess.js";
import Image from "next/image";
import Link from "next/link";
import { memo, startTransition, useCallback, useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Bot,
  BrainCircuit,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clipboard,
  Download,
  ExternalLink,
  Gauge,
  Link2,
  List,
  Pause,
  Play,
  RotateCw,
  Settings2,
  Share2,
  Sparkles,
  Target,
  X,
} from "lucide-react";

import type { BoardAnimatedMove, BoardArrow, BoardOrientation, BoardPieceTheme, BoardSquareBadge, BoardTone } from "@/components/analysis/chess-board";
import { ChessBoard } from "@/components/analysis/chess-board";
import { formatOpeningName } from "@/lib/chess/openings";
import {
  accuracyForSide,
  nameForSide,
  oppositeSide,
  resolveReviewSide,
  scoreForSide,
  type PlayerSide,
} from "@/lib/chess/perspective";
import { buildAnalysisStory, formatCpLossLabel, formatCpLossValue } from "@/lib/chess/report-helpers";
import { winProbabilityFromCentipawns } from "@/lib/chess/rating";
import { buildAiCoachGameFromAnalysis, type AiCoachReport } from "@/lib/ai-coach";
import { openingPageSlugFor } from "@/data/openings";
import { buildReportCardDataFromAnalysis } from "@/lib/report-card-data";
import { clamp, cn } from "@/lib/utils";
import type { AnalysisRun, EngineLine, MoveEvaluation, MoveGrade } from "@/types/platform";

type WorkbenchTab = "analysis" | "coach" | "report" | "settings";
type MoveLabelPreset = "chessigma" | "classic" | "friendly";
type BoardContextMenuState = {
  x: number;
  y: number;
};

type MoveRow = {
  black?: MoveEvaluation;
  moveNumber: number;
  white: MoveEvaluation;
};

type GradeCounts = Record<MoveGrade, { black: number; white: number }>;

type BranchMove = {
  captured: boolean;
  fenAfter: string;
  fenBefore: string;
  from: string;
  san: string;
  to: string;
};

type BranchEvaluationResponse = {
  bestMove: string;
  cacheKey: string;
  depth: number;
  engineLines?: EngineLine[];
  mode: string;
  nodes: number;
  principalVariation: string[];
  score: number;
  tablebaseHits?: number;
};

const tabOrder: Array<{ icon: typeof Bot; key: WorkbenchTab; label: string }> = [
  { icon: Gauge, key: "report", label: "Report" },
  { icon: Bot, key: "analysis", label: "Analysis" },
  { icon: BrainCircuit, key: "coach", label: "Coach" },
  { icon: Settings2, key: "settings", label: "Settings" },
];

const goodGradeRows: MoveGrade[] = ["Brilliant", "Great", "Best", "Excellent", "Good", "Book"];
const reviewSummaryRows: MoveGrade[] = [
  "Brilliant",
  "Great",
  "Best",
  "Excellent",
  "Good",
  "Inaccuracy",
  "Mistake",
  "Blunder",
];

const gradeIconPaths: Record<MoveGrade, string> = {
  Best: "/images/brilliance_v2/svg/best.svg",
  Blunder: "/images/brilliance_v2/svg/blunder.svg",
  Book: "/images/brilliance_v2/svg/book.svg",
  Brilliant: "/images/brilliance_v2/svg/brilliant.svg",
  Excellent: "/images/brilliance_v2/svg/excellent.svg",
  Good: "/images/brilliance_v2/svg/good.svg",
  Great: "/images/brilliance_v2/svg/great_find.svg",
  Inaccuracy: "/images/brilliance_v2/svg/inaccuracy.svg",
  Mistake: "/images/brilliance_v2/svg/mistake.svg",
};

const bestMoveIconPath = "/images/brilliance_v2/svg/best.svg";
const MATE_DISPLAY_THRESHOLD = 100_000;

const replaySpeedOptions = [
  { label: "0.5x", value: 1800 },
  { label: "1x", value: 900 },
  { label: "2x", value: 450 },
] as const;

const quickInsightCacheTtlMs = 24 * 60 * 60 * 1000;

type QuickInsightCache = {
  createdAt: number;
  insight: string;
};

const replayNavButtonClassName =
  "flex h-10 w-10 items-center justify-center rounded-lg border border-[#2a2a4e] bg-[#1a1a2e] text-[#94a3b8] transition hover:border-[#00d4aa] hover:bg-[#00d4aa20] hover:text-[#00d4aa]";

const analysisActionButtonClassName =
  "inline-flex items-center justify-center rounded-[20px] border border-[#2a2a4e] bg-transparent px-3.5 py-1.5 text-xs font-medium capitalize text-[#94a3b8] transition hover:scale-[1.02] hover:bg-[#1a1a2e] disabled:cursor-not-allowed disabled:opacity-40";

const analysisPrimaryActionButtonClassName =
  "inline-flex items-center justify-center rounded-[20px] border border-[#00d4aa] bg-transparent px-3.5 py-1.5 text-xs font-medium capitalize text-[#00d4aa] transition hover:scale-[1.02] hover:bg-[#1a1a2e] disabled:cursor-not-allowed disabled:opacity-40";

const analysisCopyActionButtonClassName =
  "inline-flex items-center justify-center rounded-[20px] border border-[#2a2a4e]/75 bg-transparent px-3 py-1 text-[0.7rem] font-medium capitalize text-slate-500 transition hover:scale-[1.02] hover:bg-[#1a1a2e] hover:text-[#94a3b8]";

function safeFilenameSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const gradeMarkerClasses: Record<MoveGrade, string> = {
  Best: "border-[#22c55e]/70 bg-[#22c55e]",
  Blunder: "border-[#ef4444]/80 bg-[#ef4444]",
  Book: "border-slate-300/60 bg-slate-400",
  Brilliant: "border-[#00c2ff]/80 bg-[#00c2ff]",
  Excellent: "border-[#22c55e]/80 bg-[#22c55e]",
  Good: "border-white/70 bg-white",
  Great: "border-sky-200/80 bg-sky-300",
  Inaccuracy: "border-yellow-200/80 bg-[#f2d64b]",
  Mistake: "border-orange-200/80 bg-[#f39b30]",
};

const gradeTextClasses: Record<MoveGrade, string> = {
  Best: "text-[#8fffe7]",
  Blunder: "text-[#ff7777]",
  Book: "text-slate-300",
  Brilliant: "text-cyan-200",
  Excellent: "text-[#7df0a0]",
  Good: "text-white",
  Great: "text-sky-200",
  Inaccuracy: "text-yellow-200",
  Mistake: "text-orange-200",
};

const gradePointFill: Record<MoveGrade, string> = {
  Best: "#22c55e",
  Blunder: "#ef4444",
  Book: "#94a3b8",
  Brilliant: "#00c2ff",
  Excellent: "#22c55e",
  Good: "#f8fafc",
  Great: "#7dd3fc",
  Inaccuracy: "#f2d64b",
  Mistake: "#f39b30",
};

const gradeMoveBackgroundClasses: Record<MoveGrade, string> = {
  Best: "border-[#22c55e]/28 bg-[#22c55e]/12 hover:bg-[#22c55e]/18",
  Blunder: "border-[#ef4444]/30 bg-[#ef4444]/14 hover:bg-[#ef4444]/20",
  Book: "border-slate-300/18 bg-slate-300/[0.08] hover:bg-slate-300/12",
  Brilliant: "border-cyan-300/30 bg-cyan-300/14 hover:bg-cyan-300/20",
  Excellent: "border-emerald-500/25 bg-emerald-500/12 hover:bg-emerald-500/18",
  Good: "border-white/14 bg-white/[0.055] hover:bg-white/[0.08]",
  Great: "border-sky-300/28 bg-sky-300/14 hover:bg-sky-300/20",
  Inaccuracy: "border-yellow-300/28 bg-yellow-300/14 hover:bg-yellow-300/20",
  Mistake: "border-orange-300/28 bg-orange-300/14 hover:bg-orange-300/20",
};

const moveListGradeIcons: Record<MoveGrade, { className: string; icon: string; label: string }> = {
  Best: { className: "text-[#22c55e]", icon: "!", label: "Best" },
  Blunder: { className: "text-[#ef4444]", icon: "??", label: "Blunder" },
  Book: { className: "text-slate-400", icon: "□", label: "Book" },
  Brilliant: { className: "text-[#00c2ff]", icon: "★", label: "Brilliant" },
  Excellent: { className: "text-[#39ff88]", icon: "!!", label: "Excellent" },
  Good: { className: "text-[#22c55e]", icon: "!", label: "Good" },
  Great: { className: "text-[#39ff88]", icon: "!!", label: "Great" },
  Inaccuracy: { className: "text-yellow-300", icon: "⁈", label: "Inaccuracy" },
  Mistake: { className: "text-orange-300", icon: "?", label: "Mistake" },
};

function GradeIcon({
  className,
  grade,
}: {
  className?: string;
  grade: MoveGrade;
}) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={cn("shrink-0 object-contain", className)}
      height={32}
      loading="lazy"
      src={gradeIconPaths[grade]}
      unoptimized
      width={32}
    />
  );
}

function GradeMarker({
  className,
  grade,
}: {
  className?: string;
  grade: MoveGrade;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2.5 shrink-0 border shadow-[0_0_0_2px_rgba(0,0,0,0.18)]",
        grade === "Brilliant" ? "rotate-45 rounded-[0.15rem]" : "rounded-full",
        gradeMarkerClasses[grade],
        className,
      )}
    />
  );
}

function GradeLabel({
  grade,
  preset,
}: {
  grade: MoveGrade;
  preset: MoveLabelPreset;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.13em]", gradeTextClasses[grade])}>
      <GradeMarker grade={grade} />
      <span className="truncate">{gradeDescriptor(grade, preset)}</span>
    </span>
  );
}

function MoveEvalStrip({
  score,
  side,
}: {
  score: number;
  side: PlayerSide;
}) {
  const perspectiveScore = scoreForSide(score, side);
  const width = clamp(50 + perspectiveScore / 14, 8, 92);
  const isGoodForSide = perspectiveScore >= 0;

  return (
    <span className="relative h-1.5 w-full overflow-hidden rounded-full bg-black/28">
      <span
        className={cn("absolute inset-y-0 left-0 rounded-full", isGoodForSide ? "bg-[#00d4aa]" : "bg-[#ef4444]")}
        style={{ width: `${width}%` }}
      />
    </span>
  );
}

const ReviewMoveListSidebar = memo(function ReviewMoveListSidebar({
  className,
  keyMomentsOnly,
  labelPreset,
  moveRows,
  onSelectPly,
  onToggleKeyMomentsOnly,
  reviewSide,
  selectedPly,
}: {
  className?: string;
  keyMomentsOnly: boolean;
  labelPreset: MoveLabelPreset;
  moveRows: MoveRow[];
  onSelectPly: (ply: number) => void;
  onToggleKeyMomentsOnly: () => void;
  reviewSide: PlayerSide;
  selectedPly: number;
}) {
  return (
    <aside
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(52,49,46,0.96),rgba(36,33,31,0.98))] shadow-[0_24px_70px_rgba(0,0,0,0.28)]",
        className,
      )}
    >
      <div className="border-b border-white/10 bg-black/12 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#00d4aa]">Move list</p>
            <p className="mt-1 text-sm text-slate-300">Clickable classified moves</p>
          </div>
          <button
            type="button"
            onClick={onToggleKeyMomentsOnly}
            className={cn(
              "rounded-full border px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em]",
              keyMomentsOnly
                ? "border-[#00d4aa]/35 bg-[#00d4aa]/14 text-[#d8fff6]"
                : "border-white/10 bg-white/[0.045] text-slate-300 hover:bg-white/[0.075]",
            )}
          >
            {keyMomentsOnly ? "Key" : "All"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2 xl:px-1.5">
        {moveRows.map((row) => (
          <div key={row.moveNumber} className="grid grid-cols-[1.55rem_minmax(0,1fr)] gap-1.5 border-b border-white/[0.07] py-1.5 last:border-b-0 2xl:grid-cols-[2rem_minmax(0,1fr)] 2xl:gap-2">
            <p className="pt-2 text-right text-xs font-semibold text-slate-500">{row.moveNumber}.</p>
            <div className="grid gap-1.5">
              {([row.white, row.black].filter(Boolean) as MoveEvaluation[]).map((move) => {
                const selected = move.ply === selectedPly;

                return (
                  <button
                    key={move.ply}
                    type="button"
                    onClick={() => onSelectPly(move.ply)}
                    title={moveTooltip(move, labelPreset)}
                    className={cn(
                      "group min-w-0 rounded-[0.7rem] border px-2 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition 2xl:px-2.5",
                      gradeMoveBackgroundClasses[move.grade],
                      selected ? "ring-2 ring-[#00d4aa]/70" : "",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <GradeMarker grade={move.grade} />
                      <span className="min-w-0 flex-1 truncate text-[0.82rem] font-semibold text-white 2xl:text-sm">{move.side === "white" ? "" : "... "}{move.san}</span>
                      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-slate-400">{move.caps.toFixed(0)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <MoveEvalStrip score={move.score} side={reviewSide} />
                      <span className="shrink-0 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {formatCpLossLabel(move.cpLoss)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
});

const ColorCodedMoveList = memo(function ColorCodedMoveList({
  labelPreset,
  moveRows,
  onSelectPly,
  selectedPly,
}: {
  labelPreset: MoveLabelPreset;
  moveRows: MoveRow[];
  onSelectPly: (ply: number) => void;
  selectedPly: number;
}) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedMoveNodeRef = useRef<HTMLButtonElement | null>(null);

  const scrollSelectedMove = useCallback(() => {
    const container = scrollContainerRef.current;
    const selected = selectedMoveNodeRef.current;

    if (!container || !selected) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const selectedRect = selected.getBoundingClientRect();
    const selectedTop = selectedRect.top - containerRect.top;
    const selectedBottom = selectedRect.bottom - containerRect.top;

    if (selectedTop < 0 || selectedBottom > container.clientHeight) {
      container.scrollTo({
        behavior: "smooth",
        top: Math.max(0, container.scrollTop + selectedTop - container.clientHeight / 2 + selectedRect.height / 2),
      });
    }
  }, []);

  const attachSelectedMove = useCallback(
    (node: HTMLButtonElement | null) => {
      selectedMoveNodeRef.current = node;

      if (!node) {
        return;
      }

      window.requestAnimationFrame(scrollSelectedMove);
      window.setTimeout(scrollSelectedMove, 120);
    },
    [scrollSelectedMove],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(scrollSelectedMove);
    const timer = window.setTimeout(scrollSelectedMove, 120);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [moveRows, scrollSelectedMove, selectedPly]);

  function renderMoveCell(move?: MoveEvaluation) {
    if (!move) {
      return <div className="min-h-11 border-l-[3px] border-l-transparent px-2.5 py-2" />;
    }

    const selected = move.ply === selectedPly;
    const gradeIcon = moveListGradeIcons[move.grade];
    const moveNumberLabel = move.side === "white" ? `${move.moveNumber}.` : `${move.moveNumber}...`;

    return (
      <button
        key={move.ply}
        ref={selected ? attachSelectedMove : undefined}
        aria-current={selected ? "true" : undefined}
        data-ply={move.ply}
        data-selected={selected ? "true" : undefined}
        data-testid="analysis-move-list-move"
        type="button"
        onClick={() => onSelectPly(move.ply)}
        title={moveTooltip(move, labelPreset)}
        className={cn(
          "grid min-h-11 w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 border-l-[3px] px-2.5 py-2 text-left transition hover:bg-white/[0.055]",
          selected ? "border-l-[#00d4aa] bg-[#1a2a2a] text-[0.92rem]" : "border-l-transparent text-[0.82rem]",
        )}
      >
        <span className="text-[0.64rem] font-semibold leading-none text-slate-500">{moveNumberLabel}</span>
        <span className={cn("min-w-0 truncate font-semibold text-slate-100", selected ? "text-white" : "")}>{move.san}</span>
        <span
          aria-label={gradeIcon.label}
          className={cn("shrink-0 font-mono text-sm font-black leading-none", gradeIcon.className, selected ? "text-base" : "")}
        >
          {gradeIcon.icon}
        </span>
      </button>
    );
  }

  return (
    <div className="mb-3 overflow-hidden rounded-[1rem] border border-white/10 bg-[#0f0f16] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/14 px-3 py-2.5">
        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-[#00d4aa]">Move list</p>
        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{moveRows.length} rows</p>
      </div>
      <div
        ref={scrollContainerRef}
        className="max-h-[300px] overflow-y-auto"
        data-testid="analysis-color-move-list"
      >
        <div className="sticky top-0 z-10 grid grid-cols-2 border-b border-white/10 bg-[#111118] text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span className="px-3 py-2">White move</span>
          <span className="border-l border-white/10 px-3 py-2">Black move</span>
        </div>
        <div className="divide-y divide-white/[0.07]">
          {moveRows.map((row) => (
            <div key={row.moveNumber} className="grid grid-cols-2">
              <div className="min-w-0">{renderMoveCell(row.white)}</div>
              <div className="min-w-0 border-l border-white/[0.07]">{renderMoveCell(row.black)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

function BestMoveIcon({ className }: { className?: string }) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={cn("shrink-0 object-contain", className)}
      height={32}
      loading="lazy"
      src={bestMoveIconPath}
      unoptimized
      width={32}
    />
  );
}

function sanPieceSymbol(san: string) {
  if (san.startsWith("O-O")) return "K";

  const piece = san.replace(/[+#?!]/g, "").charAt(0);
  if (piece === "K") return "K";
  if (piece === "Q") return "Q";
  if (piece === "R") return "R";
  if (piece === "B") return "B";
  if (piece === "N") return "N";
  return "";
}

function formatEngineScore(score: number) {
  if (Math.abs(score) >= MATE_DISPLAY_THRESHOLD) {
    return score > 0 ? "+M" : "-M";
  }

  const pawns = score / 100;
  const sign = pawns > 0 ? "+" : "";
  return `${sign}${pawns.toFixed(Math.abs(pawns) >= 10 ? 1 : 2)}`;
}

function describePerspectiveEdge(score: number, side: PlayerSide, playerName: string, opponentName: string) {
  const perspectiveScore = scoreForSide(score, side);

  if (perspectiveScore >= MATE_DISPLAY_THRESHOLD) {
    return `${playerName} has a mating edge`;
  }

  if (perspectiveScore <= -MATE_DISPLAY_THRESHOLD) {
    return `${opponentName} has a mating edge`;
  }

  if (perspectiveScore >= 140) {
    return `${playerName} clearly better`;
  }

  if (perspectiveScore <= -140) {
    return `${opponentName} clearly better`;
  }

  if (perspectiveScore >= 45) {
    return `${playerName} slightly better`;
  }

  if (perspectiveScore <= -45) {
    return `${opponentName} slightly better`;
  }

  return "Roughly equal";
}

function describeOpeningPhase(move: MoveEvaluation, openingName: string) {
  if (move.phase === "opening") {
    return `This move is still inside the ${openingName} opening phase.`;
  }

  return `The game started from ${openingName}; this move is now in the ${move.phase}.`;
}

function gradeTone(grade: MoveEvaluation["grade"]) {
  if (grade === "Brilliant") {
    return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  }

  if (grade === "Best" || grade === "Excellent") {
    return grade === "Excellent"
      ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-100"
      : "border-lime-300/25 bg-lime-300/12 text-lime-100";
  }

  if (grade === "Great") {
    return "border-sky-300/25 bg-sky-300/12 text-sky-100";
  }

  if (grade === "Good" || grade === "Book") {
    return "border-lime-300/20 bg-lime-300/10 text-lime-100";
  }

  if (grade === "Inaccuracy") {
    return "border-amber-300/25 bg-amber-300/12 text-amber-100";
  }

  if (grade === "Mistake") {
    return "border-orange-300/25 bg-orange-300/12 text-orange-100";
  }

  return "border-rose-300/25 bg-rose-300/12 text-rose-100";
}

function moveLabel(move: MoveEvaluation) {
  return `${move.moveNumber}.${move.side === "white" ? "" : ".."} ${move.san}`;
}

function buildEngineLines(move: MoveEvaluation) {
  const storedLines = move.engineLines
    ?.filter((line) => line.san || line.line[0])
    .slice(0, 5)
    .map((line, index) => ({
      ...line,
      line: [...line.line],
      rank: line.rank || index + 1,
      san: line.san || line.line[0] || move.bestMove,
    }));

  if (storedLines?.length) {
    return storedLines;
  }

  const fallbackSan = move.bestMove || move.principalVariation[0];
  if (!fallbackSan) {
    return [] as EngineLine[];
  }

  return [
    {
      depth: move.depth,
      line: move.principalVariation.length > 0 ? [...move.principalVariation] : [fallbackSan],
      nodes: move.nodes,
      rank: 1,
      san: fallbackSan,
      score: move.score,
    },
  ] satisfies EngineLine[];
}

function actorScoreForMove(move: MoveEvaluation, score: number) {
  return move.side === "white" ? score : -score;
}

function whiteWinProbability(score: number) {
  return clamp(winProbabilityFromCentipawns(score) * 100, 0, 100);
}

function actorWinChanceLoss(move: MoveEvaluation) {
  const bestLine = buildEngineLines(move)[0];
  if (!bestLine) {
    return 0;
  }

  const bestWinProb = winProbabilityFromCentipawns(actorScoreForMove(move, bestLine.score));
  const playedWinProb = winProbabilityFromCentipawns(actorScoreForMove(move, move.score));

  return Math.max(0, Math.round((bestWinProb - playedWinProb) * 100));
}

function moveAnnotation(move: MoveEvaluation, preset: MoveLabelPreset) {
  const label = gradeDescriptor(move.grade, preset);
  const bestMove = move.bestMove || buildEngineLines(move)[0]?.san || "the engine move";

  if (move.grade === "Book") {
    return `Book. ${move.san} is known opening theory.`;
  }

  if (move.grade === "Brilliant") {
    return `Brilliant. ${move.san} found a difficult resource and matched the engine's best continuation.`;
  }

  if (move.grade === "Great") {
    return `Great. ${move.san} solved a critical position; the main line starts with ${bestMove}.`;
  }

  if (move.grade === "Best") {
    return `Best. ${move.san} matches the engine recommendation.`;
  }

  if (move.grade === "Excellent" || move.grade === "Good") {
    return `${label}. ${move.san} kept the position close to the engine's preferred path.`;
  }

  const winLoss = actorWinChanceLoss(move);
  const lossText = winLoss > 0 ? `lost about ${winLoss}% win chance` : "lost winning chances";

  return `${label}. ${move.san} ${lossText}; better was ${bestMove}.`;
}

function moveTooltip(move: MoveEvaluation, preset: MoveLabelPreset) {
  return `CAPS ${move.caps.toFixed(1)}. ${moveAnnotation(move, preset)}`;
}

function engineLineLabel(rank: number) {
  if (rank === 1) return "Best";
  if (rank === 2) return "Alternative";
  return "Playable idea";
}

function engineLineContinuation(line: EngineLine) {
  const continuation = line.line.slice(1).join(" ");
  return continuation || "No stored continuation";
}

function branchPlyLabel(startPly: number, branchIndex: number) {
  const ply = startPly + branchIndex;
  const moveNumber = Math.ceil(ply / 2);
  return `${moveNumber}${ply % 2 === 0 ? "..." : "."}`;
}

function arrowToneForEngineLine(rank: number): BoardArrow["tone"] {
  if (rank === 1) return "best";
  if (rank === 2) return "candidate";
  return "candidateSoft";
}

function shortPrincipalVariation(line: EngineLine | undefined, fallbackSan: string) {
  const moves = line?.line.filter(Boolean) ?? [];

  if (moves.length > 0) {
    return moves.slice(0, 5).join(" ");
  }

  return fallbackSan || "No PV stored";
}

function explainMoveForCoach(params: {
  actorName: string;
  bestSan: string;
  move: MoveEvaluation;
  opponentName: string;
  refutationSan?: string;
}) {
  const { actorName, bestSan, move, opponentName, refutationSan } = params;

  if (move.grade === "Book") {
    return `${move.san} is a normal opening-theory move, so the review marks it as Book instead of treating it like a unique engine discovery.`;
  }

  if (move.grade === "Best" || move.grade === "Brilliant" || move.grade === "Great") {
    return `${move.san} keeps ${actorName}'s position aligned with the engine's preferred plan. The important part is not only the move, but that it preserves the next continuation.`;
  }

  if (move.grade === "Good" || move.grade === "Inaccuracy") {
    return `${move.san} is playable, but ${bestSan} was the cleaner engine choice. The swing is small enough to study as a planning improvement, not a disaster.`;
  }

  if (move.grade === "Blunder" && refutationSan) {
    return `Your move allowed ${refutationSan}. The engine wanted ${bestSan}, and the ${formatCpLossLabel(move.cpLoss)} swing makes this one of the key positions to replay.`;
  }

  if (refutationSan) {
    return `${move.san} gave ${opponentName} a concrete reply: ${refutationSan}. The best path was ${bestSan}, and the ${formatCpLossLabel(move.cpLoss)} swing is why this move belongs in the review queue.`;
  }

  return `${move.san} changed the evaluation sharply. The engine preferred ${bestSan}, so this is a good candidate for a slow replay from the position before the move.`;
}

function coachThemeForMove(move: MoveEvaluation, openingName: string) {
  if (move.grade === "Blunder" || (move.cpLoss >= 120 && move.refutationLine)) {
    return {
      copy: `${move.san} allowed ${move.refutationLine?.san ?? move.bestMove}, so replay the forcing reply before memorizing a move.`,
      title: "You missed a tactic",
    };
  }

  if (move.phase === "endgame" && move.cpLoss >= 60) {
    return {
      copy: `${move.san} let the position simplify the wrong way. Compare it with ${move.bestMove} before trading.`,
      title: "You traded into worse endgame",
    };
  }

  if (move.phase === "opening" && move.grade !== "Book" && move.cpLoss >= 45) {
    return {
      copy: `${move.san} left the ${openingName} plan early. The cleaner setup was ${move.bestMove}.`,
      title: "You left theory too soon",
    };
  }

  if (move.isCapture && move.cpLoss >= 60) {
    return {
      copy: `${move.san} looked forcing, but the engine preferred ${move.bestMove}. Check the capture sequence one move deeper.`,
      title: "Capture changed the tactic",
    };
  }

  return {
    copy: `${move.san} drifted from the engine plan. Use ${move.bestMove} as the comparison move.`,
    title: "Your plan drifted",
  };
}

function formatShortNodes(nodes: number) {
  if (nodes >= 1_000_000) {
    return `${(nodes / 1_000_000).toFixed(nodes >= 10_000_000 ? 0 : 1)}M`;
  }

  if (nodes >= 1_000) {
    return `${Math.round(nodes / 1_000)}k`;
  }

  return nodes.toString();
}

function buildMoveRows(moveEvaluations: MoveEvaluation[]): MoveRow[] {
  const rows: MoveRow[] = [];

  for (let index = 0; index < moveEvaluations.length; index += 2) {
    rows.push({
      moveNumber: moveEvaluations[index].moveNumber,
      white: moveEvaluations[index],
      black: moveEvaluations[index + 1],
    });
  }

  return rows;
}

function parseBaseClock(timeControl: string) {
  const base = Number(timeControl.split("+")[0] ?? "0");
  if (!Number.isFinite(base) || base <= 0) {
    return "10:00";
  }

  const minutes = Math.floor(base / 60);
  const seconds = base % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function deriveArrowFromSan(fen: string, san: string, tone: BoardArrow["tone"]): BoardArrow | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move(san);

    if (!move) {
      return null;
    }

    return {
      from: move.from,
      to: move.to,
      tone,
    };
  } catch {
    return null;
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

function pieceAtSquareFromFen(fen: string, square: string) {
  const fileIndex = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  const rankIndex = 8 - rank;
  const rows = fen.split(" ")[0]?.split("/") ?? [];
  const row = rows[rankIndex];

  if (!row || fileIndex < 0 || fileIndex > 7) {
    return null;
  }

  let currentFile = 0;
  for (const token of row) {
    const emptySquares = Number(token);
    if (Number.isInteger(emptySquares) && emptySquares > 0) {
      currentFile += emptySquares;
      continue;
    }

    if (currentFile === fileIndex) {
      return token;
    }

    currentFile += 1;
  }

  return null;
}

type PieceSoundKind = "capture" | "error" | "move" | "select" | "success";

function pieceSoundForMove(move: MoveEvaluation): PieceSoundKind {
  return move.isCapture ? "capture" : "move";
}

function createGradeCounts(moves: MoveEvaluation[]): GradeCounts {
  const counts = {
    Best: { black: 0, white: 0 },
    Blunder: { black: 0, white: 0 },
    Book: { black: 0, white: 0 },
    Brilliant: { black: 0, white: 0 },
    Excellent: { black: 0, white: 0 },
    Good: { black: 0, white: 0 },
    Great: { black: 0, white: 0 },
    Inaccuracy: { black: 0, white: 0 },
    Mistake: { black: 0, white: 0 },
  } satisfies GradeCounts;

  for (const move of moves) {
    counts[move.grade][move.side] += 1;
  }

  return counts;
}

function averageLossForSide(moves: MoveEvaluation[], side: "white" | "black") {
  const sideMoves = moves.filter((move) => move.side === side);
  if (sideMoves.length === 0) {
    return 0;
  }

  return Math.round(sideMoves.reduce((total, move) => total + move.cpLoss, 0) / sideMoves.length);
}

function estimatePerformanceElo({
  accuracy,
  averageCpLoss,
  moveCount,
  solidRate,
}: {
  accuracy: number;
  averageCpLoss: number;
  moveCount: number;
  solidRate: number;
}) {
  const accuracyLift = (accuracy - 55) * 24;
  const consistencyLift = (solidRate - 55) * 5.5;
  const lengthConfidence = Math.min(110, Math.max(0, moveCount - 12) * 3.5);
  const cplPenalty = Math.min(420, averageCpLoss * 2.2);

  return Math.round(clamp(900 + accuracyLift + consistencyLift + lengthConfidence - cplPenalty, 100, 3200));
}

function describePerformanceBand(estimatedElo: number) {
  if (estimatedElo >= 2200) return "master-level control";
  if (estimatedElo >= 1700) return "strong practical game";
  if (estimatedElo >= 1200) return "solid club-level play";
  if (estimatedElo >= 800) return "improving fundamentals";
  return "needs basic cleanup";
}

function describePerspectiveResult(run: Pick<AnalysisRun, "black" | "result" | "white">, side: PlayerSide) {
  if (run.result !== "1-0" && run.result !== "0-1") {
    return "Draw";
  }

  const winnerSide: PlayerSide = run.result === "1-0" ? "white" : "black";
  const playerName = nameForSide(run, side);

  return winnerSide === side ? `${playerName} won` : `${playerName} lost`;
}

function buildChartPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function buildAreaPath(points: Array<{ x: number; y: number }>, height: number) {
  if (points.length === 0) {
    return "";
  }

  const start = points[0];
  const end = points[points.length - 1];

  return `${buildChartPath(points)} L ${end.x} ${height} L ${start.x} ${height} Z`;
}

const moveLabelPresets = {
  chessigma: {
    Best: "Best",
    Blunder: "Clown",
    Book: "Theoretical",
    Brilliant: "Sigma",
    Excellent: "Clean",
    Good: "Nice",
    Great: "Awesome",
    Inaccuracy: "Strange",
    Mistake: "Bad",
  },
  classic: {
    Best: "Best",
    Blunder: "Blunder",
    Book: "Book move",
    Brilliant: "Brilliant",
    Excellent: "Excellent",
    Good: "Good",
    Great: "Great find",
    Inaccuracy: "Inaccuracy",
    Mistake: "Mistake",
  },
  friendly: {
    Best: "Engine choice",
    Blunder: "Critical miss",
    Book: "Opening theory",
    Brilliant: "Brilliant idea",
    Excellent: "Clean move",
    Good: "Solid move",
    Great: "Great find",
    Inaccuracy: "Slight drift",
    Mistake: "Needs review",
  },
} satisfies Record<MoveLabelPreset, Record<MoveGrade, string>>;

function gradeDescriptor(grade: MoveGrade, preset: MoveLabelPreset = "classic") {
  return moveLabelPresets[preset][grade];
}

function initialsForName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const classificationBands: Array<{ grade: MoveGrade; meaning: string; range: string }> = [
  { grade: "Book", meaning: "Typical opening theory", range: "early theory" },
  { grade: "Brilliant", meaning: "Engine-approved tactical idea", range: "special" },
  { grade: "Great", meaning: "Only-move resource", range: "special" },
  { grade: "Best", meaning: "Matches the engine choice", range: "0 to -0.5% WP" },
  { grade: "Excellent", meaning: "Tiny practical loss", range: "-0.5% to -2% WP" },
  { grade: "Good", meaning: "Solid practical move", range: "-2% to -5% WP" },
  { grade: "Inaccuracy", meaning: "Better plan missed", range: "-5% to -10% WP" },
  { grade: "Mistake", meaning: "Clearly worsens the position", range: "-10% to -20% WP" },
  { grade: "Blunder", meaning: "Major swing or losing error", range: "< -20% WP" },
];

function ReportMetricCard({
  copy,
  label,
  tone = "neutral",
  value,
}: {
  copy: string;
  label: string;
  tone?: "amber" | "emerald" | "neutral" | "rose";
  value: string;
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-300/16 bg-emerald-300/[0.07]"
      : tone === "rose"
        ? "border-rose-300/18 bg-rose-300/[0.08]"
        : tone === "amber"
          ? "border-amber-300/18 bg-amber-300/[0.08]"
          : "border-white/10 bg-white/[0.035]";

  return (
    <div className={cn("min-w-0 rounded-[1.2rem] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]", toneClass)}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p>
    </div>
  );
}

type WinProbabilityPoint = {
  move: MoveEvaluation;
  swing: number;
  winProbability: number;
  x: number;
  y: number;
};

const chartReviewMarkPriority: Record<MoveGrade, number> = {
  Best: 18,
  Blunder: 100,
  Book: 30,
  Brilliant: 96,
  Excellent: 22,
  Good: 34,
  Great: 88,
  Inaccuracy: 72,
  Mistake: 86,
};

function shouldShowChartReviewMark(point: WinProbabilityPoint) {
  if (point.move.grade === "Blunder" || point.move.grade === "Mistake" || point.move.grade === "Inaccuracy") {
    return true;
  }

  if (point.move.grade === "Brilliant" || point.move.grade === "Great") {
    return true;
  }

  if (point.move.grade === "Book") {
    return point.move.ply <= 10 && point.move.ply % 2 === 1;
  }

  if (point.move.grade === "Good") {
    return point.move.cpLoss >= 35 || Math.abs(point.swing) >= 5;
  }

  if (point.move.grade === "Excellent") {
    return point.move.cpLoss >= 45 || Math.abs(point.swing) >= 7;
  }

  return Math.abs(point.swing) >= 12;
}

function chartReviewMarkScore(point: WinProbabilityPoint) {
  return chartReviewMarkPriority[point.move.grade] + Math.min(18, Math.abs(point.swing)) + Math.min(12, point.move.cpLoss / 20);
}

function selectVisibleChartReviewMarks(points: WinProbabilityPoint[]) {
  const candidates = points
    .filter(shouldShowChartReviewMark)
    .sort((left, right) => chartReviewMarkScore(right) - chartReviewMarkScore(left));
  const selected: WinProbabilityPoint[] = [];

  for (const candidate of candidates) {
    const candidateScore = chartReviewMarkScore(candidate);
    const collidesWithHigherPriority = selected.some((point) => {
      const pointScore = chartReviewMarkScore(point);

      return Math.abs(point.x - candidate.x) < 26 && Math.abs(point.y - candidate.y) < 24 && pointScore >= candidateScore - 6;
    });

    if (!collidesWithHigherPriority) {
      selected.push(candidate);
    }
  }

  return selected.sort((left, right) => left.move.ply - right.move.ply);
}

function WinProbabilityChart({
  labelPreset,
  moves,
  onSelectPly,
  selectedPly,
}: {
  labelPreset: MoveLabelPreset;
  moves: MoveEvaluation[];
  onSelectPly: (ply: number) => void;
  selectedPly: number;
}) {
  const width = 720;
  const height = 210;
  const topPadding = 18;
  const bottomPadding = 26;
  const chartHeight = height - topPadding - bottomPadding;
  const points: WinProbabilityPoint[] = moves.map((move, index) => {
    const x = moves.length === 1 ? width / 2 : (index / (moves.length - 1)) * width;
    const winProbability = whiteWinProbability(move.score);
    const previousMove = index > 0 ? moves[index - 1] : null;
    const previousWinProbability = previousMove ? whiteWinProbability(previousMove.score) : 50;
    const swing = winProbability - previousWinProbability;

    return {
      move,
      swing,
      winProbability,
      x,
      y: topPadding + (100 - winProbability) / 100 * chartHeight,
    };
  });
  const selectedPoint = points.find((point) => point.move.ply === selectedPly) ?? points[0];
  const visibleReviewMarks = selectVisibleChartReviewMarks(points);
  const visibleReviewMarkPlies = new Set(visibleReviewMarks.map((point) => point.move.ply));
  const criticalPoints = points
    .filter(
      (point) =>
        Math.abs(point.swing) >= 10 ||
        point.move.grade === "Brilliant" ||
        point.move.grade === "Great" ||
        point.move.grade === "Inaccuracy" ||
        point.move.grade === "Mistake" ||
        point.move.grade === "Blunder",
    )
    .sort((left, right) => Math.abs(right.swing) - Math.abs(left.swing))
    .slice(0, 5);
  const largestSwing = points.slice().sort((left, right) => Math.abs(right.swing) - Math.abs(left.swing))[0];
  const selectedWinProbability = selectedPoint?.winProbability ?? 50;

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[#303033] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/90">Win probability</p>
          <p className="mt-2 text-lg font-semibold text-white sm:text-xl">White winning chances after every move</p>
        </div>
        <p className="text-sm text-slate-400">Click any point to jump to that move</p>
      </div>

      <div className="mt-4 grid gap-2 min-[430px]:grid-cols-3">
        <ReportMetricCard
          copy="Current selected point from White's perspective."
          label="Selected WP"
          tone={selectedWinProbability >= 55 ? "emerald" : selectedWinProbability <= 45 ? "rose" : "neutral"}
          value={`${selectedWinProbability.toFixed(0)}%`}
        />
        <ReportMetricCard
          copy={largestSwing ? `${moveLabel(largestSwing.move)} changed White's chances by ${Math.abs(largestSwing.swing).toFixed(0)}%.` : "No stored moves."}
          label="Largest swing"
          tone={largestSwing && Math.abs(largestSwing.swing) >= 15 ? "rose" : largestSwing && Math.abs(largestSwing.swing) >= 8 ? "amber" : "emerald"}
          value={largestSwing ? `${largestSwing.swing > 0 ? "+" : ""}${largestSwing.swing.toFixed(0)}%` : "Stable"}
        />
        <ReportMetricCard
          copy="Meaningful review labels are pinned onto the graph; quiet best moves stay as small dots."
          label="Review marks"
          tone={visibleReviewMarks.length > 0 ? "amber" : "emerald"}
          value={visibleReviewMarks.length.toString()}
        />
      </div>

      <div className="mt-4 grid grid-cols-[2.2rem_minmax(0,1fr)] gap-2 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-3">
        <div className="flex flex-col items-center justify-between py-2 text-[0.7rem] font-semibold text-slate-500">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>

        <div className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#3b3b3f]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[#465c3b]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[#5a3737]" />
          <div className="pointer-events-none absolute left-4 top-3 rounded-full bg-black/20 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-lime-100">
            White
          </div>
          <div className="pointer-events-none absolute bottom-3 left-4 rounded-full bg-black/20 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-rose-100">
            Black
          </div>

          <svg className="relative h-[170px] w-full sm:h-[210px]" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="win-probability-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(190,242,100,0.95)" />
                <stop offset="52%" stopColor="rgba(255,255,255,0.72)" />
                <stop offset="100%" stopColor="rgba(248,113,113,0.72)" />
              </linearGradient>
            </defs>

            {[25, 50, 75].map((percent) => {
              const y = topPadding + (100 - percent) / 100 * chartHeight;

              return (
                <line
                  key={percent}
                  x1="0"
                  x2={width}
                  y1={y}
                  y2={y}
                  stroke={percent === 50 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.13)"}
                  strokeDasharray={percent === 50 ? "6 8" : "4 10"}
                />
              );
            })}
            <path d={buildAreaPath(points, height - bottomPadding)} fill="rgba(255,255,255,0.16)" />
            <path d={buildChartPath(points)} fill="none" stroke="url(#win-probability-fill)" strokeLinecap="round" strokeWidth="4" />
            {selectedPoint ? (
              <line
                x1={selectedPoint.x}
                x2={selectedPoint.x}
                y1="0"
                y2={height}
                stroke="rgba(251,191,36,0.6)"
                strokeDasharray="7 7"
                strokeWidth="2"
              />
            ) : null}

            {points.map((point) => {
              const isSelected = point.move.ply === selectedPly;
              const isReviewMark = visibleReviewMarkPlies.has(point.move.ply);
              const showIcon = isReviewMark || isSelected;
              const iconSize = isSelected ? 28 : chartReviewMarkPriority[point.move.grade] >= 80 ? 24 : 21;
              const pointLabel = `${moveLabel(point.move)} / ${gradeDescriptor(point.move.grade, labelPreset)} / White WP ${point.winProbability.toFixed(0)}%`;

              return (
                <g
                  key={point.move.ply}
                  aria-label={pointLabel}
                  className="cursor-pointer outline-none"
                  onClick={() => onSelectPly(point.move.ply)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectPly(point.move.ply);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <title>{`${moveLabel(point.move)} / White WP ${point.winProbability.toFixed(0)}% / ${moveTooltip(point.move, labelPreset)}`}</title>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={showIcon ? iconSize / 2 + 4 : isSelected ? 8 : 4.5}
                    fill={showIcon ? "rgba(18,18,20,0.88)" : gradePointFill[point.move.grade]}
                    stroke={isSelected ? "#fff5d2" : point.winProbability >= 50 ? "#84cc16" : "#ef4444"}
                    strokeWidth={showIcon ? 3.5 : 2.5}
                  />
                  {showIcon ? (
                    <image
                      height={iconSize}
                      href={gradeIconPaths[point.move.grade]}
                      preserveAspectRatio="xMidYMid meet"
                      width={iconSize}
                      x={point.x - iconSize / 2}
                      y={point.y - iconSize / 2}
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {selectedPoint ? (
        <div className="mt-4 rounded-[1.25rem] border border-amber-300/15 bg-amber-300/[0.06] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#9fffea]">Selected chart point</p>
              <div className="mt-2 flex min-w-0 items-center gap-2">
                <GradeIcon grade={selectedPoint.move.grade} className="size-7" />
                <p className="truncate text-lg font-semibold text-white">{moveLabel(selectedPoint.move)}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{moveAnnotation(selectedPoint.move, labelPreset)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-right">
              <div className="rounded-[0.95rem] border border-white/10 bg-black/12 px-3 py-2">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-slate-500">White WP</p>
                <p className="mt-1 text-sm font-semibold text-white">{selectedPoint.winProbability.toFixed(0)}%</p>
              </div>
              <div className="rounded-[0.95rem] border border-white/10 bg-black/12 px-3 py-2">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Swing</p>
                <p className="mt-1 text-sm font-semibold text-white">{selectedPoint.swing > 0 ? "+" : ""}{selectedPoint.swing.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-sky-200">Critical moments</p>
            <p className="mt-1 text-xs text-slate-500">Click a marked swing to replay the board, arrows, and engine line.</p>
          </div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{criticalPoints.length} shown</p>
        </div>
        {criticalPoints.length > 0 ? (
          criticalPoints.map((point, index) => (
            <button
              key={point.move.ply}
              type="button"
              onClick={() => onSelectPly(point.move.ply)}
              className={cn(
                "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1rem] border px-3 py-3 text-left transition",
                point.move.ply === selectedPly
                  ? "border-[#00d4aa]/35 bg-[#00d4aa]/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
              )}
            >
              <span className="grid size-7 place-items-center rounded-full bg-white/[0.06] text-xs font-semibold text-slate-300">{index + 1}</span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <GradeMarker grade={point.move.grade} />
                  <p className="truncate text-sm font-semibold text-white">{moveLabel(point.move)}</p>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {gradeDescriptor(point.move.grade, labelPreset)} / White WP {point.winProbability.toFixed(0)}%
                </p>
              </div>
              <span className="rounded-full bg-black/20 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-amber-100">
                {point.swing > 0 ? "+" : ""}{point.swing.toFixed(0)}%
              </span>
            </button>
          ))
        ) : (
          <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] px-3 py-3 text-sm leading-6 text-slate-400">
            No major win-probability spikes. This game is mostly about small evaluation drift.
          </div>
        )}
      </div>
    </div>
  );
}

function MiniReviewGraph({
  moves,
  perspectiveSide,
}: {
  moves: MoveEvaluation[];
  perspectiveSide: PlayerSide;
}) {
  const width = 420;
  const height = 86;
  const points = moves.map((move, index) => {
    const x = moves.length === 1 ? width / 2 : (index / (moves.length - 1)) * width;
    const perspectiveScore = scoreForSide(move.score, perspectiveSide);
    const normalized = Math.tanh(perspectiveScore / 450);

    return {
      move,
      x,
      y: height / 2 - normalized * 30,
    };
  });
  const criticalPoints = points.filter((point) => point.move.cpLoss >= 100 || point.move.grade === "Blunder" || point.move.grade === "Brilliant");

  return (
    <div className="relative overflow-hidden rounded-[1rem] border border-white/10 bg-[#4a4740]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[#5d6f45]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[#3b302d]" />
      <svg className="relative h-[5.4rem] w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line x1="0" x2={width} y1={height / 2} y2={height / 2} stroke="rgba(31,31,32,0.5)" strokeDasharray="5 7" />
        <path d={buildAreaPath(points, height)} fill="rgba(255,255,255,0.94)" />
        <path d={buildChartPath(points)} fill="none" stroke="rgba(255,255,255,0.9)" strokeLinecap="round" strokeWidth="3" />
        {criticalPoints.map((point) => (
          <circle
            key={point.move.ply}
            cx={point.x}
            cy={point.y}
            fill={point.move.grade === "Blunder" ? "#ef4444" : point.move.grade === "Brilliant" ? "#2dd4bf" : "#f59e0b"}
            r="4.5"
            stroke="#2b2925"
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
}

function ReviewAvatar({
  accent = "violet",
  name,
}: {
  accent?: "green" | "violet";
  name: string;
}) {
  return (
    <div
      className={cn(
        "grid size-16 shrink-0 place-items-center rounded-[0.9rem] border text-3xl font-semibold text-white shadow-[0_12px_32px_rgba(0,0,0,0.24)]",
        accent === "green" ? "border-lime-300/55 bg-[#8eb653]" : "border-violet-300/35 bg-[#7951ce]",
      )}
    >
      {initialsForName(name).slice(0, 1) || "P"}
    </div>
  );
}

function GameReviewIntroCard({
  analysis,
  counts,
  labelPreset,
  onStartReview,
  opponentAccuracy,
  opponentName,
  opponentSide,
  reviewedAccuracy,
  reviewedAverageCpLoss,
  reviewedName,
  reviewSide,
}: {
  analysis: AnalysisRun;
  counts: GradeCounts;
  labelPreset: MoveLabelPreset;
  onStartReview: () => void;
  opponentAccuracy: number;
  opponentName: string;
  opponentSide: PlayerSide;
  reviewedAccuracy: number;
  reviewedAverageCpLoss: number;
  reviewedName: string;
  reviewSide: PlayerSide;
}) {
  const resultText = describePerspectiveResult(analysis, reviewSide);
  const reviewWon = resultText.endsWith("won");
  const strongFinish = reviewedAccuracy >= 80;
  const coachCopy = reviewWon
    ? strongFinish
      ? `Very impressive, ${reviewedName}. You converted the game while keeping the average loss near ${reviewedAverageCpLoss} CPL.`
      : `${reviewedName} won, and the review shows exactly where the game could become cleaner next time.`
    : `${reviewedName}, this review found the swings that decided the game. Start with the biggest one, then replay the engine line.`;

  return (
    <div className="overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#111118] shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-center gap-2 border-b border-white/10 bg-[#0a0a0f] px-4 py-3">
        <Sparkles className="size-5 text-lime-300" />
        <p className="text-lg font-semibold text-white">Game Review</p>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-end gap-3">
          <div className="relative h-20">
            <div className="absolute bottom-0 left-0 grid size-16 place-items-center rounded-full bg-[linear-gradient(145deg,#72513d,#d0a082)] shadow-[0_16px_35px_rgba(0,0,0,0.3)]">
              <Bot className="size-8 text-white/95" aria-hidden="true" />
            </div>
          </div>
          <div className="rounded-[1rem] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#2b2a25] shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
            {coachCopy}
          </div>
        </div>

        <div className="mt-4">
          <MiniReviewGraph moves={analysis.moveEvaluations} perspectiveSide={reviewSide} />
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 text-center">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{reviewedName}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{reviewSide}</p>
            <div className="mt-2 flex justify-center">
              <ReviewAvatar accent="green" name={reviewedName} />
            </div>
            <p className="mt-2 inline-flex rounded-[0.6rem] bg-white px-3 py-1 text-lg font-semibold text-[#252521]">{reviewedAccuracy.toFixed(1)}</p>
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{opponentName}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{opponentSide}</p>
            <div className="mt-2 flex justify-center">
              <ReviewAvatar name={opponentName} />
            </div>
            <p className="mt-2 inline-flex rounded-[0.6rem] bg-[#343430] px-3 py-1 text-lg font-semibold text-white">{opponentAccuracy.toFixed(1)}</p>
          </div>
        </div>

        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <span>Move quality</span>
            <span>You</span>
            <span>Opp</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {reviewSummaryRows.map((grade) => (
              <div key={grade} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[0.9rem] px-2 py-1.5 hover:bg-white/[0.035]">
                <div className="flex min-w-0 items-center gap-2">
                  <GradeIcon grade={grade} className="size-6" />
                  <span className="truncate text-sm font-semibold text-slate-100">{gradeDescriptor(grade, labelPreset)}</span>
                </div>
                <span className="min-w-6 text-center text-base font-semibold text-lime-300">{counts[grade][reviewSide]}</span>
                <span className="min-w-6 text-center text-base font-semibold text-slate-200">{counts[grade][opponentSide]}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onStartReview}
          className="mt-4 w-full rounded-[0.9rem] bg-[linear-gradient(180deg,#00d4aa,#00a889)] px-5 py-4 text-xl font-bold text-white shadow-[0_16px_36px_rgba(89,150,55,0.32)] transition hover:brightness-110"
        >
          Start Review
        </button>
      </div>
    </div>
  );
}

function ReportSummaryHero({
  analysis,
  biggestReviewedSwing,
  firstStudyAction,
  onStartReview,
  openingName,
  opponentAccuracy,
  opponentAverageCpLoss,
  opponentName,
  opponentSide,
  reviewedAccuracy,
  reviewedAverageCpLoss,
  reviewedName,
  reviewedPerformanceElo,
  reviewedSolidRate,
  reviewSide,
  totalCriticalErrorCount,
}: {
  analysis: AnalysisRun;
  biggestReviewedSwing?: MoveEvaluation;
  firstStudyAction: string;
  onStartReview: () => void;
  openingName: string;
  opponentAccuracy: number;
  opponentAverageCpLoss: number;
  opponentName: string;
  opponentSide: PlayerSide;
  reviewedAccuracy: number;
  reviewedAverageCpLoss: number;
  reviewedName: string;
  reviewedPerformanceElo: number;
  reviewedSolidRate: number;
  reviewSide: PlayerSide;
  totalCriticalErrorCount: number;
}) {
  const largestSwingLabel = biggestReviewedSwing ? formatCpLossLabel(biggestReviewedSwing.cpLoss) : "Stable";

  return (
    <div className="overflow-hidden rounded-[1.65rem] border border-white/10 bg-[linear-gradient(180deg,#111118,#0a0a0f)] shadow-[0_24px_70px_rgba(0,0,0,0.26)]">
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-lime-300">Review summary</p>
            <p className="mt-2 text-2xl font-semibold leading-tight text-white">{describePerspectiveResult(analysis, reviewSide)}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {analysis.opening.eco} / {openingName} / {analysis.moveCount} moves
            </p>
          </div>
          <button
            type="button"
            onClick={onStartReview}
            className="rounded-lg bg-[linear-gradient(135deg,#00d4aa,#00a88a)] px-5 py-2.5 text-xs font-semibold text-[#0a0a0f] transition hover:scale-[1.02] hover:brightness-110"
          >
            Start guided review
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid gap-3">
          {[
            {
              accuracy: reviewedAccuracy,
              acpl: reviewedAverageCpLoss,
              accent: "bg-lime-300",
              label: "You",
              name: reviewedName,
              side: reviewSide,
            },
            {
              accuracy: opponentAccuracy,
              acpl: opponentAverageCpLoss,
              accent: "bg-slate-400",
              label: "Opponent",
              name: opponentName,
              side: opponentSide,
            },
          ].map((player) => {
            const acplCleanliness = cplHealthFromLoss(player.acpl);

            return (
              <div key={player.label} className="rounded-[1.15rem] border border-white/10 bg-white/[0.035] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white">{player.name}</p>
                    <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {player.label} / {player.side}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-white">{player.accuracy.toFixed(1)}</p>
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Accuracy</p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/25">
                  <div className={cn("h-full rounded-full", player.accent)} style={{ width: `${clamp(player.accuracy, 0, 100)}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500">{player.acpl} average centipawn loss</span>
                  <span className="font-semibold text-[#8fffe7]">{Math.round(acplCleanliness)}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/35">
                  <div className="analysis-progress-fill h-full rounded-full" style={{ width: `${acplCleanliness}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid gap-2 min-[430px]:grid-cols-2">
          <div className="rounded-[1rem] border border-white/10 bg-black/14 px-3 py-3">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Performance</p>
            <p className="mt-1 text-lg font-semibold text-white">~{reviewedPerformanceElo}</p>
            <p className="mt-1 text-xs text-slate-500">{describePerformanceBand(reviewedPerformanceElo)}</p>
          </div>
          <div className="rounded-[1rem] border border-white/10 bg-black/14 px-3 py-3">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Consistency</p>
            <p className="mt-1 text-lg font-semibold text-white">{reviewedSolidRate}%</p>
            <p className="mt-1 text-xs text-slate-500">solid moves</p>
          </div>
          <div className="rounded-[1rem] border border-amber-300/15 bg-amber-300/[0.07] px-3 py-3">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[#9fffea]">Largest swing</p>
            <p className="mt-1 text-lg font-semibold text-white">{largestSwingLabel}</p>
            <p className="mt-1 truncate text-xs text-slate-400">{firstStudyAction}</p>
          </div>
          <div className="rounded-[1rem] border border-rose-300/15 bg-rose-300/[0.07] px-3 py-3">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-rose-200">Mistake+Blunder</p>
            <p className="mt-1 text-lg font-semibold text-white">{totalCriticalErrorCount}</p>
            <p className="mt-1 text-xs text-slate-400">total critical errors</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MoveQualityCompact({
  counts,
  labelPreset,
  opponentSide,
  reviewSide,
}: {
  counts: GradeCounts;
  labelPreset: MoveLabelPreset;
  opponentSide: PlayerSide;
  reviewSide: PlayerSide;
}) {
  return (
    <div className="rounded-[1.45rem] border border-white/10 bg-[#242426] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-lime-300">Move quality</p>
          <p className="mt-1 text-sm text-slate-400">One table. No duplicate ledgers.</p>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[0.6rem] font-bold uppercase tracking-[0.14em]">
          <span className="rounded-full bg-white px-2 py-1 text-slate-950">You</span>
          <span className="rounded-full bg-black/40 px-2 py-1 text-slate-200">Opp</span>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {reviewSummaryRows.map((grade) => (
          <div key={grade} className="grid grid-cols-[minmax(0,1fr)_2rem_2rem] items-center gap-2 rounded-[0.9rem] bg-white/[0.025] px-2.5 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <GradeIcon grade={grade} className="size-6" />
              <span className="truncate text-sm font-semibold text-slate-100">{gradeDescriptor(grade, labelPreset)}</span>
            </div>
            <span className="text-center text-base font-semibold text-lime-300">{counts[grade][reviewSide]}</span>
            <span className="text-center text-base font-semibold text-slate-300">{counts[grade][opponentSide]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CriticalQueueCompact({
  criticalErrorCount,
  inaccuracyCount,
  insights,
  onSelectPly,
}: {
  criticalErrorCount: number;
  inaccuracyCount: number;
  insights: Array<{
    bestPv: string;
    move: MoveEvaluation;
    theme: {
      copy: string;
      title: string;
    };
  }>;
  onSelectPly: (ply: number) => void;
}) {
  return (
    <div className="rounded-[1.45rem] border border-rose-300/12 bg-[linear-gradient(180deg,rgba(55,36,34,0.9),rgba(35,31,31,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-rose-300">Critical queue</p>
          <p className="mt-2 text-xl font-semibold text-white">What to study first</p>
          <p className="mt-1 text-sm leading-6 text-slate-400">Jump directly to the moves that changed the game.</p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-sm font-semibold text-white">
            <GradeIcon grade="Inaccuracy" className="size-5" />
            {inaccuracyCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-sm font-semibold text-white">
            <GradeIcon grade="Blunder" className="size-5" />
            {criticalErrorCount}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {insights.length > 0 ? (
          insights.map((insight, index) => (
            <button
              key={insight.move.ply}
              type="button"
              onClick={() => onSelectPly(insight.move.ply)}
              title={`CAPS ${insight.move.caps.toFixed(1)}. Best was ${insight.bestPv}.`}
              className="w-full rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-3 text-left transition hover:border-rose-200/25 hover:bg-white/[0.055]"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-rose-300/14 text-xs font-semibold text-rose-100">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <GradeIcon grade={insight.move.grade} className="size-5" />
                    <p className="truncate text-sm font-semibold text-white">{moveLabel(insight.move)}</p>
                    <span className="shrink-0 rounded-full bg-black/20 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-rose-100">
                      {formatCpLossLabel(insight.move.cpLoss)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-rose-100">{insight.theme.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-300">{insight.theme.copy}</p>
                  <p className="mt-2 truncate rounded-[0.8rem] border border-emerald-300/12 bg-emerald-300/[0.06] px-3 py-2 text-xs font-semibold text-emerald-100">
                    Best was {insight.bestPv}
                  </p>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-[1rem] border border-white/10 bg-white/[0.035] p-4">
            <p className="font-semibold text-white">No major collapses found.</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">This review is mostly about small evaluation drift.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function cplHealthFromLoss(cpLoss: number) {
  return clamp(100 - Math.min(cpLoss, 140) * 0.68, 8, 100);
}

function CplMetricBar({
  detail,
  label,
  progress,
  value,
}: {
  detail: string;
  label: string;
  progress: number;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[1rem] border border-white/10 bg-black/18 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-1 truncate text-lg font-semibold text-white">{value}</p>
        </div>
        <span className="cpl-analysis-tick mt-1 h-1.5 w-7 rounded-full bg-[linear-gradient(90deg,transparent,#00d4aa,transparent)]" />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className="analysis-progress-fill h-full rounded-full" style={{ width: `${clamp(progress, 4, 100)}%` }} />
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function ReportMethodNote({
  averageCpLoss,
  labelPreset,
  reviewedAccuracy,
}: {
  averageCpLoss: number;
  labelPreset: MoveLabelPreset;
  reviewedAccuracy: number;
}) {
  const cplHealth = cplHealthFromLoss(averageCpLoss);
  const cplPressure = clamp(averageCpLoss * 1.18, 6, 100);

  return (
    <details className="cpl-analysis-shell group relative overflow-hidden rounded-[1.25rem] border border-[#00d4aa]/18 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="analysis-engine-grid pointer-events-none absolute inset-0 opacity-25" />
      <span className="cpl-analysis-beam pointer-events-none absolute inset-x-6 top-20 h-px rounded-full bg-[linear-gradient(90deg,transparent,rgba(0,212,170,0.92),rgba(0,194,255,0.8),transparent)] shadow-[0_0_22px_rgba(0,212,170,0.32)]" />

      <summary className="relative z-10 cursor-pointer list-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#8fffe7]">CPL analysis</p>
            <p className="mt-1 text-sm text-slate-400">
              {reviewedAccuracy.toFixed(1)}% accuracy from {averageCpLoss} ACPL
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="relative grid size-11 place-items-center rounded-[0.9rem] border border-[#00d4aa]/20 bg-[#00d4aa]/10 text-[#8fffe7]">
              <span className="cpl-analysis-ring pointer-events-none absolute inset-1 rounded-[0.7rem]" />
              <Gauge className="relative size-5" />
            </span>
            <span className="rounded-full border border-white/10 px-2 py-1 text-xs font-semibold text-slate-400 group-open:bg-white/10">
              Open
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <CplMetricBar
            detail="Move quality converted from Stockfish deltas."
            label="Accuracy"
            progress={reviewedAccuracy}
            value={`${reviewedAccuracy.toFixed(1)}%`}
          />
          <CplMetricBar detail="Lower centipawn loss means a cleaner game." label="ACPL" progress={cplHealth} value={averageCpLoss.toString()} />
          <CplMetricBar detail="Animated pressure from the average loss profile." label="CPL scan" progress={cplPressure} value={`${Math.round(cplPressure)}%`} />
        </div>
      </summary>

      <p className="relative z-10 mt-4 text-sm leading-7 text-slate-300">
        The engine compares every move with the best line, measures centipawn loss, then turns those deltas into labels and graph spikes.
      </p>
      <div className="relative z-10 mt-3 grid gap-2">
        {classificationBands.map((band) => (
          <div key={band.grade} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[0.9rem] bg-white/[0.035] px-3 py-2">
            <GradeIcon grade={band.grade} className="size-5" />
            <span className="truncate text-sm font-semibold text-white">{gradeDescriptor(band.grade, labelPreset)}</span>
            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">{band.range}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

function BranchAnalysisConsole({
  branchError,
  branchLine,
  branchMessage,
  branchPending,
  branchResult,
  candidateLines,
  engineDetail,
  engineLineCount,
  engineName,
  onExit,
  onReset,
  selectedMove,
}: {
  branchError: string | null;
  branchLine: BranchMove[];
  branchMessage: string | null;
  branchPending: boolean;
  branchResult: BranchEvaluationResponse | null;
  candidateLines: EngineLine[];
  engineDetail: string;
  engineLineCount: number;
  engineName: string;
  onExit: () => void;
  onReset: () => void;
  selectedMove: MoveEvaluation;
}) {
  const branchScore = branchResult ? formatEngineScore(branchResult.score) : branchPending ? "..." : "0.00";
  const statusCopy = branchError ?? branchMessage ?? "Click a legal move on the board to create a branch.";
  const branchHasMoves = branchLine.length > 0;

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#1f2022] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="border-b border-white/10 bg-[#242528] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-[#00d4aa]">Live branch analysis</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-amber-400 text-slate-950">
                <Gauge className="size-5" />
              </span>
              <span className="text-3xl font-semibold text-white">{branchScore}</span>
              <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-300">
                {branchPending ? "Thinking" : branchResult ? `Depth ${branchResult.depth}` : "Ready"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">{statusCopy}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:bg-white/[0.08]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-300/15"
            >
              Exit
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em]">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-400">{engineName}</span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-400">{engineDetail}</span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-400">
            {candidateLines.length}/{engineLineCount} lines
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-400">
            {branchResult ? formatShortNodes(branchResult.nodes) : "0"} nodes
          </span>
        </div>
      </div>

      <div className="divide-y divide-white/[0.07]">
        {candidateLines.length > 0 ? (
          candidateLines.map((line) => (
            <div
              key={`${line.rank}-${line.san}-${line.score}`}
              className={cn(
                "grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 transition",
                line.rank === 1 ? "bg-emerald-400/[0.08] shadow-[inset_3px_0_0_rgba(132,204,22,0.9)]" : "bg-transparent",
              )}
            >
              <span className={cn("grid size-8 place-items-center text-lg font-semibold", line.rank === 1 ? "text-emerald-300" : "text-[#9fffea]")}>
                {sanPieceSymbol(line.san)}
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">{line.san}</p>
                  <span className="rounded bg-black px-1.5 py-0.5 text-[0.68rem] font-semibold text-white">{formatEngineScore(line.score)}</span>
                  {line.rank === 1 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                      <BestMoveIcon className="size-4" />
                      is best
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{engineLineContinuation(line)}</p>
              </div>
              <ChevronDown className="size-4 text-slate-500" />
            </div>
          ))
        ) : (
          <div className="px-4 py-5 text-sm leading-6 text-slate-400">
            {branchPending ? "Engine is checking the branch..." : "Make a branch move on the board; candidate lines will appear here."}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-[#242528] p-4">
        <div className="rounded-[1rem] border border-white/10 bg-black/15 p-3">
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] pb-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Branch move tree</p>
              <p className="mt-1 text-xs text-slate-500">
                Started before {branchPlyLabel(selectedMove.ply, 0)} {selectedMove.san}
              </p>
            </div>
            <span className="rounded bg-black/35 px-2 py-1 text-xs font-semibold text-slate-300">
              {branchLine.length > 0 ? `${branchLine.length} ply` : "empty"}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-8 shrink-0 text-right">{branchPlyLabel(selectedMove.ply, 0)}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-slate-300">{selectedMove.san}</span>
              <span>original game move</span>
            </div>
            {branchHasMoves ? (
              branchLine.map((move, index) => (
                <div key={`${move.fenBefore}-${move.san}-${index}`} className="flex items-center gap-2 text-xs">
                  <span className="w-8 shrink-0 text-right text-slate-500">{branchPlyLabel(selectedMove.ply, index)}</span>
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.1] px-2 py-1 font-semibold text-emerald-100">
                    {move.san}
                  </span>
                  {index === branchLine.length - 1 && branchResult ? (
                    <span className="rounded bg-black/35 px-2 py-1 text-slate-300">{formatEngineScore(branchResult.score)}</span>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[0.85rem] border border-sky-300/15 bg-sky-300/[0.06] px-3 py-2 text-xs leading-5 text-slate-300">
                Click a piece on the board to start a variation from this exact position.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalysisReportWorkbench({
  analysis,
}: {
  analysis: AnalysisRun;
}) {
  const defaultPly = analysis.criticalMoments[0]?.ply ?? analysis.moveEvaluations.at(-1)?.ply ?? 1;
  const reviewSide = useMemo(() => resolveReviewSide(analysis), [analysis]);
  const [selectedPly, setSelectedPly] = useState(defaultPly);
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("report");
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [showBestLine, setShowBestLine] = useState(true);
  const [showAlternatives, setShowAlternatives] = useState(true);
  const [showMistakeRefutation, setShowMistakeRefutation] = useState(true);
  const [showWideBoard, setShowWideBoard] = useState(true);
  const [moveSoundsEnabled, setMoveSoundsEnabled] = useState(true);
  const [engineLineCount, setEngineLineCount] = useState(3);
  const [boardTone, setBoardTone] = useState<BoardTone>("slate");
  const [pieceTheme, setPieceTheme] = useState<BoardPieceTheme>("neo");
  const [moveLabelPreset, setMoveLabelPreset] = useState<MoveLabelPreset>("chessigma");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [keyMomentsOnly, setKeyMomentsOnly] = useState(false);
  const [reviewIntroMode, setReviewIntroMode] = useState(true);
  const [retryFeedback, setRetryFeedback] = useState<string | null>(null);
  const [retryFromSquare, setRetryFromSquare] = useState<string | null>(null);
  const [retryMode, setRetryMode] = useState(false);
  const [retrySolved, setRetrySolved] = useState(false);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [replaySpeedMs, setReplaySpeedMs] = useState(900);
  const [boardFlipOffset, setBoardFlipOffset] = useState(false);
  const [boardContextMenu, setBoardContextMenu] = useState<BoardContextMenuState | null>(null);
  const [analysisToastVisible, setAnalysisToastVisible] = useState(true);
  const [movesPanelOpen, setMovesPanelOpen] = useState(false);
  const [branchMode, setBranchMode] = useState(false);
  const [branchFen, setBranchFen] = useState("");
  const [branchFromSquare, setBranchFromSquare] = useState<string | null>(null);
  const [branchLine, setBranchLine] = useState<BranchMove[]>([]);
  const [branchResult, setBranchResult] = useState<BranchEvaluationResponse | null>(null);
  const [branchPending, setBranchPending] = useState(false);
  const [branchMessage, setBranchMessage] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareCardPending, setShareCardPending] = useState(false);
  const [quickInsight, setQuickInsight] = useState<string | null>(null);
  const [quickInsightPending, setQuickInsightPending] = useState(false);
  const [quickInsightError, setQuickInsightError] = useState<string | null>(null);
  const soundContextRef = useRef<AudioContext | null>(null);
  const branchRequestIdRef = useRef(0);
  const selectedMove =
    analysis.moveEvaluations.find((move) => move.ply === selectedPly) ?? analysis.moveEvaluations.at(-1) ?? analysis.moveEvaluations[0];
  const deferredFen = useDeferredValue(selectedMove?.fenAfter ?? "8/8/8/8/8/8/8/8 w - - 0 1");
  const reviewStartFen = analysis.moveEvaluations[0]?.fenBefore ?? deferredFen;
  const selectedIndex = analysis.moveEvaluations.findIndex((move) => move.ply === selectedMove?.ply);
  const nextPositionMove = selectedIndex >= 0 ? analysis.moveEvaluations[selectedIndex + 1] : undefined;
  const moveRows = useMemo(() => buildMoveRows(analysis.moveEvaluations), [analysis.moveEvaluations]);
  const gradeCounts = useMemo(() => createGradeCounts(analysis.moveEvaluations), [analysis.moveEvaluations]);
  const opponentSide = oppositeSide(reviewSide);
  const reviewedName = nameForSide(analysis, reviewSide);
  const opponentName = nameForSide(analysis, opponentSide);
  const reviewedMoves = useMemo(() => analysis.moveEvaluations.filter((move) => move.side === reviewSide), [analysis.moveEvaluations, reviewSide]);
  const reviewMoments = useMemo(
    () => {
      const criticalMomentsForPlayer = analysis.criticalMoments.filter((moment) => {
        const move = analysis.moveEvaluations.find((candidate) => candidate.ply === moment.ply);
        return move?.side === reviewSide;
      });

      if (criticalMomentsForPlayer.length > 0) {
        return criticalMomentsForPlayer.map((moment) => ({
          cpLoss: moment.cpLoss,
          insight: moment.insight,
          ply: moment.ply,
          san: moment.san,
        }));
      }

      return reviewedMoves
        .filter((move) => move.cpLoss >= 60)
        .slice(0, 6)
        .map((move) => ({
          cpLoss: move.cpLoss,
          insight: move.comment,
          ply: move.ply,
          san: move.san,
        }));
    },
    [analysis.criticalMoments, analysis.moveEvaluations, reviewSide, reviewedMoves],
  );
  const story = useMemo(
    () =>
      buildAnalysisStory({
        criticalMoments: reviewMoments.map((moment) => ({
          cpLoss: moment.cpLoss,
          grade: analysis.moveEvaluations.find((move) => move.ply === moment.ply)?.grade ?? "Mistake",
          insight: moment.insight,
          ply: moment.ply,
          san: moment.san,
        })),
        evaluations: reviewedMoves,
        moveCount: analysis.moveCount,
        openingName: analysis.opening.name,
        subject: reviewedName,
        white: analysis.white,
        black: analysis.black,
      }),
    [analysis, reviewMoments, reviewedMoves, reviewedName],
  );
  const selectedStoredEngineLines = useMemo(() => (selectedMove ? buildEngineLines(selectedMove) : []), [selectedMove]);
  const currentStoredEngineLines = useMemo(
    () => (nextPositionMove ? buildEngineLines(nextPositionMove) : []),
    [nextPositionMove],
  );
  const selectedEngineLines = useMemo(
    () => selectedStoredEngineLines.slice(0, engineLineCount),
    [engineLineCount, selectedStoredEngineLines],
  );
  const currentPositionEngineLines = useMemo(
    () => currentStoredEngineLines.slice(0, engineLineCount),
    [currentStoredEngineLines, engineLineCount],
  );
  const branchEngineLines = useMemo(
    () => (branchResult?.engineLines ?? []).slice(0, engineLineCount),
    [branchResult, engineLineCount],
  );
  const maxStoredEngineLineCount = useMemo(
    () => Math.max(1, ...analysis.moveEvaluations.map((move) => move.engineLines?.length ?? buildEngineLines(move).length)),
    [analysis.moveEvaluations],
  );
  const visibleSelectedEngineLineCount = Math.min(engineLineCount, selectedStoredEngineLines.length || 1);
  const selectedBestLine = selectedEngineLines[0];
  const selectedBestSan = selectedEngineLines[0]?.san ?? selectedMove?.bestMove ?? "";
  const selectedBestArrow = useMemo(() => {
    if (!selectedMove) {
      return null;
    }

    return (
      deriveArrowFromSan(selectedMove.fenBefore, selectedBestSan, "best") ??
      deriveArrowFromSan(selectedMove.fenBefore, selectedMove.principalVariation[0] ?? "", "best")
    );
  }, [selectedBestSan, selectedMove]);
  const selectedMoveIsBest =
    selectedBestArrow !== null
      ? `${selectedBestArrow.from}-${selectedBestArrow.to}` === `${selectedMove?.from}-${selectedMove?.to}`
      : selectedMove?.san === selectedBestSan;
  const boardArrows = useMemo(() => {
    if (!selectedMove) {
      return [] as BoardArrow[];
    }

    const arrows: BoardArrow[] = [];
    const seenArrows = new Set<string>();
    const addLineArrow = (line: EngineLine | undefined, tone: BoardArrow["tone"]) => {
      if (!line?.san) {
        return;
      }

      const arrow = deriveArrowFromSan(selectedMove.fenAfter, line.san, tone);
      if (!arrow) {
        return;
      }

      const key = `${arrow.from}-${arrow.to}`;
      if (seenArrows.has(key)) {
        return;
      }

      seenArrows.add(key);
      arrows.push(arrow);
    };
    const selectedMoveNeedsRefutation = selectedMove.cpLoss >= 90;
    const refutationLine = selectedMove.refutationLine ?? currentPositionEngineLines[0];

    if (showBestLine) {
      addLineArrow(currentPositionEngineLines[0], "best");
    }

    if (showAlternatives && engineLineCount > 1) {
      for (const line of currentPositionEngineLines.slice(1)) {
        addLineArrow(line, arrowToneForEngineLine(line.rank));
      }
    }

    if (showMistakeRefutation && selectedMoveNeedsRefutation) {
      addLineArrow(refutationLine, "refutation");
    }

    return arrows;
  }, [currentPositionEngineLines, engineLineCount, selectedMove, showAlternatives, showBestLine, showMistakeRefutation]);
  const usesStockfishDepth = analysis.moveEvaluations.some((move) => move.depth >= 8);
  const engineName = usesStockfishDepth ? "Stockfish" : "Fallback engine";
  const engineDetail = usesStockfishDepth ? "SF 18 UCI" : "Material search";
  const criticalErrorCount = reviewedMoves.filter((move) => move.grade === "Mistake" || move.grade === "Blunder").length;
  const inaccuracyCount = reviewedMoves.filter((move) => move.grade === "Inaccuracy").length;
  const totalCriticalErrorCount = analysis.moveEvaluations.filter((move) => move.grade === "Mistake" || move.grade === "Blunder").length;
  const reviewedAccuracy = accuracyForSide(analysis, reviewSide);
  const opponentAccuracy = accuracyForSide(analysis, opponentSide);
  const reviewedAverageCpLoss = averageLossForSide(analysis.moveEvaluations, reviewSide);
  const opponentAverageCpLoss = averageLossForSide(analysis.moveEvaluations, opponentSide);
  const reviewedSolidMoveCount = reviewedMoves.filter((move) => goodGradeRows.includes(move.grade)).length;
  const reviewedSolidRate = reviewedMoves.length > 0 ? Math.round((reviewedSolidMoveCount / reviewedMoves.length) * 100) : 0;
  const reviewedPerformanceElo = estimatePerformanceElo({
    accuracy: reviewedAccuracy,
    averageCpLoss: reviewedAverageCpLoss,
    moveCount: reviewedMoves.length,
    solidRate: reviewedSolidRate,
  });
  const timeDisplay = parseBaseClock(analysis.timeControl);
  const moveActorName = selectedMove?.side === "white" ? analysis.white : analysis.black;
  const openingName = formatOpeningName(analysis.opening);
  const openingHref = `/opening/${openingPageSlugFor(openingName, analysis.opening.eco)}`;
  const reportCardData = useMemo(() => buildReportCardDataFromAnalysis(analysis), [analysis]);
  const aiCoachGame = useMemo(() => buildAiCoachGameFromAnalysis(analysis), [analysis]);
  const selectedPerspectiveScore = selectedMove ? scoreForSide(selectedMove.score, reviewSide) : 0;
  const refutationSan = selectedMove?.refutationLine?.san ?? currentPositionEngineLines[0]?.san;
  const selectedBestPv = shortPrincipalVariation(selectedBestLine, selectedBestSan);
  const selectedMoveAllowedCopy =
    selectedMove?.grade === "Blunder" && refutationSan
      ? `Your move allowed ${refutationSan}. Best was ${selectedBestPv}.`
      : "";
  const criticalMoveInsights = useMemo(
    () =>
      reviewedMoves
        .filter((move) => move.cpLoss >= 60)
        .sort((left, right) => right.cpLoss - left.cpLoss)
        .slice(0, 3)
        .map((move) => {
          const bestLine = buildEngineLines(move)[0];

          return {
            bestLine,
            bestPv: shortPrincipalVariation(bestLine, move.bestMove),
            move,
            refutation: move.refutationLine,
            theme: coachThemeForMove(move, openingName),
          };
        }),
    [openingName, reviewedMoves],
  );
  const biggestReviewedSwing = criticalMoveInsights[0]?.move ?? reviewedMoves.slice().sort((left, right) => right.cpLoss - left.cpLoss)[0];
  const firstStudyAction = biggestReviewedSwing
    ? `${moveLabel(biggestReviewedSwing)}: compare ${biggestReviewedSwing.san} with ${biggestReviewedSwing.bestMove}.`
    : "No forced mistake queue. Review small eval drifts in the move list.";
  const focusQueue = useMemo(
    () => reviewedMoves.filter((move) => move.cpLoss >= 60).sort((left, right) => left.ply - right.ply),
    [reviewedMoves],
  );
  const visibleMoveRows = useMemo(() => {
    if (!keyMomentsOnly) {
      return moveRows;
    }

    const focusPlies = new Set(focusQueue.map((move) => move.ply));
    return buildMoveRows(analysis.moveEvaluations.filter((move) => focusPlies.has(move.ply)));
  }, [analysis.moveEvaluations, focusQueue, keyMomentsOnly, moveRows]);
  const selectedFocusIndex = focusQueue.findIndex((move) => move.ply === selectedMove?.ply);
  const coachThemeCards = useMemo(() => {
    const seen = new Set<string>();
    const cards = criticalMoveInsights
      .map((insight) => insight.theme)
      .filter((theme) => {
        if (seen.has(theme.title)) {
          return false;
        }

        seen.add(theme.title);
        return true;
      })
      .slice(0, 3);

    if (cards.length > 0) {
      return cards;
    }

    return [
      {
        copy: `${reviewedName} avoided major collapses, so the next gain is cleaner move selection in the ${openingName}.`,
        title: "No major tactical miss",
      },
    ];
  }, [criticalMoveInsights, openingName, reviewedName]);
  const selectedMoveExplanation = selectedMove
    ? explainMoveForCoach({
        actorName: moveActorName,
        bestSan: selectedBestSan,
        move: selectedMove,
        opponentName,
        refutationSan,
      })
    : "";
  const selectedMoveAnnotation = selectedMove ? moveAnnotation(selectedMove, moveLabelPreset) : "";
  const selectedMoveBadges: BoardSquareBadge[] = selectedMove
    ? [
        {
          label: selectedMove.grade,
          square: selectedMove.to,
          src: gradeIconPaths[selectedMove.grade],
        },
      ]
    : [];
  const selectedBoardAnimation = useMemo<BoardAnimatedMove | undefined>(() => {
    if (!selectedMove) {
      return undefined;
    }

    const piece = pieceAtSquareFromFen(selectedMove.fenBefore, selectedMove.from);
    if (!piece) {
      return undefined;
    }

    return {
      from: selectedMove.from,
      id: `${selectedMove.ply}-${selectedMove.from}-${selectedMove.to}-${selectedMove.san}`,
      piece,
      to: selectedMove.to,
    };
  }, [selectedMove]);
  const retryBestMoveLabel = selectedBestPv || selectedBestSan;
  const retryBoardHighlights = retryMode
    ? [
        ...(retryFromSquare ? [{ square: retryFromSquare, tone: "focus" as const }] : []),
        ...(retrySolved && selectedBestArrow
          ? [
              { square: selectedBestArrow.from, tone: "from" as const },
              { square: selectedBestArrow.to, tone: "to" as const },
            ]
          : []),
      ]
    : [
        { square: selectedMove.from, tone: "from" as const },
        { square: selectedMove.to, tone: "to" as const },
      ];
  const retryBoardArrows = useMemo(
    () => (retryMode && retrySolved && selectedBestArrow ? [selectedBestArrow] : []),
    [retryMode, retrySolved, selectedBestArrow],
  );
  const branchLastMove = branchLine.at(-1);
  const branchBoardArrows = useMemo(() => {
    const arrows: BoardArrow[] = [];

    if (branchLastMove) {
      arrows.push({
        from: branchLastMove.from,
        to: branchLastMove.to,
        tone: "played",
      });
    }

    for (const line of branchEngineLines) {
      const arrow = deriveArrowFromSan(branchFen, line.san, arrowToneForEngineLine(line.rank));
      if (arrow) {
        arrows.push(arrow);
      }
    }

    return arrows;
  }, [branchEngineLines, branchFen, branchLastMove]);
  const branchLegalDestinations = useMemo(() => {
    if (!branchMode || !branchFromSquare) {
      return [];
    }

    try {
      const chess = new Chess(branchFen || selectedMove.fenBefore);
      return chess
        .moves({ square: branchFromSquare as Square, verbose: true })
        .map((move) => move.to);
    } catch {
      return [];
    }
  }, [branchFen, branchFromSquare, branchMode, selectedMove.fenBefore]);
  const branchBoardHighlights = branchMode
    ? [
        ...(branchLastMove
          ? [
              { square: branchLastMove.from, tone: "from" as const },
              { square: branchLastMove.to, tone: "to" as const },
            ]
          : []),
        ...(branchFromSquare ? [{ square: branchFromSquare, tone: "focus" as const }] : []),
        ...branchLegalDestinations.map((square) => ({ square, tone: "to" as const })),
      ]
    : [];
  const boardFen = reviewIntroMode ? reviewStartFen : branchMode ? branchFen || selectedMove.fenBefore : retryMode ? selectedMove.fenBefore : deferredFen;
  const boardArrowsToShow = useMemo(
    () => (reviewIntroMode ? [] : branchMode ? branchBoardArrows : retryMode ? retryBoardArrows : boardArrows),
    [boardArrows, branchBoardArrows, branchMode, retryBoardArrows, retryMode, reviewIntroMode],
  );
  const boardBadgesToShow = reviewIntroMode || retryMode || branchMode ? [] : selectedMoveBadges;
  const boardHighlightsToShow = reviewIntroMode ? [] : branchMode ? branchBoardHighlights : retryBoardHighlights;
  const boardAnimatedMove = reviewIntroMode || retryMode || branchMode ? undefined : selectedBoardAnimation;
  const boardEvaluation = reviewIntroMode ? 0 : branchMode ? branchResult?.score ?? selectedBestLine?.score ?? selectedMove.score : selectedMove.score;
  const boardEvaluationLabel = reviewIntroMode
    ? "0.00"
    : branchMode
      ? branchPending
        ? "..."
        : branchResult
          ? formatEngineScore(branchResult.score)
          : "Branch"
      : formatEngineScore(boardEvaluation);
  const boardFlipped = reviewSide === "black" ? !boardFlipOffset : boardFlipOffset;
  const boardOrientation: BoardOrientation = boardFlipped ? "black" : "white";
  const topBoardPlayer = boardFlipped
    ? {
        clock: timeDisplay,
        meta: `Accuracy ${Math.round(analysis.accuracyWhite)}%`,
        name: analysis.white,
      }
    : {
        clock: timeDisplay,
        meta: `Accuracy ${Math.round(analysis.accuracyBlack)}%`,
        name: analysis.black,
      };
  const bottomBoardPlayer = boardFlipped
    ? {
        clock: timeDisplay,
        meta: `Accuracy ${Math.round(analysis.accuracyBlack)}%`,
        name: analysis.black,
      }
    : {
        clock: timeDisplay,
        meta: `Accuracy ${Math.round(analysis.accuracyWhite)}%`,
        name: analysis.white,
      };
  const analysisArrowsVisible = showBestLine || showAlternatives || showMistakeRefutation;

  useEffect(() => {
    if (reviewIntroMode || boardArrowsToShow.length === 0) {
      return;
    }

    console.info(
      `Rendering arrows for move ${selectedMove.ply}`,
      boardArrowsToShow.map((arrow) => `${arrow.from}${arrow.to}:${arrow.tone ?? "best"}`).join(", "),
    );
  }, [boardArrowsToShow, reviewIntroMode, selectedMove.ply]);

  function playPieceSound(kind: PieceSoundKind) {
    if (!moveSoundsEnabled || typeof window === "undefined") {
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    const context = soundContextRef.current ?? new AudioContextConstructor();
    soundContextRef.current = context;
    void context.resume();

    const now = context.currentTime;
    const master = context.createGain();
    const filter = context.createBiquadFilter();
    const oscillator = context.createOscillator();
    const isCapture = kind === "capture";
    const isError = kind === "error";
    const isSuccess = kind === "success";
    const peak = isError ? 0.055 : isCapture ? 0.115 : isSuccess ? 0.085 : 0.07;
    const startFrequency = isError ? 140 : isCapture ? 185 : isSuccess ? 310 : 235;
    const endFrequency = isError ? 82 : isCapture ? 96 : isSuccess ? 220 : 145;

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(isError ? 420 : 680, now);
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + 0.075);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(peak, now + 0.006);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

    oscillator.connect(filter);
    filter.connect(master);
    master.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.1);

    if (isCapture || isSuccess) {
      const second = context.createOscillator();
      const secondGain = context.createGain();
      second.type = "triangle";
      second.frequency.setValueAtTime(isSuccess ? 430 : 120, now + 0.045);
      second.frequency.exponentialRampToValueAtTime(isSuccess ? 270 : 78, now + 0.12);
      secondGain.gain.setValueAtTime(0.0001, now + 0.04);
      secondGain.gain.exponentialRampToValueAtTime(isSuccess ? 0.045 : 0.075, now + 0.052);
      secondGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      second.connect(secondGain);
      secondGain.connect(context.destination);
      second.start(now + 0.04);
      second.stop(now + 0.14);
    }
  }

  function selectPly(ply: number) {
    const targetMove = analysis.moveEvaluations.find((move) => move.ply === ply);
    if (targetMove && targetMove.ply !== selectedMove?.ply) {
      playPieceSound(pieceSoundForMove(targetMove));
    }

    startTransition(() => {
      setRetryFeedback(null);
      setRetryFromSquare(null);
      setRetryMode(false);
      setRetrySolved(false);
      stopBranchExplorer();
      setReviewIntroMode(false);
      setSelectedPly(ply);
    });
  }

  function jumpMove(step: -1 | 1) {
    if (analysis.moveEvaluations.length === 0) {
      return;
    }

    if (reviewIntroMode) {
      const firstMove = analysis.moveEvaluations[0];
      if (firstMove) {
        selectPly(firstMove.ply);
      }
      return;
    }

    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = clamp(currentIndex + step, 0, analysis.moveEvaluations.length - 1);
    const nextMove = analysis.moveEvaluations[nextIndex];

    if (nextMove) {
      selectPly(nextMove.ply);
    }
  }

  function jumpToMoveBoundary(position: "first" | "last") {
    const move = position === "first" ? analysis.moveEvaluations[0] : analysis.moveEvaluations.at(-1);

    if (move) {
      selectPly(move.ply);
    }
  }

  function jumpFocusMove(direction: -1 | 1) {
    if (focusQueue.length === 0) {
      return;
    }

    const currentIndex = selectedFocusIndex >= 0 ? selectedFocusIndex : direction === 1 ? -1 : 0;
    const nextIndex = (currentIndex + direction + focusQueue.length) % focusQueue.length;
    const nextMove = focusQueue[nextIndex];

    if (nextMove) {
      selectPly(nextMove.ply);
    }
  }

  function startGameReview() {
    const firstMove = analysis.moveEvaluations[0];
    const firstFocus = focusQueue[0] ?? firstMove;

    startTransition(() => {
      setRetryFeedback(null);
      setRetryFromSquare(null);
      setRetryMode(false);
      setRetrySolved(false);
      stopBranchExplorer();
      setReviewIntroMode(false);
      setActiveTab("analysis");
      const nextPly = firstFocus?.ply ?? firstMove?.ply ?? selectedMove.ply;
      setSelectedPly(nextPly);
    });
  }

  function stopBranchExplorer() {
    branchRequestIdRef.current += 1;
    setBranchMode(false);
    setBranchFen("");
    setBranchFromSquare(null);
    setBranchLine([]);
    setBranchResult(null);
    setBranchPending(false);
    setBranchMessage(null);
    setBranchError(null);
  }

  function startBranchExplorer() {
    if (!selectedMove) {
      return;
    }

    setRetryFeedback(null);
    setRetryFromSquare(null);
    setRetryMode(false);
    setRetrySolved(false);
    setReviewIntroMode(false);
    setActiveTab("analysis");
    setBranchMode(true);
    setBranchFen(selectedMove.fenBefore);
    setBranchFromSquare(null);
    setBranchLine([]);
    setBranchResult(null);
    setBranchPending(false);
    setBranchError(null);
    setBranchMessage(`Branch started before ${moveLabel(selectedMove)}. Click a piece, then a legal destination.`);
  }

  function resetBranchExplorer() {
    if (!selectedMove) {
      stopBranchExplorer();
      return;
    }

    branchRequestIdRef.current += 1;
    setBranchFen(selectedMove.fenBefore);
    setBranchFromSquare(null);
    setBranchLine([]);
    setBranchResult(null);
    setBranchPending(false);
    setBranchError(null);
    setBranchMessage(`Branch reset before ${moveLabel(selectedMove)}. Choose a legal move.`);
  }

  async function evaluateBranchPosition(targetFen: string, playedSan: string) {
    const requestId = branchRequestIdRef.current + 1;
    branchRequestIdRef.current = requestId;
    setBranchPending(true);
    setBranchError(null);
    setBranchMessage(`${playedSan} added. Engine is checking this branch.`);

    try {
      const response = await fetch("/api/positions/evaluate", {
        body: JSON.stringify({
          fen: targetFen,
          requestedDepth: "quick",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as BranchEvaluationResponse | { message?: string };

      if (!response.ok) {
        throw new Error("message" in data && data.message ? data.message : "Branch evaluation failed.");
      }

      if (branchRequestIdRef.current !== requestId) {
        return;
      }

      const result = data as BranchEvaluationResponse;
      setBranchResult(result);
      setBranchMessage(`${playedSan} is now a separate branch. Best reply: ${result.bestMove}.`);
    } catch (error) {
      if (branchRequestIdRef.current === requestId) {
        setBranchResult(null);
        setBranchError(error instanceof Error ? error.message : "Branch evaluation failed.");
      }
    } finally {
      if (branchRequestIdRef.current === requestId) {
        setBranchPending(false);
      }
    }
  }

  function handleBranchSquareClick(square: string) {
    if (!branchMode || !selectedMove) {
      return;
    }

    const currentFen = branchFen || selectedMove.fenBefore;

    if (!branchFromSquare) {
      try {
        const chess = new Chess(currentFen);
        const legalMoves = chess.moves({ square: square as Square, verbose: true });
        if (legalMoves.length === 0) {
          playPieceSound("error");
          setBranchMessage(`No legal branch moves from ${square}.`);
          return;
        }
      } catch {
        playPieceSound("error");
        setBranchMessage(`No legal branch moves from ${square}.`);
        return;
      }

      playPieceSound("select");
      setBranchFromSquare(square);
      setBranchMessage(`Selected ${square}. Choose a legal destination for the branch.`);
      return;
    }

    if (branchFromSquare === square) {
      playPieceSound("error");
      setBranchFromSquare(null);
      setBranchMessage("Selection cleared. Choose a piece to move in this branch.");
      return;
    }

    try {
      const chess = new Chess(currentFen);
      const attemptedMove = chess.move({
        from: branchFromSquare,
        promotion: "q",
        to: square,
      });
      const fenBefore = currentFen;
      const fenAfter = chess.fen();
      const branchMove: BranchMove = {
        captured: Boolean(attemptedMove.captured),
        fenAfter,
        fenBefore,
        from: attemptedMove.from,
        san: attemptedMove.san,
        to: attemptedMove.to,
      };

      playPieceSound(attemptedMove.captured ? "capture" : "move");
      setBranchFromSquare(null);
      setBranchFen(fenAfter);
      setBranchLine((line) => [...line, branchMove]);
      setBranchResult(null);
      void evaluateBranchPosition(fenAfter, attemptedMove.san);
    } catch {
      playPieceSound("error");
      setBranchFromSquare(null);
      setBranchMessage(`${branchFromSquare}-${square} is not legal from this branch.`);
    }
  }

  function startRetryTrainer() {
    if (!selectedBestArrow) {
      setRetryFeedback("No stored best move for this position.");
      return;
    }

    stopBranchExplorer();
    setRetryFeedback("Click the starting square, then the destination square.");
    setRetryFromSquare(null);
    setRetryMode(true);
    setRetrySolved(false);
  }

  function stopRetryTrainer() {
    setRetryFeedback(null);
    setRetryFromSquare(null);
    setRetryMode(false);
    setRetrySolved(false);
  }

  function handleRetrySquareClick(square: string) {
    if (!retryMode || !selectedMove) {
      return;
    }

    if (!retryFromSquare) {
      playPieceSound("select");
      setRetryFromSquare(square);
      setRetryFeedback(`Selected ${square}. Now choose the destination square.`);
      return;
    }

    if (retryFromSquare === square) {
      playPieceSound("error");
      setRetryFromSquare(null);
      setRetryFeedback("Selection cleared. Choose the starting square again.");
      return;
    }

    try {
      const chess = new Chess(selectedMove.fenBefore);
      const attemptedMove = chess.move({
        from: retryFromSquare,
        promotion: "q",
        to: square,
      });

      const attemptedKey = `${attemptedMove.from}-${attemptedMove.to}`;
      const bestKey = selectedBestArrow ? `${selectedBestArrow.from}-${selectedBestArrow.to}` : "";
      setRetryFromSquare(null);

      if (attemptedKey === bestKey) {
        playPieceSound(attemptedMove.captured ? "capture" : "success");
        setRetryFeedback(`Correct. ${attemptedMove.san} matches the engine's best move: ${retryBestMoveLabel}.`);
        setRetrySolved(true);
        return;
      }

      playPieceSound(attemptedMove.captured ? "capture" : "move");
      setRetryFeedback(`${attemptedMove.san} is legal, but the engine wanted ${retryBestMoveLabel}. Try again.`);
      setRetrySolved(false);
    } catch {
      playPieceSound("error");
      setRetryFeedback(`That move is not legal from ${retryFromSquare} to ${square}. Try again.`);
      setRetryFromSquare(null);
      setRetrySolved(false);
    }
  }

  async function copyToClipboard(value: string, label: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.append(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }

      setCopyStatus(`${label} copied`);
      window.setTimeout(() => setCopyStatus(null), 1800);
    } catch {
      setCopyStatus(`Could not copy ${label.toLowerCase()}`);
      window.setTimeout(() => setCopyStatus(null), 2200);
    }
  }

  function copyShareLink() {
    if (typeof window === "undefined") {
      return;
    }

    void copyToClipboard(getAnalysisShareUrl(), "Share link");
  }

  function getAnalysisShareUrl() {
    if (typeof window === "undefined") {
      return `/analysis/${analysis.id}`;
    }

    return `${window.location.origin}/analysis/${analysis.id}`;
  }

  async function downloadReportCard() {
    setShareMenuOpen(true);
    setShareCardPending(true);

    try {
      const response = await fetch("/api/generate-report-card", {
        body: JSON.stringify(reportCardData),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Report card generation failed.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const white = safeFilenameSegment(reportCardData.whitePlayer) || "white";
      const black = safeFilenameSegment(reportCardData.blackPlayer) || "black";

      link.href = objectUrl;
      link.download = `chessfork-${white}-vs-${black}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setCopyStatus("Report card downloaded");
      window.setTimeout(() => setCopyStatus(null), 1800);
    } catch {
      setCopyStatus("Could not generate report card");
      window.setTimeout(() => setCopyStatus(null), 2200);
    } finally {
      setShareCardPending(false);
    }
  }

  function openTwitterShare() {
    if (typeof window === "undefined") {
      return;
    }

    const shareUrl = getAnalysisShareUrl();
    const tweet = `Just analyzed my game on Chessfork!\n${reportCardData.whitePlayer} ${reportCardData.whiteAccuracy}% vs ${reportCardData.blackPlayer} ${reportCardData.blackAccuracy}%\nOpening: ${reportCardData.opening}\n🔥 Powered by Stockfish 18 — Free & Unlimited\n${shareUrl} #chess #chessfork`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, "_blank", "noopener,noreferrer");
  }

  function toggleAnalysisArrows() {
    const nextValue = !analysisArrowsVisible;
    setShowBestLine(nextValue);
    setShowAlternatives(nextValue);
    setShowMistakeRefutation(nextValue);
  }

  function handleBoardContextMenu(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    setBoardContextMenu({
      x: event.clientX,
      y: event.clientY,
    });
  }

  const handleAnalysisKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) {
      return;
    }

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      jumpMove(1);
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      jumpMove(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      jumpToMoveBoundary("first");
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      jumpToMoveBoundary("last");
      return;
    }

    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      setIsReplayPlaying((playing) => !playing);
      return;
    }

    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      setBoardFlipOffset((offset) => !offset);
      return;
    }

    if (event.key.toLowerCase() === "c") {
      event.preventDefault();
      void copyToClipboard(selectedMove.fenAfter, "FEN");
    }
  });

  const handleReplayTick = useEffectEvent(() => {
    if (analysis.moveEvaluations.length === 0) {
      setIsReplayPlaying(false);
      return;
    }

    if (reviewIntroMode) {
      const firstMove = analysis.moveEvaluations[0];
      if (firstMove) {
        selectPly(firstMove.ply);
      }
      return;
    }

    const currentIndex = selectedIndex >= 0 ? selectedIndex : -1;
    const nextMove = analysis.moveEvaluations[currentIndex + 1];

    if (!nextMove) {
      setIsReplayPlaying(false);
      return;
    }

    selectPly(nextMove.ply);
  });

  useEffect(() => {
    window.addEventListener("keydown", handleAnalysisKeyDown);

    return () => {
      window.removeEventListener("keydown", handleAnalysisKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isReplayPlaying) {
      return;
    }

    const timer = window.setInterval(() => handleReplayTick(), replaySpeedMs);

    return () => window.clearInterval(timer);
  }, [isReplayPlaying, replaySpeedMs]);

  useEffect(() => {
    const timer = window.setTimeout(() => setAnalysisToastVisible(false), 4200);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!boardContextMenu) {
      return;
    }

    const closeMenu = () => setBoardContextMenu(null);
    const handleMenuKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", handleMenuKey);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", handleMenuKey);
    };
  }, [boardContextMenu]);

  useEffect(() => {
    if (!movesPanelOpen) {
      return;
    }

    const closeMovesPanel = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMovesPanelOpen(false);
      }
    };

    window.addEventListener("keydown", closeMovesPanel);

    return () => {
      window.removeEventListener("keydown", closeMovesPanel);
    };
  }, [movesPanelOpen]);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `knightowl:quick-insight:${analysis.id}`;

    try {
      const rawCache = window.localStorage.getItem(cacheKey);

      if (rawCache) {
        const cached = JSON.parse(rawCache) as QuickInsightCache;

        if (cached.createdAt && Date.now() - cached.createdAt <= quickInsightCacheTtlMs && cached.insight) {
          window.queueMicrotask(() => {
            if (cancelled) {
              return;
            }

            setQuickInsight(cached.insight);
            setQuickInsightError(null);
            setQuickInsightPending(false);
          });

          return () => {
            cancelled = true;
          };
        }

        window.localStorage.removeItem(cacheKey);
      }
    } catch {
      window.localStorage.removeItem(cacheKey);
    }

    async function loadQuickInsight() {
      setQuickInsight(null);
      setQuickInsightError(null);
      setQuickInsightPending(true);

      try {
        const response = await fetch("/api/ai-coach", {
          body: JSON.stringify({
            games: [aiCoachGame],
            playerColor: reviewSide,
            playerName: reviewedName,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const data = (await response.json()) as Partial<AiCoachReport> & { detail?: string; error?: string; message?: string };

        if (data.error === "Claude unavailable") {
          return;
        }

        if (!response.ok) {
          throw new Error(data.message ?? "Quick insight unavailable.");
        }

        const insight =
          data.quickInsight ??
          data.summary ??
          data.weaknesses?.[0]?.description;

        if (!insight) {
          return;
        }

        if (cancelled) {
          return;
        }

        setQuickInsight(insight);
        window.localStorage.setItem(cacheKey, JSON.stringify({ createdAt: Date.now(), insight } satisfies QuickInsightCache));
      } catch (error) {
        if (!cancelled) {
          setQuickInsightError(error instanceof Error ? error.message : "Quick insight unavailable.");
        }
      } finally {
        if (!cancelled) {
          setQuickInsightPending(false);
        }
      }
    }

    void loadQuickInsight();

    return () => {
      cancelled = true;
    };
  }, [aiCoachGame, analysis.id, reviewSide, reviewedName]);

  if (!selectedMove) {
    return null;
  }

  return (
    <div
      data-review-theme="dark"
      className="relative grid min-w-0 gap-4 text-slate-100 xl:grid-cols-[minmax(32rem,1fr)_minmax(19rem,23rem)] 2xl:grid-cols-[minmax(0,1fr)_26rem]"
    >
      {analysisToastVisible ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-[0.9rem] border border-[#00d4aa]/25 bg-[#111118]/95 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur">
          Analysis complete. Game Review is ready.
        </div>
      ) : null}

      {movesPanelOpen ? (
        <div
          aria-label="Move list"
          aria-modal="true"
          className="fixed inset-0 z-40 flex justify-end bg-black/55 p-3 backdrop-blur-sm sm:p-5"
          onClick={() => setMovesPanelOpen(false)}
          role="dialog"
        >
          <div
            className="flex h-full w-full max-w-[25rem] min-w-0 flex-col gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-[#111118]/95 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#00d4aa]">Move list</p>
                <p className="mt-1 text-sm text-slate-300">Jump to any classified move.</p>
              </div>
              <button
                aria-label="Close move list"
                className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-slate-200 transition hover:bg-white/[0.1]"
                onClick={() => setMovesPanelOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <ReviewMoveListSidebar
              className="min-h-0 flex-1"
              keyMomentsOnly={keyMomentsOnly}
              labelPreset={moveLabelPreset}
              moveRows={visibleMoveRows}
              onSelectPly={(ply) => {
                selectPly(ply);
                setMovesPanelOpen(false);
              }}
              onToggleKeyMomentsOnly={() => setKeyMomentsOnly((value) => !value)}
              reviewSide={reviewSide}
              selectedPly={selectedMove.ply}
            />
          </div>
        </div>
      ) : null}

      <div
        className="min-w-0 rounded-xl border border-[#1e1e2e] bg-[linear-gradient(180deg,#111118,#0a0a0f)] p-3 shadow-[0_0_20px_rgba(0,212,170,0.12),0_35px_90px_rgba(0,0,0,0.38)] sm:p-4"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4 px-1 pt-1 sm:px-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00d4aa]/85">
              {reviewIntroMode ? "Game review board" : "Engine review board"}
            </p>
            <p className="mt-2 break-words text-xl font-semibold leading-tight text-white sm:text-2xl 2xl:text-3xl">
              {reviewIntroMode ? `${analysis.white} vs ${analysis.black}` : moveLabel(selectedMove)}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {reviewIntroMode
                ? `${describePerspectiveResult(analysis, reviewSide)} / ready to replay from the first move`
                : `${reviewedName} report / move by ${moveActorName} / ${describePerspectiveEdge(selectedMove.score, reviewSide, reviewedName, opponentName)}`}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Opening: <span className="text-[#9fffea]">{analysis.opening.eco}</span>{" "}
              <Link href={openingHref} className="normal-case tracking-normal text-slate-300 transition hover:text-[#00d4aa]">
                {openingName}
              </Link>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMovesPanelOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#00d4aa]/25 bg-[#00d4aa]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#d8fff6] hover:bg-[#00d4aa]/18"
            >
              <List className="size-4" />
              Moves
            </button>
            <button
              type="button"
              onClick={() => setBoardFlipOffset((offset) => !offset)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 hover:bg-white/[0.08]"
            >
              <RotateCw className="size-4" />
              Flip
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={downloadReportCard}
                disabled={shareCardPending}
                aria-expanded={shareMenuOpen}
                className="inline-flex items-center gap-2 rounded-full border border-[#00d4aa]/25 bg-[#00d4aa]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#d8fff6] transition hover:bg-[#00d4aa]/18 disabled:cursor-wait disabled:opacity-70"
              >
                <Share2 className="size-4" />
                {shareCardPending ? "Building" : "Share"}
              </button>
              {shareMenuOpen ? (
                <div className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-[0.9rem] border border-white/10 bg-[#111118]/95 p-1.5 text-sm text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur">
                  <button
                    type="button"
                    onClick={downloadReportCard}
                    disabled={shareCardPending}
                    className="flex w-full items-center gap-2 rounded-[0.65rem] px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Download className="size-4 text-[#00d4aa]" />
                    Download PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      copyShareLink();
                      setShareMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-[0.65rem] px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    <Link2 className="size-4 text-[#00d4aa]" />
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openTwitterShare();
                      setShareMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-[0.65rem] px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    <ExternalLink className="size-4 text-[#00d4aa]" />
                    Share on X
                  </button>
                </div>
              ) : null}
            </div>
            {reviewIntroMode ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#00d4aa]/25 bg-[#00d4aa]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#d8fff6]">
                <Sparkles className="size-4" />
                Review ready
              </span>
            ) : (
              <>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${gradeTone(selectedMove.grade)}`}>
                  <GradeIcon grade={selectedMove.grade} className="size-4" />
                  {gradeDescriptor(selectedMove.grade, moveLabelPreset)}
                </span>
                <span className="rounded-full border border-[#00d4aa]/20 bg-[#00d4aa]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#d8fff6]">
                  {formatEngineScore(selectedPerspectiveScore)}
                </span>
              </>
            )}
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              {engineName}
            </span>
            <span className="rounded-full border border-sky-300/15 bg-sky-300/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/80">
              Arrow keys replay
            </span>
          </div>
        </div>

        <ChessBoard
          fen={boardFen}
          arrows={boardArrowsToShow}
          animatedMove={boardAnimatedMove}
          badges={boardBadgesToShow}
          evaluation={boardEvaluation}
          evaluationLabel={boardEvaluationLabel}
          highlights={boardHighlightsToShow}
          onBoardContextMenu={handleBoardContextMenu}
          onSquareClick={branchMode ? handleBranchSquareClick : retryMode ? handleRetrySquareClick : undefined}
          orientation={boardOrientation}
          pieceTheme={pieceTheme}
          showCoordinates={showCoordinates}
          tone={boardTone}
          topPlayer={topBoardPlayer}
          bottomPlayer={bottomBoardPlayer}
          variant="analysis"
          className={cn("mx-auto w-full", showWideBoard ? "max-w-[44rem]" : "max-w-[38rem]")}
        />

        {boardContextMenu ? (
          <div
            className="fixed z-50 w-52 overflow-hidden rounded-[0.9rem] border border-white/10 bg-[#262421]/95 p-1.5 text-sm text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur"
            style={{
              left: boardContextMenu.x,
              top: boardContextMenu.y,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {[
              {
                icon: Clipboard,
                label: "Copy FEN",
                onClick: () => {
                  void copyToClipboard(selectedMove.fenAfter, "FEN");
                  setBoardContextMenu(null);
                },
              },
              {
                icon: RotateCw,
                label: boardFlipped ? "White at bottom" : "Black at bottom",
                onClick: () => {
                  setBoardFlipOffset((offset) => !offset);
                  setBoardContextMenu(null);
                },
              },
              {
                icon: Target,
                label: analysisArrowsVisible ? "Hide arrows" : "Show arrows",
                onClick: () => {
                  toggleAnalysisArrows();
                  setBoardContextMenu(null);
                },
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className="flex w-full items-center gap-3 rounded-[0.65rem] px-3 py-2 text-left font-semibold hover:bg-white/10"
                >
                  <Icon className="size-4 text-[#00d4aa]" />
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {reviewIntroMode ? (
          <div className="mt-3 rounded-[1.15rem] border border-lime-300/15 bg-[linear-gradient(135deg,rgba(95,130,58,0.16),rgba(255,255,255,0.035))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-lime-200">Ready for review</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Start from the initial position, then walk through the engine-backed review with arrow keys, move icons, and Stockfish lines.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startGameReview}
                className="rounded-full bg-[linear-gradient(180deg,#00d4aa,#00a889)] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:brightness-110"
              >
                Start Review
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(analysis.pgn, "PGN")}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                Copy PGN
              </button>
              {copyStatus ? (
                <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.08] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
                  {copyStatus}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
        <div className="mt-3 rounded-[1.15rem] border border-white/10 bg-white/[0.035] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-sky-200">Why this move?</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{selectedMoveExplanation}</p>
          <p className="mt-2 rounded-[0.9rem] border border-white/10 bg-black/12 px-3 py-2 text-sm leading-6 text-slate-200">
            {selectedMoveAnnotation}
          </p>
          {retryMode ? (
            <div className="mt-3 rounded-[1rem] border border-amber-300/18 bg-amber-300/[0.08] px-3 py-3">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-amber-100">Try best move</p>
              <p className="mt-1 text-sm leading-6 text-slate-200">{retryFeedback}</p>
            </div>
          ) : null}
          {branchMode ? (
            <div className="mt-3 rounded-[1rem] border border-sky-300/18 bg-sky-300/[0.08] px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-sky-100">What-if branch</p>
                  <p className="mt-1 text-sm leading-6 text-slate-200">
                    {branchError ?? branchMessage ?? "Click a piece, then a legal destination."}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Detailed engine lines are in the Analysis panel.</p>
                </div>
                <span className="shrink-0 rounded-full border border-sky-300/20 bg-black/20 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-sky-100">
                  {branchPending ? "Thinking" : branchResult ? `Depth ${branchResult.depth}` : "Ready"}
                </span>
              </div>

              {branchLine.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {branchLine.map((move, index) => (
                    <span
                      key={`${move.fenBefore}-${move.san}-${index}`}
                      className="rounded-full border border-white/10 bg-black/18 px-2.5 py-1 text-xs font-semibold text-slate-100"
                    >
                      {move.san}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={branchMode ? stopBranchExplorer : startBranchExplorer}
              className={analysisActionButtonClassName}
            >
              {branchMode ? "Exit branch" : "Explore line"}
            </button>
            {branchMode ? (
              <button
                type="button"
                onClick={resetBranchExplorer}
                className={analysisActionButtonClassName}
              >
                Reset branch
              </button>
            ) : null}
            <button
              type="button"
              onClick={retryMode ? stopRetryTrainer : startRetryTrainer}
              disabled={!selectedBestArrow}
              className={analysisPrimaryActionButtonClassName}
            >
              {retryMode ? "Exit trainer" : "Try best move"}
            </button>
            <button
              type="button"
              onClick={() => jumpFocusMove(-1)}
              disabled={focusQueue.length === 0}
              className={analysisActionButtonClassName}
            >
              Previous focus
            </button>
            <button
              type="button"
              onClick={() => jumpFocusMove(1)}
              disabled={focusQueue.length === 0}
              className={analysisActionButtonClassName}
            >
              Next focus
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(selectedMove.fenAfter, "FEN")}
              className={analysisCopyActionButtonClassName}
            >
              Copy FEN
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(analysis.pgn, "PGN")}
              className={analysisCopyActionButtonClassName}
            >
              Copy PGN
            </button>
            {copyStatus ? (
              <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.08] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
                {copyStatus}
              </span>
            ) : null}
          </div>
        </div>
        )}

        {quickInsight ? (
          <div className="mt-3 rounded-[1rem] border border-[#00d4aa]/20 bg-[#00d4aa]/10 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            {quickInsightPending ? (
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#8fffe7]">Quick Insight</p>
                <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-white/12" />
              </div>
            ) : quickInsight ? (
              <p className="text-sm leading-6 text-slate-100">
                💡 <span className="font-semibold text-[#8fffe7]">Quick Insight:</span> {quickInsight}
              </p>
            ) : (
              <p className="text-sm leading-6 text-slate-300">
                💡 <span className="font-semibold text-[#8fffe7]">Quick Insight:</span> {quickInsightError}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <aside className="min-w-0 flex min-h-[34rem] flex-col overflow-hidden rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,#111118,#0a0a0f)] shadow-[0_35px_90px_rgba(0,0,0,0.35)] xl:sticky xl:top-5 xl:h-[calc(100vh-2.5rem)] xl:max-h-[calc(100vh-2.5rem)]">
        <div className="border-b border-white/10 px-4 pt-4 sm:px-5 sm:pt-5">
          <div className="grid grid-cols-4 gap-2 pb-3">
            {tabOrder.map((tab) => {
              const active = activeTab === tab.key;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "inline-flex min-w-0 flex-col items-center justify-center gap-1 rounded-t-[0.9rem] border-b-2 px-1 py-2.5 text-[0.7rem] font-semibold tracking-[0.02em] transition sm:px-2 sm:text-[0.8rem] sm:tracking-[0.04em]",
                    active ? "border-[#00d4aa] text-[#00d4aa]" : "border-transparent text-slate-400 hover:text-white",
                  )}
                >
                  <Icon className={cn("size-4", active ? "text-[#00d4aa]" : "text-slate-500")} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-b border-white/10 bg-black/10 px-4 py-3 sm:px-5">
          <div className="mb-3 grid grid-cols-2 gap-2">
            {[
              { accent: "bg-white", label: "White", value: analysis.accuracyWhite },
              { accent: "bg-slate-900", label: "Black", value: analysis.accuracyBlack },
            ].map((item) => (
              <div key={item.label} className="rounded-[0.9rem] border border-white/10 bg-white/[0.045] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", item.accent)} />
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                </div>
                <p className="mt-1 text-2xl font-semibold text-white">{item.value.toFixed(1)}%</p>
              </div>
            ))}
          </div>

          <ColorCodedMoveList
            labelPreset={moveLabelPreset}
            moveRows={moveRows}
            onSelectPly={selectPly}
            selectedPly={selectedMove.ply}
          />

          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              {reviewIntroMode ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-[0.9rem] bg-lime-300/12 text-lime-200">
                        <Sparkles className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">Game Review Ready</p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {analysis.opening.eco} / {openingName} / {analysis.moveCount} moves
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#00d4aa]/20 bg-[#00d4aa]/10 px-2.5 py-1 text-xs font-semibold text-[#d8fff6]">
                      0.00
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { label: "Accuracy", value: `${reviewedAccuracy.toFixed(1)}%` },
                      { label: "ACPL", value: reviewedAverageCpLoss.toString() },
                      { label: "Lines", value: engineLineCount.toString() },
                    ].map((item) => (
                      <div key={item.label} className="min-w-0 rounded-[0.9rem] border border-white/10 bg-black/12 px-2.5 py-2">
                        <p className="text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-100">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-[0.9rem] bg-white/[0.06]">
                        <GradeIcon grade={selectedMove.grade} className="size-7" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{moveLabel(selectedMove)}</p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {gradeDescriptor(selectedMove.grade, moveLabelPreset)} / best was {selectedBestSan || "unknown"}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#00d4aa]/20 bg-[#00d4aa]/10 px-2.5 py-1 text-xs font-semibold text-[#d8fff6]">
                      {formatEngineScore(selectedPerspectiveScore)}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { label: "Depth", value: selectedMove.depth.toString() },
                      { label: "Lines", value: `${visibleSelectedEngineLineCount}/${engineLineCount}` },
                      { label: "Swing", value: formatCpLossLabel(selectedMove.cpLoss) },
                    ].map((item) => (
                      <div key={item.label} className="min-w-0 rounded-[0.9rem] border border-white/10 bg-black/12 px-2.5 py-2">
                        <p className="text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-100">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4">
          {activeTab === "report" ? (
            <div className="min-w-0 space-y-3 sm:space-y-4">
              {reviewIntroMode ? (
                <GameReviewIntroCard
                  analysis={analysis}
                  counts={gradeCounts}
                  labelPreset={moveLabelPreset}
                  onStartReview={startGameReview}
                  opponentAccuracy={opponentAccuracy}
                  opponentName={opponentName}
                  opponentSide={opponentSide}
                  reviewedAccuracy={reviewedAccuracy}
                  reviewedAverageCpLoss={reviewedAverageCpLoss}
                  reviewedName={reviewedName}
                  reviewSide={reviewSide}
                />
              ) : (
                <>
                  <ReportSummaryHero
                    analysis={analysis}
                    biggestReviewedSwing={biggestReviewedSwing}
                    firstStudyAction={firstStudyAction}
                    onStartReview={startGameReview}
                    openingName={openingName}
                    opponentAccuracy={opponentAccuracy}
                    opponentAverageCpLoss={opponentAverageCpLoss}
                    opponentName={opponentName}
                    opponentSide={opponentSide}
                    reviewedAccuracy={reviewedAccuracy}
                    reviewedAverageCpLoss={reviewedAverageCpLoss}
                    reviewedName={reviewedName}
                    reviewedPerformanceElo={reviewedPerformanceElo}
                    reviewedSolidRate={reviewedSolidRate}
                    reviewSide={reviewSide}
                    totalCriticalErrorCount={totalCriticalErrorCount}
                  />

                  <WinProbabilityChart
                    labelPreset={moveLabelPreset}
                    moves={analysis.moveEvaluations}
                    onSelectPly={selectPly}
                    selectedPly={selectedMove.ply}
                  />

                  <div className="grid gap-4 min-[560px]:grid-cols-2">
                    <MoveQualityCompact
                      counts={gradeCounts}
                      labelPreset={moveLabelPreset}
                      opponentSide={opponentSide}
                      reviewSide={reviewSide}
                    />
                    <CriticalQueueCompact
                      criticalErrorCount={criticalErrorCount}
                      inaccuracyCount={inaccuracyCount}
                      insights={criticalMoveInsights}
                      onSelectPly={selectPly}
                    />
                  </div>
                </>
              )}

              <ReportMethodNote
                averageCpLoss={reviewedAverageCpLoss}
                labelPreset={moveLabelPreset}
                reviewedAccuracy={reviewedAccuracy}
              />
            </div>
          ) : null}

          {activeTab === "analysis" ? (
            <div className="min-w-0 space-y-3">
              {branchMode ? (
                <BranchAnalysisConsole
                  branchError={branchError}
                  branchLine={branchLine}
                  branchMessage={branchMessage}
                  branchPending={branchPending}
                  branchResult={branchResult}
                  candidateLines={branchEngineLines}
                  engineDetail={engineDetail}
                  engineLineCount={engineLineCount}
                  engineName={engineName}
                  onExit={stopBranchExplorer}
                  onReset={resetBranchExplorer}
                  selectedMove={selectedMove}
                />
              ) : null}

              <div className="rounded-[1.25rem] border border-white/10 bg-[#272522] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[0.9rem] bg-white/[0.06]">
                    <GradeIcon grade={selectedMove.grade} className="size-7" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-xl font-semibold text-white">{moveLabel(selectedMove)}</p>
                      <GradeLabel grade={selectedMove.grade} preset={moveLabelPreset} />
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      {selectedMoveIsBest
                        ? "This matches the engine's best move."
                        : `Better was ${selectedBestSan || "unknown"}.`}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="min-w-0 rounded-[0.85rem] border border-white/10 bg-black/12 px-3 py-2">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Played</p>
                        <p className="mt-1 truncate font-semibold text-white">{selectedMove.san}</p>
                      </div>
                      <div className="min-w-0 rounded-[0.85rem] border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-emerald-200">Best</p>
                        <p className="mt-1 truncate font-semibold text-white">{selectedBestSan || "Unknown"}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {formatCpLossLabel(selectedMove.cpLoss)} / {formatEngineScore(selectedPerspectiveScore)} / depth {selectedMove.depth}
                    </p>
                  </div>
                </div>
              </div>

              <div className="hidden rounded-[1.55rem] border border-amber-300/15 bg-[linear-gradient(135deg,rgba(245,158,11,0.13),rgba(255,255,255,0.035))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#00d4aa]">Opening</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-300/25 bg-amber-300/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                    {analysis.opening.eco}
                  </span>
                  <Link href={openingHref} className="min-w-0 text-lg font-semibold text-white transition hover:text-[#00d4aa]">
                    {openingName}
                  </Link>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">{describeOpeningPhase(selectedMove, openingName)}</p>
              </div>

              <div className="hidden overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#111118] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="border-b border-amber-300/25 bg-amber-300/[0.04] px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
                      <Target className="size-4 shrink-0 text-[#00d4aa]" />
                      <span className="truncate">Engine candidates</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {engineName}
                      </span>
                      <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                        showing {visibleSelectedEngineLineCount}/{engineLineCount} lines
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Candidate rows judge the move before it was played. Board arrows show legal engine replies from the visible position.
                  </p>
                </div>
                <div className="space-y-2 p-4">
                  {selectedEngineLines.map((line) => (
                    <div
                      key={`${line.rank}-${line.san}`}
                      className={cn(
                        "grid grid-cols-[auto_1fr] items-center gap-3 rounded-[1rem] border px-3 py-3",
                        line.rank === 1
                          ? "border-emerald-300/18 bg-emerald-300/[0.08]"
                          : "border-white/10 bg-white/[0.025]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid min-w-10 place-items-center rounded-full px-2 py-1 text-xs font-semibold",
                          line.rank === 1 ? "bg-white text-black" : "bg-white/[0.06] text-slate-300",
                        )}
                      >
                        {formatEngineScore(scoreForSide(line.score, reviewSide))}
                      </span>
                      <div className="min-w-0 text-sm">
                        <div className="flex min-w-0 items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{line.san}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">{engineLineContinuation(line)}</p>
                          </div>
                          {line.rank === 1 ? (
                            <span className="inline-flex shrink-0 items-center gap-1.5 text-emerald-300">
                              <BestMoveIcon className="size-4" />
                              {engineLineLabel(line.rank)}
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-white/[0.05] px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {engineLineLabel(line.rank)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {selectedMove.cpLoss >= 90 && selectedMove.refutationLine ? (
                    <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[1rem] border border-rose-300/20 bg-rose-300/[0.08] px-3 py-3">
                      <span className="grid min-w-10 place-items-center rounded-full bg-rose-300/15 px-2 py-1 text-xs font-semibold text-rose-100">
                        {formatEngineScore(scoreForSide(selectedMove.refutationLine.score, reviewSide))}
                      </span>
                      <div className="min-w-0 text-sm">
                        <div className="flex min-w-0 items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{selectedMove.refutationLine.san}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">{engineLineContinuation(selectedMove.refutationLine)}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-rose-300/15 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-rose-100">
                            Refutation
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles className="size-4 text-sky-200" />
                  Why this move?
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{selectedMoveExplanation}</p>
                <div className="mt-3 rounded-[0.95rem] border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-3">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-emerald-200">Best line</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{selectedBestPv}</p>
                </div>
                {selectedMoveAllowedCopy ? (
                  <div className="mt-3 rounded-[0.95rem] border border-rose-300/18 bg-rose-300/[0.08] px-3 py-3">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-rose-200">Danger</p>
                    <p className="mt-1 text-sm leading-6 text-rose-50">{selectedMoveAllowedCopy}</p>
                  </div>
                ) : null}
              </div>

              <div className="hidden rounded-[1.55rem] border border-white/10 bg-[#111118] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#00d4aa]">Focus queue</p>
                    <p className="mt-2 text-lg font-semibold text-white">Jump through review-worthy moves</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {focusQueue.length} moments
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setKeyMomentsOnly((value) => !value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition",
                      keyMomentsOnly
                        ? "border-[#00d4aa]/35 bg-[#00d4aa]/12 text-[#d8fff6]"
                        : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20",
                    )}
                  >
                    {keyMomentsOnly ? "Showing key moments" : "Key moments mode"}
                  </button>
                  <button
                    type="button"
                    onClick={() => focusQueue[0] && selectPly(focusQueue[0].ply)}
                    disabled={focusQueue.length === 0}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Review from first
                  </button>
                </div>

                <div className="mt-4 grid gap-2">
                  {focusQueue.length > 0 ? (
                    focusQueue.map((move, index) => (
                      <button
                        key={move.ply}
                        type="button"
                        onClick={() => selectPly(move.ply)}
                        title={moveTooltip(move, moveLabelPreset)}
                        className={cn(
                          "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1rem] border px-3 py-3 text-left transition",
                          selectedMove.ply === move.ply
                            ? "border-[#00d4aa]/35 bg-[#00d4aa]/10"
                            : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.045]",
                        )}
                      >
                        <span className="grid size-7 place-items-center rounded-full bg-white/[0.06] text-xs font-semibold text-slate-300">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <GradeIcon grade={move.grade} className="size-5" />
                            <p className="truncate text-sm font-semibold text-white">{moveLabel(move)}</p>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">{moveAnnotation(move, moveLabelPreset)}</p>
                        </div>
                        <span className="rounded-full bg-black/20 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-amber-100">
                          {formatCpLossLabel(move.cpLoss)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.025] px-3 py-3 text-sm leading-6 text-slate-400">
                      No big review queue for this game. Use the move list for smaller improvements.
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden rounded-[1.55rem] border border-white/10 bg-[#111118] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2">
                  <p className="min-w-0 text-base font-semibold text-white">
                    {reviewedName} report vs {opponentName}
                  </p>
                  <p className="text-sm text-slate-400">Current ply {selectedIndex + 1}</p>
                </div>

                <div className="mt-2 max-h-[28rem] overflow-y-auto pr-1">
                  {visibleMoveRows.map((row) => (
                    <div
                      key={row.moveNumber}
                      className="grid grid-cols-[2.2rem_minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-2 border-t border-white/8 py-2 first:border-t-0"
                    >
                      <p className="pt-2 text-sm font-semibold text-slate-500">{row.moveNumber}.</p>
                      {[row.white, row.black].map((move, slotIndex) =>
                        move ? (
                          <button
                            key={move.ply}
                            type="button"
                            onClick={() => selectPly(move.ply)}
                            title={moveTooltip(move, moveLabelPreset)}
                            className={cn(
                              "min-w-0 rounded-[0.95rem] border px-2.5 py-2.5 text-left transition",
                              selectedMove.ply === move.ply
                                ? "border-[#00d4aa]/35 bg-[#00d4aa]/10"
                                : "border-white/8 bg-[#2d2d31] hover:border-white/20 hover:bg-[#313137]",
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <GradeIcon grade={move.grade} className="size-5" />
                              <div className="min-w-0">
                                <span className="block min-w-0 truncate text-sm font-semibold text-white">{move.san}</span>
                                <GradeLabel grade={move.grade} preset={moveLabelPreset} />
                              </div>
                            </div>
                            <p className="mt-2 line-clamp-2 text-[0.7rem] leading-5 text-slate-400">{moveAnnotation(move, moveLabelPreset)}</p>
                            <div className="mt-2 flex min-w-0 items-center justify-between gap-2 text-[0.68rem] uppercase tracking-[0.16em] text-slate-500">
                              <span>{formatEngineScore(scoreForSide(move.score, reviewSide))}</span>
                              <span>{formatCpLossLabel(move.cpLoss)}</span>
                            </div>
                          </button>
                        ) : (
                          <div key={`empty-${row.moveNumber}-${slotIndex}`} />
                        ),
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "coach" ? (
            <div className="min-w-0 space-y-4 sm:space-y-5">
              <div className="rounded-[1.55rem] border border-amber-300/15 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(255,255,255,0.035))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#00d4aa]">Selected move coach</p>
                <p className="mt-3 text-2xl font-semibold text-white">{moveLabel(selectedMove)}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{selectedMoveExplanation}</p>
                <div className="mt-4 rounded-[1.15rem] border border-emerald-300/15 bg-emerald-300/[0.06] p-3">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-emerald-200">Best was...</p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedBestPv}</p>
                </div>
                {selectedMove.cpLoss >= 90 && refutationSan ? (
                  <div className="mt-4 rounded-[1.15rem] border border-rose-300/15 bg-rose-300/[0.07] p-3 text-sm leading-6 text-rose-50">
                    {selectedMoveAllowedCopy || (
                      <>
                        Your move allowed <span className="font-semibold">{refutationSan}</span>. Replay the red arrow slowly and compare it with{" "}
                        <span className="font-semibold">{selectedBestSan}</span>.
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.55rem] border border-white/10 bg-[#111118] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#00d4aa]">Coach summary</p>
                <div className="mt-4 grid gap-3">
                  {coachThemeCards.map((theme) => (
                    <div key={theme.title} className="rounded-[1.1rem] border border-amber-300/12 bg-amber-300/[0.055] p-4">
                      <p className="text-base font-semibold text-white">{theme.title}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-300">{theme.copy}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  {story.map((item) => (
                    <div key={item} className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.55rem] border border-white/10 bg-[#111118] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles className="size-4 text-[#00d4aa]" />
                  Next study blocks
                </div>
                <div className="mt-4 space-y-3">
                  {reviewMoments.slice(0, 3).map((moment, index) => (
                    <div key={`${moment.ply}-${moment.san}`} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Block 0{index + 1}</p>
                      <p className="mt-2 text-xl font-semibold text-white">{moment.san}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-300">{moment.insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.55rem] border border-white/10 bg-[#111118] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Target className="size-4 text-[#00d4aa]" />
                  Best move chain
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {analysis.bestMoveChain.length > 0 ? (
                    analysis.bestMoveChain.map((move, index) => (
                      <span
                        key={`${move}-${index}`}
                        className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100"
                      >
                        {move}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No principal line was stored for the final summary.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "settings" ? (
            <div className="min-w-0 space-y-4 sm:space-y-5">
              <div className="rounded-[1.55rem] border border-amber-300/15 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(255,255,255,0.035))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#00d4aa]">Engine settings</p>
                    <p className="mt-2 text-xl font-semibold text-white">{engineDetail}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {analysis.depth === "deep" ? "Deep report" : "Quick report"} / selected move depth {selectedMove.depth} /{" "}
                      {formatShortNodes(selectedMove.nodes)} nodes
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    stored max {maxStoredEngineLineCount}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">Engine lines</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      showing {visibleSelectedEngineLineCount}/{engineLineCount}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setEngineLineCount(count)}
                        className={cn(
                          "rounded-[1rem] border px-2 py-3 text-sm font-semibold transition",
                          engineLineCount === count
                            ? "border-[#00d4aa]/40 bg-[#00d4aa]/14 text-[#d8fff6]"
                            : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:text-white",
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    This controls the candidate rows and the number of legal Stockfish arrows drawn on the board. Older reports may only contain
                    fewer stored lines; new reports store up to 5.
                  </p>

                  <div className="mt-4 grid gap-2">
                    {[
                      { copy: "Stockfish line 1", label: "Best", swatch: "bg-[#22c55e]" },
                      { copy: "Stockfish line 2", label: "Okay move", swatch: "bg-[#6f8f36]" },
                      { copy: "Stockfish line 3", label: "Soft okay", swatch: "bg-[#6f8f36]/70" },
                      { copy: "Punish a mistake", label: "Refutation", swatch: "bg-[#ef4444]" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={cn("h-2.5 w-8 rounded-full", item.swatch)} />
                          <p className="truncate text-sm font-semibold text-white">{item.label}</p>
                        </div>
                        <p className="shrink-0 text-xs uppercase tracking-[0.16em] text-slate-500">{item.copy}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.55rem] border border-white/10 bg-[#111118] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#00d4aa]">Board settings</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-white">Board tone</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 min-[430px]:grid-cols-5">
                      {(["slate", "graphite", "forest", "tournament", "warm"] as BoardTone[]).map((toneOption) => (
                        <button
                          key={toneOption}
                          type="button"
                          onClick={() => setBoardTone(toneOption)}
                          className={cn(
                            "rounded-[1rem] border px-3 py-3 text-sm font-semibold capitalize transition",
                            boardTone === toneOption
                              ? "border-[#00d4aa]/40 bg-[#00d4aa]/12 text-[#d8fff6]"
                              : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white",
                          )}
                        >
                          {toneOption}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">Piece style</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {(
                        [
                          { copy: "Polished SVG", label: "Neo", value: "neo" },
                          { copy: "SVG pieces", label: "Classic", value: "classic" },
                        ] satisfies Array<{ copy: string; label: string; value: BoardPieceTheme }>
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPieceTheme(option.value)}
                          className={cn(
                            "rounded-[1rem] border px-3 py-3 text-left transition",
                            pieceTheme === option.value
                              ? "border-[#00d4aa]/40 bg-[#00d4aa]/12 text-[#d8fff6]"
                              : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white",
                          )}
                        >
                          <span className="block text-sm font-semibold">{option.label}</span>
                          <span className="mt-1 block text-xs text-slate-500">{option.copy}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">Move label preset</p>
                    <div className="mt-3 grid gap-2">
                      {(
                        [
                          { copy: "Sigma, Awesome, Strange, Clown", label: "Chessigma", value: "chessigma" },
                          { copy: "Brilliant, Great find, Mistake, Blunder", label: "Classic", value: "classic" },
                          { copy: "Human-friendly coaching labels", label: "Friendly", value: "friendly" },
                        ] satisfies Array<{ copy: string; label: string; value: MoveLabelPreset }>
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setMoveLabelPreset(option.value)}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-[1rem] border px-3 py-3 text-left transition",
                            moveLabelPreset === option.value
                              ? "border-[#00d4aa]/40 bg-[#00d4aa]/12 text-[#d8fff6]"
                              : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">{option.label}</span>
                            <span className="mt-1 block truncate text-xs text-slate-500">{option.copy}</span>
                          </span>
                          <span className="shrink-0 rounded-full border border-white/10 bg-black/15 px-2 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-slate-400">
                            {moveLabelPreset === option.value ? "Active" : "Preset"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        checked: showCoordinates,
                        copy: "Show rank/file labels around the board.",
                        label: "Coordinates",
                        onToggle: () => setShowCoordinates((value) => !value),
                      },
                      {
                        checked: showBestLine,
                        copy: "Draw the top Stockfish reply from the board position you are viewing.",
                        label: "Best line arrow",
                        onToggle: () => setShowBestLine((value) => !value),
                      },
                      {
                        checked: showAlternatives,
                        copy: "Draw additional Stockfish playable replies as lighter arrows, up to the selected line count.",
                        label: "Alternative arrows",
                        onToggle: () => setShowAlternatives((value) => !value),
                      },
                      {
                        checked: showMistakeRefutation,
                        copy: "Show a red engine refutation when the selected move is a mistake or blunder.",
                        label: "Mistake refutation",
                        onToggle: () => setShowMistakeRefutation((value) => !value),
                      },
                      {
                        checked: showWideBoard,
                        copy: "Use the larger presentation board from the analysis view.",
                        label: "Wide board",
                        onToggle: () => setShowWideBoard((value) => !value),
                      },
                      {
                        checked: moveSoundsEnabled,
                        copy: "Play a short wood-click sound when replaying moves or trying the best move.",
                        label: "Move sounds",
                        onToggle: () => setMoveSoundsEnabled((value) => !value),
                      },
                    ].map((setting) => (
                      <button
                        key={setting.label}
                        type="button"
                        onClick={setting.onToggle}
                        className="flex w-full items-start justify-between gap-3 rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:border-white/20"
                      >
                        <div>
                          <p className="font-semibold text-white">{setting.label}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">{setting.copy}</p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
                            setting.checked
                              ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                              : "border-white/10 bg-white/[0.03] text-slate-400",
                          )}
                        >
                          {setting.checked ? "On" : "Off"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.55rem] border border-white/10 bg-[#111118] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#00d4aa]">Current move</p>
                <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                  <p className="min-w-0 truncate text-2xl font-semibold text-white">{moveLabel(selectedMove)}</p>
                  <GradeLabel grade={selectedMove.grade} preset={moveLabelPreset} />
                </div>
                <p className="mt-3 rounded-[1rem] border border-white/10 bg-black/12 px-3 py-3 text-sm leading-6 text-slate-200">
                  {selectedMoveAnnotation}
                </p>
                <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-300">
                  <p>
                    Score for {reviewedName}: <span className="font-semibold text-white">{formatEngineScore(selectedPerspectiveScore)}</span>
                  </p>
                  <p>
                    Centipawn loss: <span className="font-semibold text-white">{formatCpLossValue(selectedMove.cpLoss)}</span>
                  </p>
                  <p>
                    Played {selectedMove.from} to {selectedMove.to}. Best move was <span className="font-semibold text-white">{selectedBestSan}</span>.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/10 p-3 sm:p-3.5">
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => jumpToMoveBoundary("first")}
              className={replayNavButtonClassName}
              aria-label="Jump to first move"
            >
              <ChevronsLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => jumpMove(-1)}
              className={replayNavButtonClassName}
              aria-label="Previous move"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsReplayPlaying((playing) => !playing)}
              disabled={analysis.moveEvaluations.length === 0}
              className={cn(
                "grid h-10 min-w-0 place-items-center rounded-[0.85rem] transition",
                isReplayPlaying
                  ? "bg-sky-300 text-slate-950 hover:bg-sky-200"
                  : "bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]",
              )}
              aria-label={isReplayPlaying ? "Pause replay" : "Play replay"}
            >
              {isReplayPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => jumpMove(1)}
              className={replayNavButtonClassName}
              aria-label="Next move"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => jumpToMoveBoundary("last")}
              className={replayNavButtonClassName}
              aria-label="Jump to final move"
            >
              <ChevronsRight className="size-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 px-1">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Speed</span>
            <div className="flex rounded-full border border-[#2a2a4e] bg-[#1a1a2e] p-1">
              {replaySpeedOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setReplaySpeedMs(option.value)}
                  className={cn(
                    "h-8 min-w-12 rounded-full px-3 text-xs font-semibold transition",
                    replaySpeedMs === option.value
                      ? "bg-[#00d4aa] text-slate-950 shadow-[0_0_18px_rgba(0,212,170,0.22)]"
                      : "text-[#94a3b8] hover:bg-[#00d4aa20] hover:text-[#00d4aa]",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
