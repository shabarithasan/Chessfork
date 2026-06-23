"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, BrainCircuit, Gauge, Sparkles, Target } from "lucide-react";

import { ChessBoard, type BoardArrow, type BoardHighlight } from "@/components/analysis/chess-board";
import { cn } from "@/lib/utils";
import type { AnalysisDepth, SourceType } from "@/types/platform";

const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const engineLabel = "Stockfish 18 UCI";
const lineCount = 3;

const loadingStages = [
  {
    copy: "Reading headers, players, clocks, result, opening tags, and exact move order.",
    label: "Parsing PGN",
    metric: "headers + moves",
  },
  {
    copy: "Searching legal candidate moves. Board arrows stay hidden until real PVs return.",
    label: "Running Stockfish",
    metric: "top 3 PVs",
  },
  {
    copy: "Measuring win-probability changes and marking Book, Best, Excellent, Mistake, and Blunder.",
    label: "Classifying moves",
    metric: "quality icons",
  },
  {
    copy: "Building replay, graph, move list, critical moments, and coach-ready summary.",
    label: "Building report",
    metric: "report UI",
  },
];

const sourceLabels: Record<SourceType, string> = {
  chesscom: "Chess.com import",
  lichess: "Lichess import",
  pgn: "PGN analysis",
};

const sourceCopy: Record<SourceType, string> = {
  chesscom: "We are reviewing the imported public game. The preview position comes from that game; engine arrows appear only after Stockfish returns real lines.",
  lichess: "We are checking the latest public Lichess game for turning points, principal lines, and coach-ready mistakes.",
  pgn: "We are analyzing your PGN and shaping a move-by-move report from real evaluations.",
};

const targetDepthByMode: Record<AnalysisDepth, { actual: number; best: number }> = {
  deep: { actual: 22, best: 22 },
  quick: { actual: 18, best: 18 },
};

type LoadingPreviewMove = {
  from: string;
  ply: number;
  san: string;
  to: string;
};

type AnalysisLoadingExperienceProps = {
  black: string;
  depth: AnalysisDepth;
  openingLabel: string;
  presentation?: "overlay" | "page";
  previewFen?: string;
  previewMove?: LoadingPreviewMove;
  previewMoveCount?: number;
  source: SourceType;
  timeControl: string;
  white: string;
};

function stageProgress(progress: number, index: number) {
  const stageStart = index * 24;
  return Math.max(0, Math.min(100, (progress - stageStart) * 4));
}

function formatPreviewMove(move?: LoadingPreviewMove) {
  if (!move) {
    return "Initial position";
  }

  const moveNumber = Math.ceil(move.ply / 2);
  const suffix = move.ply % 2 === 0 ? "..." : ".";
  return `${moveNumber}${suffix} ${move.san}`;
}

export function AnalysisLoadingExperience({
  black,
  depth,
  openingLabel,
  presentation = "overlay",
  previewFen,
  previewMove,
  previewMoveCount,
  source,
  timeControl,
  white,
}: AnalysisLoadingExperienceProps) {
  const [progress, setProgress] = useState(depth === "deep" ? 7 : 15);
  const targetDepth = targetDepthByMode[depth];
  const stageIndex = useMemo(() => {
    if (progress < 28) return 0;
    if (progress < 58) return 1;
    if (progress < 82) return 2;
    return 3;
  }, [progress]);
  const displayedDepth = Math.max(1, Math.min(targetDepth.best, Math.round((progress / 96) * targetDepth.best)));
  const activeStage = loadingStages[stageIndex];
  const previewLabel = formatPreviewMove(previewMove);
  const previewArrows: BoardArrow[] = previewMove ? [{ from: previewMove.from, to: previewMove.to, tone: "played" }] : [];
  const previewHighlights: BoardHighlight[] = previewMove
    ? [
        { square: previewMove.from, tone: "from" },
        { square: previewMove.to, tone: "to" },
      ]
    : [];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 96) {
          return current;
        }

        if (current < 32) {
          return current + 4;
        }

        if (current < 72) {
          return current + 2;
        }

        return current + 1;
      });
    }, depth === "deep" ? 360 : 280);

    return () => window.clearInterval(interval);
  }, [depth]);

  return (
    <div
      className={cn(
        "overflow-hidden bg-[rgba(9,9,11,0.88)] backdrop-blur-xl",
        presentation === "overlay" ? "fixed inset-0 z-50 overflow-y-auto" : "relative w-full rounded-[2rem] border border-white/10",
      )}
    >
      <div className="analysis-engine-grid pointer-events-none absolute inset-0 opacity-45" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.2),transparent_58%)]" />
      <div className="pointer-events-none absolute bottom-[-10rem] right-[-8rem] size-[28rem] rounded-full bg-emerald-400/10 blur-3xl" />

      <div
        className={cn(
          "relative mx-auto w-full max-w-[1540px] px-4 py-5 lg:px-8",
          presentation === "overlay" ? "flex min-h-screen items-center" : "py-2 sm:py-3",
        )}
      >
        <div className="grid w-full min-w-0 gap-4 xl:grid-cols-[minmax(0,1.28fr)_25rem]">
          <div className="min-w-0 rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(36,36,39,0.98),rgba(24,24,27,0.98))] p-3 shadow-[0_40px_110px_rgba(0,0,0,0.5)] sm:rounded-[2rem] sm:p-4">
            <div className="relative">
              <div className="analysis-scan-line pointer-events-none absolute inset-x-8 top-14 z-20 h-24 rounded-full bg-[linear-gradient(90deg,transparent,rgba(245,158,11,0.18),transparent)] blur-xl" />
              <div className="analysis-engine-sweep pointer-events-none absolute bottom-[18%] left-[10%] z-20 h-[2px] w-[80%] rounded-full bg-[linear-gradient(90deg,transparent,rgba(250,204,21,0.9),transparent)] shadow-[0_0_26px_rgba(250,204,21,0.34)]" />

              <div className="absolute left-4 top-4 z-30 flex flex-wrap gap-2">
                <span className="rounded-full border border-amber-300/20 bg-black/45 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-amber-100 backdrop-blur">
                  Engine scan
                </span>
                <span className="rounded-full border border-emerald-300/20 bg-black/45 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-emerald-100 backdrop-blur">
                  Real game preview
                </span>
              </div>

              <ChessBoard
                arrows={previewArrows}
                evaluation={36}
                fen={previewFen ?? startFen}
                highlights={previewHighlights}
                showCoordinates
                tone="graphite"
                topPlayer={{
                  clock: timeControl,
                  meta: `${sourceLabels[source]} / ${previewMoveCount ? `${previewMoveCount} plies` : "move scan"}`,
                  name: black,
                }}
                bottomPlayer={{
                  clock: timeControl,
                  meta: `${depth === "deep" ? "Deep" : "Quick"} report / ${previewLabel}`,
                  name: white,
                }}
                variant="analysis"
                className="analysis-board-breathe mx-auto w-full max-w-[45rem]"
              />

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Preview move", value: previewLabel },
                  { label: "Opening", value: openingLabel },
                  { label: "Engine contract", value: "No random arrows" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.15rem] border border-white/10 bg-black/18 px-4 py-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-100">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="min-w-0 rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,23,0.98),rgba(12,12,14,0.98))] p-4 shadow-[0_40px_110px_rgba(0,0,0,0.5)] sm:rounded-[2rem] sm:p-5">
            <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="analysis-pulse-ring grid size-12 place-items-center rounded-2xl bg-amber-300/15 text-amber-300">
                    <Bot className="size-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Analyzing game</p>
                    <p className="mt-1 text-sm text-slate-400">{sourceLabels[source]}</p>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
                  {progress}%
                </span>
              </div>

              <p className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-4xl">{activeStage.label}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{sourceCopy[source]}</p>

              <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/8">
                <div className="analysis-progress-fill h-full rounded-full" style={{ width: `${progress}%` }} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: "Engine", value: engineLabel },
                  { label: "Depth", value: `${displayedDepth}/${targetDepth.best}` },
                  { label: "Lines", value: `${lineCount} PVs` },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1rem] border border-white/10 bg-slate-950/40 px-3 py-3">
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {loadingStages.map((stage, index) => {
                const active = stageIndex === index;
                const completed = stageIndex > index;
                const StageIcon = index === 0 ? Gauge : index === 1 ? Bot : index === 2 ? Target : Sparkles;

                return (
                  <div
                    key={stage.label}
                    className={cn(
                      "rounded-[1.2rem] border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
                      active
                        ? "border-amber-300/25 bg-amber-300/10"
                        : completed
                          ? "border-emerald-300/15 bg-emerald-300/8"
                          : "border-white/10 bg-white/[0.03]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-full border",
                          completed
                            ? "border-emerald-300/25 bg-emerald-300/12 text-emerald-200"
                            : active
                              ? "border-amber-300/25 bg-amber-300/12 text-amber-200"
                              : "border-white/10 bg-white/[0.04] text-slate-500",
                        )}
                      >
                        {completed ? <Sparkles className="size-4" /> : <StageIcon className={active ? "size-4 animate-pulse" : "size-4"} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className={cn("font-semibold", active || completed ? "text-white" : "text-slate-400")}>{stage.label}</p>
                          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{stage.metric}</span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{stage.copy}</p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                          <div className="analysis-progress-fill h-full rounded-full" style={{ width: `${stageProgress(progress, index)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-[1.45rem] border border-emerald-300/10 bg-[linear-gradient(135deg,rgba(47,79,57,0.24),rgba(255,255,255,0.03))] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">PV queue</p>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  waiting for Stockfish
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {["Best line", "Alternative line", "Refutation check"].map((line, index) => (
                  <div key={line} className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[1rem] border border-white/10 bg-black/14 px-3 py-2.5">
                    <span className="grid size-7 place-items-center rounded-full bg-white/[0.06] text-xs font-semibold text-slate-300">{index + 1}</span>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{line}</p>
                        <p className="text-xs text-slate-500">real PV only</p>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div className="analysis-progress-fill h-full rounded-full" style={{ width: `${Math.min(progress + index * 6, 96)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(48,40,32,0.5),rgba(27,23,20,0.9))] p-4">
              <div className="flex items-start gap-3">
                <BrainCircuit className="mt-1 size-5 shrink-0 text-amber-300" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Current brief</p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    {white} vs {black}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {openingLabel} / {timeControl} / {depth === "deep" ? "Deep report" : "Quick report"} / actual move depth {targetDepth.actual}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function AnalysisLoadingOverlay(props: Omit<AnalysisLoadingExperienceProps, "presentation">) {
  return <AnalysisLoadingExperience {...props} presentation="overlay" />;
}
