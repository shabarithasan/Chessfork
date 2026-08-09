"use client";

import Link from "next/link";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, Move, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { squareToBoardPos } from "@/components/chess/MoveArrow";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Loader2,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

import { ChessforkLogo } from "@/components/brand/chessfork-logo";
import { PremiumSidebar } from "@/components/shell/site-shell-client";
import { useStablePathname } from "@/components/shell/use-stable-pathname";
import WhatsNewDialog from "@/components/changelog/WhatsNewDialog";
import { ReportTab } from "@/components/chess/ReportTab";
import { InsightsTab } from "@/components/chess/InsightsTab";
import type { InsightsData } from "@/components/chess/InsightsTab";
import { SettingsTab } from "@/components/chess/SettingsTab";
import { SettingsProvider, useSettings, pieceCdnBaseUrl } from "@/contexts/SettingsContext";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import type { AnalysisRun, EngineLine, MoveEvaluation, MoveGrade } from "@/types/platform";
import ChessEvaluationGraph from "@/components/chess/ChessEvaluationGraph";
import { AlternativeLines } from "@/components/chess/AlternativeLines";
import { MoveDistributionBar } from "@/components/chess/MoveDistributionBar";
import { TrainerPanel } from "@/components/chess/TrainerPanel";
import { PandaMascot } from "@/components/mascot/PandaMascot";
import { useEngine } from "@/hooks/useEngine";
import { useWhatIfSessions } from "@/hooks/useWhatIfSessions";
import type { LLMAnalysis } from "@/types/llm";
import type { WhatIfSnapshot } from "@/lib/whatif-snapshot";
interface WhatIfMove {
  san: string;
  from: string;
  to: string;
  fen: string;
  score?: number;
  grade?: MoveGrade;
}

interface ExplainSection {
  icon: string;
  title: string;
  content: string;
}

const MOTIF_THEMES: Record<string, string> = {
  sacrifice: "Sacrifice",
  missed_mate: "Missed Mate",
  best_move_mate: "Checkmate",
  still_mating: "Mate Threat",
  still_being_mated: "Under Attack",
  escaped_mate: "Escape",
  forced_move: "Forced",
  only_engine_move: "Only Move",
  only_engine_move_losing: "Only Move",
  equivalent: "Equivalent",
  missed_win: "Missed Win",
  best_move: "Best Move",
  small_loss: "Precision",
  minor_loss: "Accuracy",
  moderate_loss: "Accuracy",
  significant_loss: "Error",
  large_loss: "Critical Error",
  shallow_depth_downgrade: "Low Depth",
};

const MOTIF_THEME_COLORS: Record<string, string> = {
  Sacrifice: "from-rose-500/20 to-rose-500/5 text-rose-300 border-rose-500/20",
  "Missed Mate": "from-red-500/20 to-red-500/5 text-red-300 border-red-500/20",
  Checkmate: "from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-500/20",
  "Mate Threat": "from-orange-500/20 to-orange-500/5 text-orange-300 border-orange-500/20",
  "Under Attack": "from-yellow-500/20 to-yellow-500/5 text-yellow-300 border-yellow-500/20",
  Escape: "from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/20",
  Forced: "from-sky-500/20 to-sky-500/5 text-sky-300 border-sky-500/20",
  "Only Move": "from-indigo-500/20 to-indigo-500/5 text-indigo-300 border-indigo-500/20",
  Equivalent: "from-zinc-500/20 to-zinc-500/5 text-zinc-300 border-zinc-500/20",
  "Missed Win": "from-violet-500/20 to-violet-500/5 text-violet-300 border-violet-500/20",
  "Best Move": "from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/20",
  Precision: "from-teal-500/20 to-teal-500/5 text-teal-300 border-teal-500/20",
  Accuracy: "from-cyan-500/20 to-cyan-500/5 text-cyan-300 border-cyan-500/20",
  Error: "from-red-500/20 to-red-500/5 text-red-300 border-red-500/20",
  "Critical Error": "from-rose-600/20 to-rose-600/5 text-rose-300 border-rose-600/20",
  "Low Depth": "from-stone-500/20 to-stone-500/5 text-stone-300 border-stone-500/20",
};

function computeDifficulty(grade: string, evalLoss: number, depth: number): { label: string; level: number; color: string } {
  if (grade === "Blunder" && evalLoss > 200 && depth >= 16) return { label: "Easy to spot", level: 1, color: "text-emerald-400" };
  if (grade === "Brilliant") return { label: "Hard to find", level: 3, color: "text-rose-400" };
  if (evalLoss > 150 && depth >= 18) return { label: "Medium", level: 2, color: "text-amber-400" };
  if (evalLoss < 50 || depth < 12) return { label: "Hard to spot", level: 3, color: "text-rose-400" };
  if (grade === "Mistake" || grade === "Inaccuracy") return { label: "Medium", level: 2, color: "text-amber-400" };
  return { label: "Easy to spot", level: 1, color: "text-emerald-400" };
}

function getThemeKeys(reasons: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const r of reasons) {
    const theme = MOTIF_THEMES[r];
    if (theme && !seen.has(theme)) {
      seen.add(theme);
      result.push(theme);
    }
  }
  return result.slice(0, 4);
}

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const BADGE_IMG: Record<string, string> = {
  good: "https://cdn.chessigma.dev/moves/good.png",
  best: "https://cdn.chessigma.dev/moves/best.png",
  very_good: "https://cdn.chessigma.dev/moves/very_good.png",
  inaccuracy: "https://cdn.chessigma.dev/moves/inaccuracy.png",
  mistake: "https://cdn.chessigma.dev/moves/mistake.png",
  blunder: "https://cdn.chessigma.dev/moves/blunder.png",
};

const GRADE_TO_BADGE: Record<string, string> = {
  Brilliant: "very_good",
  Excellent: "very_good",
  Great: "good",
  Best: "best",
  Good: "good",
  Inaccuracy: "inaccuracy",
  Mistake: "mistake",
  Blunder: "blunder",
};

const GRADE_VERB: Record<string, string> = {
  Brilliant: "is brilliant",
  Excellent: "is excellent",
  Great: "is great",
  Best: "is best",
  Good: "is ok",
  Inaccuracy: "is questionable",
  Mistake: "is a mistake",
  Blunder: "is a blunder",
};

function BadgeIcon({ badge, size = 16 }: { badge: string; size?: number }) {
  const src = BADGE_IMG[badge];
  if (!src) return null;
  return <img src={src} alt="" width={size} height={size} className="shrink-0" />;
}

function BestMoveButton({ san, onClick }: { san: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={onClick ? "Play the best move" : undefined}
      className="inline-flex cursor-pointer items-center gap-0.5 rounded-[4px] bg-[#f3c53d] px-1 font-mono font-semibold text-[#171717] transition-[background-color,transform] duration-150 active:scale-[0.96] text-[13px] leading-[1.3]"
    >
      <BadgeIcon badge="best" size={13} />
      {san}
    </button>
  );
}

function SpoilerBestMoveButton({ san, onClick, isRevealed, onReveal }: { san: string; onClick?: () => void; isRevealed: boolean; onReveal: () => void }) {
  if (!isRevealed) {
    return (
      <button
        type="button"
        onClick={onReveal}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-neutral-600 bg-neutral-800 hover:bg-neutral-700 px-1.5 font-semibold text-neutral-300 transition-colors duration-150 text-[12px] leading-[1.4]"
      >
        <Search className="size-3 text-neutral-400" />
        See best move
      </button>
    );
  }
  return <BestMoveButton san={san} onClick={onClick} />;
}

function formatScore(score: number | null) {
  if (score === null) return "";
  if (Math.abs(score) >= 100_000) return score > 0 ? "+M" : "-M";
  const pawns = score / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(Math.abs(pawns) >= 10 ? 1 : 1)}`;
}

function evalToPct(cp: number): number {
  const clamped = Math.max(-2_000, Math.min(2_000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

function resultLabel(result: string) {
  if (result === "1-0") return "White won";
  if (result === "0-1") return "Black won";
  if (result === "1/2-1/2") return "Draw";
  return result;
}

function playerRating(accuracy: number) {
  return Math.round(900 + accuracy * 12);
}

function initials(name: string) {
  return name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ChipLink({
  href,
  className,
  avatarUrl,
  name,
  rating,
  showTrophy,
}: {
  href?: string;
  className: string;
  avatarUrl?: string;
  name: string;
  rating: number;
  showTrophy?: boolean;
}) {
  const content = (
    <>
      <span
        className="flex flex-none items-center justify-center overflow-hidden rounded-[5px] font-semibold bg-[#d6d6d6] text-[#525252]"
        style={{ width: 20, height: 20, fontSize: 10 }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span>{initials(name)}</span>
        )}
      </span>
      <span className="min-w-0 truncate font-semibold group-hover/chip:underline">{name}</span>
      {showTrophy && (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-label="Winner" className="h-3 w-3 flex-none text-amber-400">
          <path d="M3 8l4.5 3L12 5l4.5 6L21 8l-1.8 10H4.8L3 8z" />
        </svg>
      )}
      <span className="font-mono text-[11px] tabular-nums opacity-[.62]">{rating}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={`flex h-7 min-w-0 items-center gap-1.5 rounded-[7px] pl-1 pr-[11px] text-[12.5px] transition-colors duration-150 group/chip ${className}`}
      >
        {content}
      </a>
    );
  }

  return (
    <span className={`flex h-7 min-w-0 items-center gap-1.5 rounded-[7px] pl-1 pr-[11px] text-[12.5px] ${className}`}>
      {content}
    </span>
  );
}

function renderExplainMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let inList: "ul" | null = null;
  const listItems: React.ReactNode[] = [];
  let olIndex = 0;
  let inOl: boolean = false;

  function flushList() {
    if (inList && listItems.length > 0) {
      nodes.push(
        <ul key={`ul-${nodes.length}`} className="space-y-1 mb-2.5">
          {listItems}
        </ul>
      );
      listItems.length = 0;
    }
    inList = null;
    inOl = false;
    olIndex = 0;
  }

  function inlineMarkdown(part: string, idx: number): React.ReactNode {
    const segments: React.ReactNode[] = [];
    let remaining = part;
    let segIdx = 0;
    const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        segments.push(remaining.slice(lastIndex, match.index));
      }
      if (match[2]) {
        segments.push(
          <strong key={`b-${idx}-${segIdx++}`} className="font-semibold text-[#f3c53d]">{match[2]}</strong>
        );
      } else if (match[3]) {
        segments.push(
          <code key={`c-${idx}-${segIdx++}`} className="rounded bg-[#f3c53d]/10 px-1.5 py-0.5 font-mono text-[11px] text-[#f3c53d]/90 border border-[#f3c53d]/20">{match[3]}</code>
        );
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < remaining.length) {
      segments.push(remaining.slice(lastIndex));
    }
    return segments.length > 0 ? <>{segments}</> : part;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      flushList();
      nodes.push(
        <div key={`hwrap-${i}`} className="flex items-center gap-2 mb-2.5 mt-2 first:mt-0">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#f3c53d]/30 to-transparent" />
          <h2 className="text-[12px] font-bold tracking-wide text-[#f3c53d] uppercase">{line.slice(3)}</h2>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#f3c53d]/30 to-transparent" />
        </div>
      );
    } else if (line.startsWith("### ")) {
      flushList();
      nodes.push(
        <h3 key={`h3-${i}`} className="text-[12px] font-semibold text-[#f3c53d]/90 mb-1.5 mt-2">{line.slice(4)}</h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      flushList();
      inList = "ul";
      listItems.push(
        <li key={`li-${i}`} className="flex items-start gap-2 text-[12.5px] leading-[1.65] text-[#d4d4d4]">
          <span className="mt-[5px] shrink-0 h-1.5 w-1.5 rounded-full bg-[#f3c53d]/60" />
          <span>{inlineMarkdown(line.slice(2), i)}</span>
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      flushList();
      inOl = true;
      const num = line.match(/^\d+/)?.[0] ?? "1";
      nodes.push(
        <div key={`ol-${i}`} className="flex items-start gap-2.5 mb-1.5 text-[12.5px] leading-[1.65]">
          <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#f3c53d]/15 text-[10px] font-bold text-[#f3c53d]">{num}</span>
          <span className="text-[#d4d4d4]">{inlineMarkdown(line.replace(/^\d+\.\s*/, ""), i)}</span>
        </div>
      );
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      nodes.push(
        <p key={`p-${i}`} className="text-[12.5px] leading-[1.7] text-[#d4d4d4] mb-2.5 last:mb-0">{inlineMarkdown(line, i)}</p>
      );
    }
  }
  flushList();
  return nodes;
}

function RightPanel({
  moves,
  selectedMove,
  isAnalyzing: isAnalyzingProp = false,
  depth: depthProp,
  activeTab,
  onTabChange,
  analysis,
  startEngineLines,
  isStartPosition,
  setSelectedPly,
  altFen,
  onSelectAltLine,
  onShowLine,
  showBestMoveArrow,
  onToggleBestMoveArrow,
  onToggleLiveEngine,
  clearAltLine,
  avatarUrls,
  whatIfMoves,
  whatIfSelectedIdx,
  whatIfGraphValues,
  onSelectWhatIfMove,
  llmAnalysis,
  llmLoading = false,
  currentSession,
  onPlayBestMove,
  isTrainerMode,
  trainerMistakes,
  trainerIndex,
  trainerStatus,
  trainerAttempt,
  onTrainerAttempt,
  onTrainerNext,
  onTrainerRetry,
  onTrainerExit,
  onStartTrainer,
}: {
  moves: MoveEvaluation[];
  selectedMove: MoveEvaluation;
  isAnalyzing?: boolean;
  depth?: number;
  activeTab: string;
  onTabChange: (tab: string) => void;
  analysis: AnalysisRun;
  startEngineLines?: EngineLine[];
  isStartPosition?: boolean;
  setSelectedPly?: (ply: number) => void;
  altFen?: string | null;
  onSelectAltLine?: (fen: string, san: string) => void;
  onShowLine?: (fen: string, san: string) => void;
  showBestMoveArrow?: boolean;
  onToggleBestMoveArrow?: () => void;
  onToggleLiveEngine?: () => void;
  clearAltLine?: () => void;
  avatarUrls?: { white?: string; black?: string };
  whatIfMoves?: WhatIfMove[];
  whatIfSelectedIdx?: number;
  whatIfGraphValues?: number[] | null;
  onSelectWhatIfMove?: (idx: number) => void;
  llmAnalysis?: LLMAnalysis | null;
  llmLoading?: boolean;
  currentSession?: WhatIfSnapshot | null;
  onPlayBestMove?: (san: string) => void;

  // Trainer Props
  isTrainerMode?: boolean;
  trainerMistakes?: MoveEvaluation[];
  trainerIndex?: number;
  trainerStatus?: "playing" | "success" | "failed" | "finished";
  trainerAttempt?: string | null;
  onTrainerAttempt?: (userSan: string, bestSan: string) => void;
  onTrainerNext?: () => void;
  onTrainerRetry?: () => void;
  onTrainerExit?: () => void;
  onStartTrainer?: () => void;
}) {
  const [explainSections, setExplainSections] = useState<ExplainSection[] | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const explainCacheRef = useRef<Map<string, ExplainSection[]>>(new Map());
  const explainMoveRef = useRef<string>("");
  const { liveEngine } = useSettings();
  const [revealedBestMove, setRevealedBestMove] = useState(false);

  useEffect(() => {
    setRevealedBestMove(false);
  }, [selectedMove?.ply, altFen, whatIfSelectedIdx]);

  const isLiveActive = !!altFen;

  // Derive current what-if move for display
  const currentWhatIfMove = isLiveActive && whatIfMoves && whatIfSelectedIdx !== undefined && whatIfSelectedIdx >= 0
    ? whatIfMoves[whatIfSelectedIdx] ?? null
    : null;
  // Migrating to currentSession as source of truth — prefer snapshot, fall back to legacy props
  const snapEval = currentSession?.evaluation ?? null;
  const snapGrade = currentSession?.grade ?? null;
  const snapDepth = currentSession?.depth;
  const snapFen = currentSession?.fen;

  const currentWhatIfEval = snapGrade
    ? { score: 0, grade: snapGrade }
    : null;

  // Override display values when in what-if mode
  const liveEvalScore = isLiveActive
    ? (snapEval?.type === "cp" ? (snapEval as { type: "cp"; value: number }).value * 100 : (snapEval?.type === "mate" ? ((snapEval as { type: "mate"; value: number }).value > 0 ? 100000 : -100000) : null))
    : (liveEngine && engineAnalysis?.evaluation ? (engineAnalysis.evaluation.type === "cp" ? engineAnalysis.evaluation.value * 100 : (engineAnalysis.evaluation.value > 0 ? 100000 : -100000)) : null);

  const displayScore = liveEvalScore !== null ? liveEvalScore : selectedMove.score;
  const isWhatIfSearching = isLiveActive && !currentSession;
  const isLiveEngineActive = isWhatIfSearching || (liveEngine && !isLiveActive && engineAnalysis?.status === "analyzing");
  const liveEngineDepth = isLiveActive ? (snapDepth ?? 0) : (liveEngine && !isLiveActive ? engineAnalysis?.depth ?? 0 : null);
  const whatIfLeafFenResolved = snapFen ?? "";

  // Derive engine lines from snapshot topMoves or live engineAnalysis
  const liveLinesResolved = useMemo((): EngineLine[] => {
    if (isLiveActive) {
      if (!currentSession?.topMoves) return [];
      return currentSession.topMoves.map((m, i) => ({
        rank: i + 1,
        san: m.san,
        score: m.eval,
        depth: currentSession.depth,
        mate: m.mate ?? undefined,
        line: m.line,
        nodes: 0,
      }));
    } else if (liveEngine && engineAnalysis?.lines) {
      return engineAnalysis.lines.map((l, i) => ({
        rank: i + 1,
        san: l.pv[0] ?? "",
        score: l.evaluation.type === "cp" ? Math.round(l.evaluation.value * 100) : (l.evaluation.value > 0 ? 10000 : -10000),
        depth: engineAnalysis.depth,
        mate: l.evaluation.type === "mate" ? l.evaluation.value : undefined,
        line: l.pv,
        nodes: 0,
      }));
    }
    return [];
  }, [currentSession, isLiveActive, liveEngine, engineAnalysis]);

  const scoreValues = useMemo(() => {
    if (isLiveActive) {
      return whatIfGraphValues ?? [];
    }
    return moves.map((m) => Math.max(0, Math.min(100, m.score / 2 + 50)));
  }, [isLiveActive, whatIfGraphValues, moves]);
  const moveAnnotations = useMemo(() => {
    const ann: Record<number, string> = {};
    moves.forEach((m, i) => {
      if (!m.grade) return;
      const key = m.grade.toLowerCase();
      if (["brilliant", "excellent", "blunder", "mistake"].includes(key)) {
        ann[i] = key;
      }
    });
    return ann;
  }, [moves]);
  const currentMoveIndex = isLiveActive
    ? (whatIfSelectedIdx ?? (whatIfMoves ? whatIfMoves.length - 1 : 0))
    : moves.findIndex((m) => m.ply === selectedMove.ply);
  const gameHistory = useMemo(() => {
    return moves.map((m) => ({
      moveNumber: m.moveNumber,
      score: m.score,
      status: m.grade?.toLowerCase() ?? "neutral",
    }));
  }, [moves]);
  const bestSan = isLiveActive && liveLinesResolved && liveLinesResolved.length > 0
    ? liveLinesResolved[0].san || "the engine move"
    : isLiveActive ? ""
    : (selectedMove.engineLines?.[0]?.san || selectedMove.bestMove || "the engine move");

  const explainKey = isLiveActive
    ? `whatif-${currentSession?.moveId ?? altFen}-${whatIfSelectedIdx}`
    : `game-${selectedMove.ply}`;

  const handleExplain = useCallback(async () => {
    if (explainLoading) return;
    const key = explainKey;
    if (explainCacheRef.current.has(key)) {
      setExplainSections(explainCacheRef.current.get(key)!);
      return;
    }
    if (currentSession?.coach) {
      const coachSection = [{ icon: "💬", title: "Coach analysis", content: currentSession.coach }];
      explainCacheRef.current.set(key, coachSection);
      setExplainSections(coachSection);
      return;
    }
    const move = isLiveActive ? currentWhatIfMove?.san : selectedMove.san;
    if (!move) return;
    const grade = isLiveActive
      ? (currentWhatIfMove?.grade ?? currentWhatIfEval?.grade ?? "")
      : selectedMove.grade;
    if (!grade) return;

    const snapEvalCp = currentSession?.evaluation?.type === "cp"
      ? (currentSession.evaluation as { type: "cp"; value: number }).value * 100
      : null;
    const playedEval = snapEvalCp ?? selectedMove.score;
    const bestLine = currentSession?.topMoves?.[0] ??
      (selectedMove.engineLines?.[0]
        ? { san: selectedMove.engineLines[0].san, eval: selectedMove.engineLines[0].score }
        : null);
    const bestEval = bestLine?.eval ?? selectedMove.score;
    const evalLoss = Math.abs(bestEval - playedEval);
    const reasons: string[] = [];

    setExplainLoading(true);
    explainMoveRef.current = key;
    setExplainSections(null);
    try {
      const res = await fetch("/api/explain-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fenBefore: isLiveActive ? (currentSession?.topMoves?.[0] ? "" : "") : selectedMove.fenBefore,
          fenAfter: currentSession?.fen ?? altFen ?? selectedMove.fenAfter ?? "",
          playedMove: move,
          bestMove: bestSan,
          grade,
          playedEval,
          bestEval,
          evalLoss,
          depth: currentSession?.depth ?? selectedMove.depth ?? 0,
          topMoves: (currentSession?.topMoves ?? selectedMove.engineLines ?? []).slice(0, 3).map((m: { san: string; eval?: number; score?: number }) => ({ san: m.san, eval: m.eval ?? m.score ?? 0 })),
          sideToMove: currentSession?.fen ? (() => { const parts = currentSession.fen.split(" "); return parts[1] === "w" ? "white" : "black"; })() : (selectedMove.side ?? "white") as "white" | "black",
          moveNumber: selectedMove.moveNumber ?? 1,
          reasons,
        }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.sections) {
        explainCacheRef.current.set(key, data.sections);
        setExplainSections(data.sections);
      } else {
        throw new Error("No sections returned");
      }
    } catch (e) {
      console.error("[Explain] Failed:", e);
      setExplainSections([{ icon: "⚠️", title: "Could not generate", content: "Failed to generate explanation. Please try again." }]);
    } finally {
      setExplainLoading(false);
    }
  }, [explainKey, isLiveActive, currentWhatIfMove, currentSession, currentWhatIfEval, selectedMove, altFen, bestSan, explainLoading]);

  // Reset explain when key changes
  useEffect(() => {
    setExplainSections(explainCacheRef.current.get(explainKey) ?? null);
  }, [explainKey]);

  const pillarDepth = depthProp ?? selectedMove.depth;

  const mood: string =
    selectedMove.grade === "Brilliant" ? "brilliant" :
    selectedMove.grade === "Blunder" ? "blunder" :
    selectedMove.grade === "Mistake" ? "mistake" :
    selectedMove.grade === "Inaccuracy" ? "inaccuracy" :
    (selectedMove.grade === "Best" || selectedMove.grade === "Excellent" || selectedMove.grade === "Great") ? "best" :
    (displayScore ?? 0) > 200 ? "strong" :
    (displayScore ?? 0) < -200 ? "losing" : "neutral";

  const reportStats = useMemo((): import("@/components/chess/ReportTab").ReportTabStats => {
    const stats = {
      Brilliant: { left: 0, right: 0 },
      Excellent: { left: 0, right: 0 },
      Great: { left: 0, right: 0 },
      Best: { left: 0, right: 0 },
      Good: { left: 0, right: 0 },
      Inaccuracy: { left: 0, right: 0 },
      Mistake: { left: 0, right: 0 },
      Blunder: { left: 0, right: 0 },
    };
    for (const m of moves) {
      const side = m.side === "white" ? "left" : "right" as const;
      if (m.grade === "Brilliant") stats.Brilliant[side]++;
      else if (m.grade === "Excellent") stats.Excellent[side]++;
      else if (m.grade === "Great") stats.Great[side]++;
      else if (m.grade === "Best") stats.Best[side]++;
      else if (m.grade === "Good") stats.Good[side]++;
      else if (m.grade === "Inaccuracy") stats.Inaccuracy[side]++;
      else if (m.grade === "Mistake") stats.Mistake[side]++;
      else if (m.grade === "Blunder") stats.Blunder[side]++;
    }
    return stats;
  }, [moves]);

  const phaseStats = useMemo(() => {
    const count = { opening: { left: { good: 0, bad: 0 }, right: { good: 0, bad: 0 } }, middlegame: { left: { good: 0, bad: 0 }, right: { good: 0, bad: 0 } }, endgame: { left: { good: 0, bad: 0 }, right: { good: 0, bad: 0 } } };
    for (const m of moves) {
      const side = m.side === "white" ? "left" : "right" as const;
      const phase = m.phase;
      if (m.grade === "Brilliant" || m.grade === "Great" || m.grade === "Best" || m.grade === "Excellent") count[phase][side].good++;
      else if (m.grade === "Blunder" || m.grade === "Mistake" || m.grade === "Inaccuracy") count[phase][side].bad++;
    }
    return {
      opening: { left: count.opening.left.good >= count.opening.left.bad ? "good" as const : "bad" as const, right: count.opening.right.good >= count.opening.right.bad ? "good" as const : "bad" as const },
      middlegame: { left: count.middlegame.left.good >= count.middlegame.left.bad ? "good" as const : "bad" as const, right: count.middlegame.right.good >= count.middlegame.right.bad ? "good" as const : "bad" as const },
      endgame: { left: count.endgame.left.good >= count.endgame.left.bad ? "good" as const : "bad" as const, right: count.endgame.right.good >= count.endgame.right.bad ? "good" as const : "bad" as const },
    };
  }, [moves]);

  const mistakesCount = useMemo(() => moves.filter((m) => m.grade === "Blunder" || m.grade === "Mistake").length, [moves]);

  const coachReview = useMemo(() => {
    const reviewFor = (side: "left" | "right") => {
      const good =
        reportStats.Brilliant[side] + reportStats.Excellent[side] + reportStats.Great[side] + reportStats.Best[side] + reportStats.Good[side];
      const bad = reportStats.Inaccuracy[side] + reportStats.Mistake[side] + reportStats.Blunder[side];
      if (good + bad === 0) return "good" as const;
      return good >= bad ? ("good" as const) : ("bad" as const);
    };
    return { left: reviewFor("left"), right: reviewFor("right") };
  }, [reportStats]);

  const insightsData: InsightsData = useMemo(() => {
    const blunders = moves.filter((m) => m.grade === "Blunder");
    const totalMoves = moves.length;
    const blunderPct = totalMoves > 0 ? Math.round((blunders.length / totalMoves) * 100) : 0;
    const phaseAcc: Record<string, { sum: number; count: number }> = { opening: { sum: 0, count: 0 }, middlegame: { sum: 0, count: 0 }, endgame: { sum: 0, count: 0 } };
    for (const m of moves) {
      const acc = Math.max(0, 100 - (m.cpLoss || 0) * 0.15);
      if (phaseAcc[m.phase]) { phaseAcc[m.phase].sum += acc; phaseAcc[m.phase].count++; }
    }
    const avg = (p: string) => phaseAcc[p].count > 0 ? Math.round(phaseAcc[p].sum / phaseAcc[p].count) : 50;
    const pctRank = (acc: number) => acc >= 90 ? 80 : acc >= 75 ? 50 : acc >= 60 ? 34 : 20;
    const colorRank = (pct: number) => pct <= 20 ? "#e74c3c" : pct <= 34 ? "#fbc531" : "#b4b4b4";

    const sections = [
      { label: "Accuracy", icon: "\uD83C\uDFAF", value: `bottom ${100 - pctRank(Math.round(100 - moves.reduce((s, m) => s + (m.cpLoss || 0), 0) / Math.max(1, totalMoves) * 0.15))}%`, textColor: "#e74c3c", progressFill: "#e74c3c", progressPercent: pctRank(Math.round(100 - moves.reduce((s, m) => s + (m.cpLoss || 0), 0) / Math.max(1, totalMoves) * 0.15)) },
      { label: "Opening", icon: "\uD83D\uDCD6", value: `bottom ${100 - pctRank(avg("opening"))}%`, textColor: colorRank(pctRank(avg("opening"))), progressFill: colorRank(pctRank(avg("opening"))), progressPercent: pctRank(avg("opening")) },
      { label: "Middlegame", icon: "\u2694\uFE0F", value: `bottom ${100 - pctRank(avg("middlegame"))}%`, textColor: colorRank(pctRank(avg("middlegame"))), progressFill: colorRank(pctRank(avg("middlegame"))), progressPercent: pctRank(avg("middlegame")) },
      { label: "Endgame", icon: "\u265B", value: `bottom ${100 - pctRank(avg("endgame"))}%`, textColor: colorRank(pctRank(avg("endgame"))), progressFill: colorRank(pctRank(avg("endgame"))), progressPercent: pctRank(avg("endgame")) },
      { label: "Blunders", icon: "\u26A0\uFE0F", value: `bottom ${Math.max(1, Math.min(100, blunderPct))}%`, textColor: "#e74c3c", progressFill: "#e74c3c", progressPercent: Math.max(5, 100 - blunderPct * 3) },
    ];

    const accuracyData = moves.map((m, i) => ({
      move: i + 1,
      p1: Math.round(Math.max(0, 100 - (m.cpLoss || 0) * 0.15)),
      p2: Math.round(Math.max(0, 100 - Math.random() * 20)),
      blunder: m.grade === "Blunder",
    }));

    const timeData = moves.map((m, i) => ({
      move: i + 1,
      p1_seconds: Math.round(10 + Math.random() * 90),
      p2_seconds: Math.round(5 + Math.random() * 60),
    }));

    return { sections, accuracyData, timeData };
  }, [moves]);



  return (
    <aside className="h-screen flex flex-col bg-[#2c2b29] p-3 lg:w-[420px] overflow-hidden">
        <div className="flex flex-col min-h-0 rounded-xl bg-[#242321] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] h-full">
          {isTrainerMode && trainerMistakes && trainerIndex !== undefined ? (
            <TrainerPanel
              totalMistakes={trainerMistakes.length}
              currentIndex={trainerIndex}
              mistakeSan={trainerMistakes[trainerIndex]?.san ?? ""}
              targetBestMove={trainerMistakes[trainerIndex]?.bestMove ?? ""}
              status={trainerStatus ?? "playing"}
              userAttemptSan={trainerAttempt ?? null}
              onNext={onTrainerNext!}
              onRetry={onTrainerRetry!}
              onExit={onTrainerExit!}
            />
          ) : (
            <>
              <div className="grid grid-cols-4 gap-1 text-sm font-semibold text-stone-400">
                {[
                  { icon: FileText, label: "Report" },
                  { icon: Search, label: "Analysis" },
                  { icon: BarChart3, label: "Insights" },
                  { icon: Settings, label: "" },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.label || (!tab.label && activeTab === "Settings");
                  return (
                    <button key={tab.label || "settings"} type="button" onClick={() => onTabChange(tab.label || "Settings")} className={cn("flex h-11 items-center justify-center gap-2 rounded-lg", isActive ? "bg-[#48433b] text-[#ffc12c]" : "hover:bg-white/[0.04]")}>
                      <Icon className="size-4" />
                      {tab.label ? <span>{tab.label}</span> : null}
                    </button>
                  );
                })}
              </div>

        <div className="mt-3 flex-1 overflow-y-auto min-h-0 overflow-x-hidden">
          {activeTab === "Report" ? (
          <div className="mt-3">
            <ReportTab
              player1={{ name: analysis.white, avatarUrl: avatarUrls?.white, accuracy: analysis.accuracyWhite }}
              player2={{ name: analysis.black, avatarUrl: avatarUrls?.black, accuracy: analysis.accuracyBlack }}
              statistics={reportStats}
              gameRating={{ left: Math.round((analysis.accuracyWhite ?? 0) * 10), right: Math.round((analysis.accuracyBlack ?? 0) * 10) }}
              coachReview={coachReview}
              phaseAnalysis={phaseStats}
              mistakesCount={mistakesCount}
              graphData={{ currentScore: formatScore(displayScore) }}
              gameHistory={gameHistory}
              currentMoveIndex={currentMoveIndex}
              onPointClick={(index) => {
                const target = moves[index];
                if (target && setSelectedPly) setSelectedPly(target.ply);
              }}
              onClassificationClick={(key, side) => {
                const sideFilter = side === "left" ? "white" : "black";
                const target = moves.find((m) => m.side === sideFilter && m.grade === key);
                if (target && setSelectedPly) setSelectedPly(target.ply);
              }}
              onStartReview={() => onTabChange("Analysis")}
              onLearnFromMistakes={() => {
                if (onStartTrainer) onStartTrainer();
              }}
            />
          </div>
        ) : activeTab === "Insights" ? (
          <div className="mt-3">
            <InsightsTab
              insightsData={insightsData}
              player1Name={analysis.white}
              player2Name={analysis.black}
              vsLabel={`${Math.round((analysis.accuracyWhite ?? 0) * 10)}–${Math.round((analysis.accuracyBlack ?? 0) * 10)}`}
              onSelectMove={(move) => {
                const target = moves[move - 1];
                if (target && setSelectedPly) setSelectedPly(target.ply);
              }}
            />
          </div>
          ) : activeTab === "Settings" ? (
            <div className="mt-3">
              <SettingsTab />
            </div>
          ) : (
          <div className="flex flex-col gap-3">
            {/* ── 0. Move Summary Bar ── */}
            <div className="shrink-0 px-1 pt-1">
              <MoveDistributionBar
                stats={reportStats}
                side={analysis.subjectColor === "white" ? "left" : "right"}
              />
            </div>

            {/* ── 1. Move Detail Card ── */}
            <div className="min-h-[100px] shrink-0">
              <div className="relative min-h-[118px]">
                <div className="min-w-0">
                  <div className="relative min-w-0 rounded-xl bg-[#f5f5f4] text-neutral-800 px-3.5 py-2.5">
                    <span className="absolute -left-[5px] rotate-45 rounded-[2px] bg-[#f5f5f4] top-[19px] h-3 w-3" />
                    <span aria-hidden="true" className="float-left mr-2">
                      <div className="relative h-[42px] w-[44px]">
                        <PandaMascot size={44} />
                      </div>
                    </span>
                    <div className="flex items-center gap-2">
                      <BadgeIcon badge={GRADE_TO_BADGE[isLiveActive && currentWhatIfMove ? (currentWhatIfMove.grade ?? currentWhatIfEval?.grade ?? "") : selectedMove.grade]} size={18} />
                      <span className="font-mono font-semibold text-neutral-900 text-[15px]">{currentWhatIfMove?.san ?? selectedMove.san}</span>
                      <span className="truncate text-[13px]">{isLiveActive && currentWhatIfMove ? GRADE_VERB[currentWhatIfMove.grade ?? currentWhatIfEval?.grade ?? ""] : GRADE_VERB[selectedMove.grade]}</span>
                      {displayScore !== null && (
                        <span className="ml-auto shrink-0 rounded-md font-mono font-semibold tabular-nums border border-neutral-300 bg-white text-neutral-900 px-1.5 py-0.5 text-[11px]">{formatScore(displayScore)}</span>
                      )}
                    </div>
                    <p className="mt-1 min-h-[40px] text-[13px] leading-[1.45] text-neutral-700">
                          {(() => {
                            const grade = isLiveActive && currentWhatIfMove ? (currentWhatIfMove.grade ?? currentWhatIfEval?.grade) : selectedMove.grade;
                            if (isLiveActive && currentWhatIfMove && !grade) return <span>Analyzing...</span>;
                            
                            const isMistake = grade === "Blunder" || grade === "Mistake" || grade === "Inaccuracy";
                            const btn = <SpoilerBestMoveButton san={bestSan} onClick={() => onPlayBestMove?.(bestSan)} isRevealed={!isMistake || revealedBestMove} onReveal={() => setRevealedBestMove(true)} />;
                            
                            if (grade === "Brilliant") return <span>A brilliant find — the only way to keep the advantage. Continue with {btn}.</span>;
                            if (grade === "Blunder") return <span>A critical error. {btn}{(!isMistake || revealedBestMove) && " would have kept the game alive."}</span>;
                            if (grade === "Mistake") return <span>Better was {btn}{(!isMistake || revealedBestMove) && "."}</span>;
                            if (grade === "Inaccuracy") return <span>{btn}{(!isMistake || revealedBestMove) && " was more accurate."}</span>;
                            if (grade === "Best") return <span>{(!isLiveActive && selectedMove.cpLoss === 0) ? "The only move that keeps things balanced." : "The engine's top choice."} Continue with {btn}.</span>;
                            if (grade === "Excellent") return <span>A strong move — nearly as good as the best. Continue with {btn}.</span>;
                            if (grade === "Great") return <span>A very good move. Continue with {btn}.</span>;
                            return <span>A safe, steady move. {btn}{(!isMistake || revealedBestMove) && " was more accurate."}</span>;
                          })()}
                    </p>
                    {!isWhatIfSearching && isLiveActive && llmLoading && (
                      <p className="mt-1 text-[11px] leading-[1.4] text-neutral-500">
                        Consulting DeepSeek...
                      </p>
                    )}
                    {!isWhatIfSearching && isLiveActive && !llmLoading && llmAnalysis && (
                      <div className="mt-1.5 space-y-1 rounded-lg border border-[#f3c53d]/30 bg-[#f3c53d]/5 px-2.5 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-[#f3c53d]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#f3c53d]">AI</span>
                          <span className="text-[12px] font-semibold text-neutral-200">{llmAnalysis.verdict}</span>
                        </div>
                        <p className="text-[12px] leading-[1.5] text-neutral-300">{llmAnalysis.explanation}</p>
                        {llmAnalysis.bestContinuation && (
                          <p className="text-[11px] text-neutral-400">
                            Suggested continuation: <span className="font-mono text-neutral-300">{llmAnalysis.bestContinuation}</span>
                          </p>
                        )}
                      </div>
                    )}
                    {!isWhatIfSearching && (
                      <div className="mt-1.5">
                        <button type="button" onClick={handleExplain} disabled={explainLoading} className="group/explain relative w-full overflow-hidden rounded-lg bg-neutral-950 p-[1.5px] transition-transform active:scale-[0.98] disabled:active:scale-100 disabled:opacity-60">
                          <span aria-hidden="true" className="coach-explain-wave-rotor coach-explain-wave-rotor--dark-button" />
                          <span className="relative z-10 flex items-center justify-center gap-1.5 rounded-[6.5px] bg-[#262626] font-medium text-white transition-colors duration-150 group-hover/explain:bg-[#171717] px-2.5 py-1.5 text-[11.5px]">
                            {explainLoading ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Explaining...
                              </>
                            ) : explainSections ? (
                              "Explain again"
                            ) : (
                              <>
                                Explain
                                <canvas width={15} height={15} className="will-change-transform" />
                              </>
                            )}
                          </span>
                        </button>
                      </div>
                    )}
                    {explainSections && (() => {
                      const seCp = currentSession?.evaluation?.type === "cp" ? (currentSession.evaluation as { type: "cp"; value: number }).value * 100 : null;
                      const pe = seCp ?? selectedMove.score;
                      const bl = currentSession?.topMoves?.[0] ?? (selectedMove.engineLines?.[0] ? { san: selectedMove.engineLines[0].san, eval: selectedMove.engineLines[0].score } : null);
                      const be = bl?.eval ?? selectedMove.score;
                      const el = Math.abs(be - pe);
                      const gr = isLiveActive ? (currentWhatIfMove?.grade ?? currentWhatIfEval?.grade ?? "") : selectedMove.grade;
                      if (!gr) return null;
                      const themeKeys = getThemeKeys([]);
                      const difficulty = computeDifficulty(gr, el, currentSession?.depth ?? selectedMove.depth ?? 0);
                      return (
                        <div className="mt-3 animate-fadeIn space-y-2.5">
                          {/* ── Engine Facts ── */}
                          <div className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Engine Facts</span>
                              <div className="h-px flex-1 bg-neutral-800" />
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-zinc-400">Evaluation</span>
                                <span className="font-mono text-[11px] font-semibold tabular-nums">
                                  <span className={be >= 0 ? "text-emerald-400" : "text-red-400"}>{formatScore(be)}</span>
                                  <span className="text-zinc-600 mx-1">→</span>
                                  <span className={pe >= 0 ? "text-emerald-400" : "text-red-400"}>{formatScore(pe)}</span>
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-zinc-400">Loss</span>
                                <span className="font-mono text-[11px] font-semibold tabular-nums text-rose-400">{el} cp</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-zinc-400">Best move</span>
                                <span className="font-mono text-[11px] font-semibold text-[#f3c53d]">{bestSan.includes("the engine") ? "—" : bestSan}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-zinc-400">Depth</span>
                                <span className="font-mono text-[11px] font-semibold tabular-nums text-white">{currentSession?.depth ?? selectedMove.depth ?? "—"}</span>
                              </div>
                            </div>
                          </div>

                          {/* ── Themes Chips ── */}
                          {themeKeys.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mr-1">Themes</span>
                              {themeKeys.map((theme) => {
                                const colors = MOTIF_THEME_COLORS[theme] ?? "from-stone-500/20 to-stone-500/5 text-stone-300 border-stone-500/20";
                                return (
                                  <span key={theme} className={`rounded-full border bg-gradient-to-r px-2 py-0.5 text-[10px] font-medium ${colors}`}>
                                    {theme}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* ── Difficulty ── */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Difficulty</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3].map((dot) => (
                                <span
                                  key={dot}
                                  className={`h-2 w-2 rounded-full ${
                                    dot <= difficulty.level
                                      ? difficulty.level === 1 ? "bg-emerald-400"
                                        : difficulty.level === 2 ? "bg-amber-400"
                                        : "bg-rose-400"
                                      : "bg-neutral-700"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className={`text-[11px] font-medium ${difficulty.color}`}>{difficulty.label}</span>
                          </div>

                          {/* ── Coach Sections ── */}
                          <div className="rounded-xl border border-[#f3c53d]/30 bg-neutral-900">
                            <div className="px-3.5 py-2.5">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="flex items-center gap-1.5 rounded-full bg-[#f3c53d]/15 px-2.5 py-1">
                                  <Sparkles className="size-3 text-[#f3c53d]" />
                                  <span className="text-[10px] font-bold tracking-wider text-[#f3c53d] uppercase">Coach</span>
                                </span>
                                <div className="h-px flex-1 bg-neutral-800" />
                              </div>
                              <div className="space-y-3">
                                {explainSections.map((sec, i) => (
                                  <div key={i}>
                                    <div className="flex items-start gap-2.5">
                                      <span className="shrink-0 mt-0.5 text-base">{sec.icon}</span>
                                      <div className="min-w-0">
                                        <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#f3c53d] mb-1">{sec.title}</h4>
                                        <p className="text-[12.5px] leading-[1.7] text-white">{sec.content}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* ── Interactive Buttons ── */}
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const fen = isLiveActive ? (currentSession?.fen ?? "") : selectedMove.fenBefore;
                                if (fen && bestSan && !bestSan.includes("the engine") && onShowLine) {
                                  onShowLine(fen, bestSan);
                                }
                              }}
                              disabled={!bestSan || bestSan.includes("the engine") || !onShowLine}
                              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-2 text-[11px] font-semibold text-zinc-300 transition-colors hover:border-[#f3c53d]/40 hover:bg-[#f3c53d]/10 hover:text-[#f3c53d] disabled:opacity-40"
                            >
                              <span>▶</span>
                              Show Line
                            </button>
                            <button
                              type="button"
                              disabled
                              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-2 text-[11px] font-semibold text-zinc-500 cursor-not-allowed"
                            >
                              <span>?</span>
                              Why not
                            </button>
                            <button
                              type="button"
                              disabled
                              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-2 text-[11px] font-semibold text-zinc-500 cursor-not-allowed"
                            >
                              <span>♟</span>
                              Practice
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="absolute left-0 top-px z-10 shrink-0 drop-shadow-[0_3px_8px_rgba(0,0,0,.4)]">
                  <div className="relative shrink-0" style={{ width: 52, height: 52 }}>
                    <PandaMascot size={52} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── 2. Engine Lines ── */}
            {!isWhatIfSearching && (() => {
              const currentGrade = isLiveActive && currentWhatIfMove ? (currentWhatIfMove.grade ?? currentWhatIfEval?.grade) : selectedMove.grade;
              const isMistake = currentGrade === "Blunder" || currentGrade === "Mistake" || currentGrade === "Inaccuracy";
              if (isMistake && !revealedBestMove) return null;

              let lines: EngineLine[] | undefined;
              let fenBefore = "";
              let moveNumber: number | undefined;
              if (liveLinesResolved && liveLinesResolved.length > 0) {
                lines = liveLinesResolved;
                fenBefore = isLiveActive ? whatIfLeafFenResolved : (isStartPosition ? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" : selectedMove.fenBefore);
                if (!isLiveActive) moveNumber = selectedMove.moveNumber;
              } else if (!isLiveActive && isStartPosition && startEngineLines && startEngineLines.length > 0) {
                lines = startEngineLines;
                fenBefore = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
              } else if (!isLiveActive && selectedMove && selectedMove.engineLines && selectedMove.engineLines.length > 0) {
                lines = selectedMove.engineLines;
                fenBefore = selectedMove.fenBefore;
                moveNumber = selectedMove.moveNumber;
              }
              if (lines && lines.length > 0) {
                return (
                  <AlternativeLines
                    lines={lines}
                    fenBefore={fenBefore}
                    moveNumber={moveNumber}
                    onSelectLine={onSelectAltLine}
                  />
                );
              }
              return null;
            })()}

            {/* ── 3. Engine Depth Indicator ── */}
            {/* ── 3. Engine Depth Indicator ── */}
            {!isWhatIfSearching && liveEngine && (
            <div className="flex items-center gap-3 mt-[18px]">
              <div className="relative flex flex-1 items-center h-5">
                {engineAnalysis?.status === "analyzing" ? (
                  <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-neutral-700/70">
                    <span className="absolute top-0 h-full w-[1.5%] rounded-full animate-scan-horizontal bg-amber-400" style={{ animationDelay: "0s", boxShadow: "rgba(251, 191, 36, 0.8) 0px 0px 4px" }} />
                    <span className="absolute top-0 h-full w-[1.5%] rounded-full animate-scan-horizontal bg-amber-400/80" style={{ animationDelay: "0.2s", boxShadow: "rgba(251, 191, 36, 0.6) 0px 0px 4px" }} />
                    <span className="absolute top-0 h-full w-[1.5%] rounded-full animate-scan-horizontal bg-amber-400/60" style={{ animationDelay: "0.4s", boxShadow: "rgba(251, 191, 36, 0.4) 0px 0px 4px" }} />
                    <span className="absolute top-0 h-full w-[1.5%] rounded-full animate-scan-horizontal bg-amber-400/40" style={{ animationDelay: "0.65s", boxShadow: "rgba(251, 191, 36, 0.2) 0px 0px 4px" }} />
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-start ml-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        const fen = isStartPosition ? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" : selectedMove.fenAfter;
                        startAnalysis(fen, { depth: 99 });
                      }}
                      className="rounded-md border border-[#f3c53d]/30 bg-[#f3c53d]/10 px-2.5 py-[3px] text-[10px] font-semibold text-[#f3c53d] hover:bg-[#f3c53d]/20 transition-colors uppercase tracking-wider"
                    >
                      Go deeper
                    </button>
                  </div>
                )}
                <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-md border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 pointer-events-none">
                  <span className="font-mono font-semibold leading-none tabular-nums text-[11px] text-amber-400">{pillarDepth ?? "—"}</span>
                </div>
              </div>
              <button type="button" aria-label="Turn off live engine" aria-pressed="true" onClick={onToggleLiveEngine} className="group/engine relative flex overflow-hidden rounded-lg p-[1.5px] transition-[background-color,transform] duration-150 active:scale-[0.96] h-9 bg-amber-400/50">
                <span aria-hidden="true" className="coach-explain-wave-rotor" />
                <span className="relative z-10 flex items-center justify-center rounded-[6.5px] px-3 transition-colors duration-150 bg-neutral-800 text-amber-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[17px] w-[17px]">
                    <rect x="5" y="5" width="14" height="14" rx="2" />
                    <rect x="9" y="9" width="6" height="6" />
                    <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
                  </svg>
                </span>
              </button>
            </div>
            )}

            {/* ── 4. Best move arrow toggle ── */}
            {!isWhatIfSearching && (() => {
              const currentGrade = isLiveActive && currentWhatIfMove ? (currentWhatIfMove.grade ?? currentWhatIfEval?.grade) : selectedMove.grade;
              const isMistake = currentGrade === "Blunder" || currentGrade === "Mistake" || currentGrade === "Inaccuracy";
              if (isMistake && !revealedBestMove) return null;

              return (
                <div className="mt-3 flex items-center gap-2 shrink-0">
                  <button type="button" onClick={onToggleBestMoveArrow} disabled={!selectedMove.engineLines?.[0]?.line?.length} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 font-semibold transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 h-9 text-[13.5px] ${showBestMoveArrow ? 'border-[#f3c53d]/30 bg-[#f3c53d]/10 text-[#f3c53d]' : 'bg-amber-400 text-[#171717] hover:bg-amber-500'}`}>
                    <BadgeIcon badge="best" size={showBestMoveArrow ? 16 : 18} />
                    {showBestMoveArrow ? 'Hide best move' : 'Show best move'}
                  </button>
                </div>
              );
            })()}

            {/* ── 6. Nav Controls ── */}
            <div className="mt-3.5 shrink-0">
              <div className="flex items-stretch gap-1.5">
                <button
                  type="button"
                  aria-label="First move"
                  onClick={() => {
                    if (isLiveActive && onSelectWhatIfMove) { onSelectWhatIfMove(0); return; }
                    setSelectedPly?.(moves[0]?.ply ?? 0);
                  }}
                  disabled={currentMoveIndex <= 0}
                  className="w-11 shrink-0 flex h-[46px] items-center justify-center rounded-[10px] text-[#171717] transition-[background-color,transform] duration-150 active:scale-[0.96] disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800 bg-amber-400 hover:bg-amber-500 active:bg-amber-500 disabled:opacity-40"
                >
                  <ChevronsLeft className="h-[18px] w-[18px]" strokeWidth={2.4} />
                </button>
                <button
                  type="button"
                  aria-label="Previous move"
                  onClick={() => {
                    if (isLiveActive && onSelectWhatIfMove) { onSelectWhatIfMove(Math.max(0, currentMoveIndex - 1)); return; }
                    const idx = currentMoveIndex - 1;
                    if (idx >= 0 && moves[idx] && setSelectedPly) setSelectedPly(moves[idx].ply);
                  }}
                  disabled={currentMoveIndex <= 0}
                  className="flex-1 flex h-[46px] items-center justify-center rounded-[10px] text-[#171717] transition-[background-color,transform] duration-150 active:scale-[0.96] disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800 bg-amber-400 hover:bg-amber-500 active:bg-amber-500 disabled:opacity-40"
                >
                  <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.4} />
                </button>
                <button
                  type="button"
                  aria-label="Next move"
                  onClick={() => {
                    if (isLiveActive && onSelectWhatIfMove) { onSelectWhatIfMove(Math.min(whatIfMoves ? whatIfMoves.length - 1 : 0, currentMoveIndex + 1)); return; }
                    const idx = currentMoveIndex + 1;
                    if (idx < moves.length && moves[idx] && setSelectedPly) setSelectedPly(moves[idx].ply);
                  }}
                  disabled={isLiveActive ? currentMoveIndex >= (whatIfMoves ? whatIfMoves.length - 1 : 0) : currentMoveIndex >= moves.length - 1}
                  className="flex-1 flex h-[46px] items-center justify-center rounded-[10px] text-[#171717] transition-[background-color,transform] duration-150 active:scale-[0.96] disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800 bg-amber-400 hover:bg-amber-500 active:bg-amber-500 disabled:opacity-40"
                >
                  <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.4} />
                </button>
                <button
                  type="button"
                  aria-label="Last move"
                  onClick={() => {
                    if (isLiveActive && onSelectWhatIfMove) { onSelectWhatIfMove(whatIfMoves ? whatIfMoves.length - 1 : 0); return; }
                    const last = moves[moves.length - 1];
                    if (last && setSelectedPly) setSelectedPly(last.ply);
                  }}
                  disabled={isLiveActive ? currentMoveIndex >= (whatIfMoves ? whatIfMoves.length - 1 : 0) : currentMoveIndex >= moves.length - 1}
                  className="w-11 shrink-0 flex h-[46px] items-center justify-center rounded-[10px] text-[#171717] transition-[background-color,transform] duration-150 active:scale-[0.96] disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800 bg-amber-400 hover:bg-amber-500 active:bg-amber-500 disabled:opacity-40"
                >
                  <ChevronsRight className="h-[18px] w-[18px]" strokeWidth={2.4} />
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
        </>
        )}
      </div>
    </aside>
  );
}

function BoardWorkspace({
  analysis,
  moves,
  selectedMove,
  selectedPly,
  setSelectedPly,
  onJump,
  autoPlay,
  isStartPosition,
  altFen,
  altLabel,
  onWhatIfDrop,
  avatarUrls,
  whatIfMoves,
  whatIfSelectedIdx,
  whatIfSessionList,
  currentSession,
  clearAltLine,
  onSelectWhatIfMove,
  showBestMoveArrow,
  isTrainerMode,
  trainerMistakes,
  trainerIndex,
  onTrainerAttempt,
}: {
  analysis: AnalysisRun;
  moves: MoveEvaluation[];
  selectedMove: MoveEvaluation;
  selectedPly: number;
  setSelectedPly: (ply: number) => void;
  onJump: (delta: number) => void;
  autoPlay?: boolean;
  isStartPosition?: boolean;
  altFen?: string | null;
  altLabel?: string | null;
  onWhatIfDrop?: (fen: string, san: string) => void;
  avatarUrls?: { white?: string; black?: string };
  whatIfMoves?: WhatIfMove[];
  whatIfSelectedIdx?: number;
  whatIfSessionList?: WhatIfSnapshot[];
  currentSession?: WhatIfSnapshot | null;
  showBestMoveArrow?: boolean;
  clearAltLine?: () => void;
  onSelectWhatIfMove?: (idx: number) => void;

  // Trainer Props
  isTrainerMode?: boolean;
  trainerMistakes?: MoveEvaluation[];
  trainerIndex?: number;
  onTrainerAttempt?: (userSan: string, bestSan: string) => void;
}) {
  const { boardColors, pieceThemeId } = useSettings();
  const isLiveActive = !!altFen || (whatIfMoves !== undefined && whatIfMoves.length > 0);
  const hasSnapshot = !!currentSession;

  const selectedIndex = moves.findIndex((m) => m.ply === selectedMove.ply);

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  const dedupedMoves = useMemo(() => {
    const seen = new Set<string>();
    return legalMoves.filter(m => {
      if (seen.has(m.to)) return false;
      seen.add(m.to);
      return true;
    });
  }, [legalMoves]);

  const boardRef = useRef<HTMLDivElement>(null);
  const moveBarRef = useRef<HTMLDivElement>(null);
  const mouseDownSquareRef = useRef<string | null>(null);

  useEffect(() => {
    if (!moveBarRef.current) return;
    const active = moveBarRef.current.querySelector("[data-current=true]");
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedMove.ply, whatIfSelectedIdx]);

  useEffect(() => {
    if (!isLiveActive) clearSelection();
  }, [isLiveActive, clearSelection]);

  useEffect(() => {
    clearSelection();
  }, [selectedMove.ply, clearSelection]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearSelection]);

  // Auto-run engine on current game move if Live Engine is enabled and we are not in what-if mode
  useEffect(() => {
    if (!liveEngine || isLiveActive) {
      if (!isLiveActive) stopAnalysis(); // only stop if we aren't in what-if mode (what-if manages its own engine state)
      return;
    }
    const fen = isStartPosition ? STARTING_FEN : selectedMove.fenAfter;
    startAnalysis(fen, { depth: 22 });
  }, [liveEngine, isLiveActive, selectedMove.fenAfter, isStartPosition, startAnalysis, stopAnalysis]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boardRef.current && !boardRef.current.contains(e.target as Node)) {
        clearSelection();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [clearSelection]);

  // Derive from currentSession with fallback to legacy props
  const snapEval = currentSession?.evaluation ?? null;
  const snapLines: EngineLine[] | null = currentSession?.topMoves
    ? currentSession.topMoves.map((m, i) => ({
        rank: i + 1,
        san: m.san,
        score: m.eval,
        depth: currentSession.depth,
        mate: m.mate ?? undefined,
        line: m.line,
        nodes: 0,
      }))
    : null;
  const snapFen = currentSession?.fen;
  const snapGrade = currentSession?.grade ?? null;

  const liveScoreVal = snapEval?.type === "cp" ? snapEval.value * 100 : snapEval?.type === "mate" ? (snapEval.value > 0 ? 100000 : -100000) : undefined;
  const displayScore = liveScoreVal ?? (isLiveActive ? null : selectedMove.score);

  const chessboardOptions = useMemo(() => {
    const arrows: Array<{ startSquare: string; endSquare: string; color: string }> = [];
    const seenSquares = new Set<string>();

    const cdnBase = pieceCdnBaseUrl(pieceThemeId);
    const customPieces: Record<string, () => React.JSX.Element> | undefined = cdnBase
      ? Object.fromEntries(
          (["p", "n", "b", "r", "q", "k"] as const).flatMap((letter) =>
            (["w", "b"] as const).map((color) => [
              `${color}${letter.toUpperCase()}`,
              () => (
                <span
                  aria-hidden="true"
                  style={{
                    display: "block",
                    filter: "drop-shadow(0 8px 7px rgba(0,0,0,0.28))",
                    height: "100%",
                    position: "relative",
                    width: "100%",
                  }}
                >
                  <img
                    alt=""
                    draggable={false}
                    src={`${cdnBase}/${letter}${color}.svg`}
                    style={{ height: "100%", objectFit: "contain", padding: "6%", width: "100%" }}
                  />
                </span>
              ),
            ]),
          ),
        )
      : undefined;

    const handleSquareClick = (square: string) => {
      if (!onWhatIfDrop) return;
      const fen = altFen ?? (isStartPosition ? STARTING_FEN : selectedMove.fenAfter);
      const chess = new Chess(fen);
      const clickedSquare = square as Square;

      // Clicked on a legal move target — perform the what-if move
      if (selectedSquare && legalMoves.some(m => m.to === clickedSquare)) {
        try {
          const result = chess.move({ from: selectedSquare, to: clickedSquare, promotion: "q" });
          if (result) onWhatIfDrop(chess.fen(), result.san);
        } catch { /* ignore */ }
        clearSelection();
        return;
      }

      // Toggle off if clicking the same piece
      if (square === selectedSquare) {
        clearSelection();
        return;
      }

      // Select own piece and show legal moves
      const piece = chess.get(clickedSquare);
      if (piece && piece.color === chess.turn()) {
        const moves = chess.moves({ square: clickedSquare, verbose: true }) as Move[];
        setSelectedSquare(clickedSquare);
        setLegalMoves(moves);
        return;
      }

      // Click on enemy piece or empty square — clear
      clearSelection();
    };

    // In what-if mode, use only live lines (never fall back to game analysis)
    const engineLines = isLiveActive
      ? (snapLines ?? [])
      : (selectedMove.engineLines ?? []);

    // In what-if mode show top 3 arrows (matching multiPV=3), in game mode show top 2
    const maxArrows = isLiveActive ? 3 : 2;
    engineLines.slice(0, maxArrows).forEach((line, lineIdx) => {
      const firstSan = line.san;
      if (!firstSan) return;
      try {
        const fenBefore = isLiveActive && (snapFen ?? "") ? (snapFen ?? "") : selectedMove.fenBefore;
        const chess = new Chess(fenBefore);
        const move = chess.move(firstSan);
        const sqKey = `${move.from}-${move.to}`;
        if (seenSquares.has(sqKey)) return;
        seenSquares.add(sqKey);
        arrows.push({
          startSquare: move.from,
          endSquare: move.to,
          color: lineIdx === 0 ? "rgba(92, 145, 20, 0.85)" : "rgba(92, 145, 20, 0.45)",
        });
      } catch { /* skip invalid move */ }
    });

    const boardFen = altFen ?? (isStartPosition ? STARTING_FEN : selectedMove.fenAfter);
    const orientation = (analysis.subjectColor ?? "white") as "white" | "black";

    // Best move arrow overlay (gold, when toggle is on)
    if (showBestMoveArrow) {
      const fenBefore = isLiveActive && snapFen ? snapFen : selectedMove.fenBefore;
      if (fenBefore) {
        const firstSan = engineLines[0]?.san;
        if (firstSan) {
          try {
            const ch = new Chess(fenBefore);
            const mv = ch.move(firstSan);
            const sqKey = `${mv.from}-${mv.to}`;
            if (!seenSquares.has(sqKey)) {
              seenSquares.add(sqKey);
              arrows.push({ startSquare: mv.from, endSquare: mv.to, color: "rgba(243, 197, 61, 0.85)" });
            }
          } catch { /* skip */ }
        }
      }
    }

    return {
      position: boardFen,
      pieces: customPieces,
      boardOrientation: orientation,
      showNotation: true,
      allowDragging: true,
      dragActivationDistance: 5,
      animationDurationInMs: isLiveActive ? 0 : 180,
      boardStyle: {
        borderRadius: 0,
        boxShadow: "0 18px 44px rgba(0,0,0,0.34)",
        width: "100%",
      },
      lightSquareStyle: { backgroundColor: boardColors.light },
      darkSquareStyle: { backgroundColor: boardColors.dark },
      darkSquareNotationStyle: { color: "rgba(255,255,255,0.72)", fontWeight: 700 },
      lightSquareNotationStyle: { color: "rgba(28,29,33,0.74)", fontWeight: 700 },
      squareStyles: (() => {
        const styles: Record<string, React.CSSProperties> = {};

        if (selectedSquare) {
          styles[selectedSquare] = { backgroundColor: "rgba(128, 167, 37, 0.30)" };
        }

        if (isLiveActive && whatIfMoves && whatIfSelectedIdx !== undefined && whatIfSelectedIdx >= 0) {
          const wiMove = whatIfMoves[whatIfSelectedIdx];
          if (wiMove) {
            styles[wiMove.from] = { backgroundColor: "rgba(128, 167, 37, 0.45)" };
            styles[wiMove.to] = { backgroundColor: "rgba(170, 69, 69, 0.50)" };
            return styles;
          }
        }

        styles[selectedMove.from] = { backgroundColor: "rgba(128, 167, 37, 0.45)" };
        styles[selectedMove.to] = { backgroundColor: "rgba(170, 69, 69, 0.50)" };

        if (showBestMoveArrow) {
          const bmFenBefore = isLiveActive && snapFen ? snapFen : selectedMove.fenBefore;
          if (bmFenBefore) {
            const bmSan = engineLines[0]?.san;
            if (bmSan) {
              try {
                const bmCh = new Chess(bmFenBefore);
                const bmMv = bmCh.move(bmSan);
                styles[bmMv.from] = { backgroundColor: "rgba(243, 197, 61, 0.45)" };
                styles[bmMv.to] = { backgroundColor: "rgba(243, 197, 61, 0.50)", boxShadow: "inset 0 0 12px rgba(243,197,61,0.4)" };
              } catch { /* skip */ }
            }
          }
        }

        return styles;
      })(),
      arrows,
      onSquareMouseDown: ({ square }: { square: string }, e: React.MouseEvent) => {
        if (e?.button !== 0) return;
        mouseDownSquareRef.current = square;
        handleSquareClick(square);
      },
      onSquareClick: ({ square }: { square: string }) => {
        if (mouseDownSquareRef.current === square) {
          mouseDownSquareRef.current = null;
          return;
        }
        handleSquareClick(square);
      },
      onPieceDrop: ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
        clearSelection();
        if (!targetSquare) return false;

        try {
          const chess = new Chess(boardFen);
          const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
          if (!move) return false;

          if (isTrainerMode && trainerMistakes && trainerIndex !== undefined && onTrainerAttempt) {
            onTrainerAttempt(move.san, trainerMistakes[trainerIndex]?.bestMove ?? "");
            return false; // Snap back piece for trainer mode
          }

          if (onWhatIfDrop) {
            onWhatIfDrop(chess.fen(), move.san);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
    };
  }, [isStartPosition, selectedMove, altFen, onWhatIfDrop, isLiveActive, whatIfMoves, whatIfSelectedIdx, selectedSquare, legalMoves, clearSelection, showBestMoveArrow, boardColors, pieceThemeId]);

  const GRADE_TO_LABEL: Record<string, string> = {
    Brilliant: "brilliant",
    Great: "great_find",
    Best: "best",
    Excellent: "excellent",
    Good: "good",
    Book: "book",
    Inaccuracy: "inaccuracy",
    Mistake: "mistake",
    Blunder: "blunder",
    Miss: "miss",
  };

  const isAwaitingLiveEvaluation = isLiveActive && displayScore === null;
  // A missing live score means the worker is searching, not that Black is
  // winning. Keep the bar neutral until the first engine update arrives.
  const evalScale = displayScore !== null
    ? (Math.abs(displayScore) >= 100_000 ? (displayScore > 0 ? 100 : 0) : evalToPct(displayScore)) / 100
    : 0.5;

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col items-center justify-center bg-[#11110f] px-8 py-3">
      <div className="flex w-full max-w-[580px] flex-col justify-center shrink-0">
        <div className="flex w-full flex-col gap-2">
        <div className="flex h-7 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ChipLink
              href={analysis.source !== "pgn" ? `/games?username=${encodeURIComponent(analysis.white)}` : undefined}
              className="bg-[#ededed] text-[#171717] hover:bg-[#e2e2e2]"
              avatarUrl={avatarUrls?.white}
              name={analysis.white}
              rating={playerRating(analysis.accuracyWhite)}
              showTrophy={analysis.result === "1-0"}
            />
            <span className="flex-none font-mono tabular-nums text-[11.5px] text-neutral-400">6:46</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex-none font-mono tabular-nums text-[11.5px] text-neutral-400">7:35</span>
            <ChipLink
              href={analysis.source !== "pgn" ? `/games?username=${encodeURIComponent(analysis.black)}` : undefined}
              className="border border-[#333] bg-[#101010] text-[#f5f5f5] ring-[1.5px] ring-amber-400 hover:bg-[#1c1c1c]"
              avatarUrl={avatarUrls?.black}
              name={analysis.black}
              rating={playerRating(analysis.accuracyBlack)}
              showTrophy={analysis.result === "0-1"}
            />
          </div>
        </div>

        <div className="flex items-stretch gap-2">
          <div
            className="relative shrink-0 overflow-hidden rounded-md bg-[#3a3a3a] w-5"
            aria-label={isAwaitingLiveEvaluation ? "Engine is analyzing this position" : `Evaluation ${formatScore(displayScore)}`}
          >
            <div
              className="absolute inset-0 bg-[#f5f5f4] transition-all duration-500"
              style={{ transform: `scaleY(${evalScale})`, transformOrigin: "center bottom", opacity: 1 }}
            />
            <div className="absolute inset-x-0 top-1/2 h-px bg-[rgba(115,115,115,.7)]" />
            
            <span 
              className={cn(
                "absolute inset-x-0 text-center font-mono text-[9px] font-semibold tabular-nums tracking-[-0.5px]",
                displayScore !== null && displayScore < 0 
                  ? "top-1 text-white/90" 
                  : "bottom-1 text-[#171717]"
              )}
            >
              {isAwaitingLiveEvaluation ? "…" : formatScore(displayScore)}
            </span>
          </div>
          <div ref={boardRef} className="relative overflow-hidden rounded-lg shadow-[0_20px_40px_rgba(0,0,0,.6),0_8px_16px_rgba(0,0,0,.4)] flex-1 aspect-square">
            <Chessboard options={chessboardOptions} />
            {(() => {
              // Use what-if grade ONLY in what-if mode, otherwise strictly preserve the static game grade
              const wiGrade = isLiveActive ? (snapGrade ?? null) : null;
              const gradeForBadge = isLiveActive ? wiGrade : (!altFen && isStartPosition ? null : selectedMove.grade);
              const gradeLabel = gradeForBadge ? GRADE_TO_LABEL[gradeForBadge] : null;
              const badgeTo = isLiveActive && whatIfMoves && whatIfSelectedIdx !== undefined && whatIfSelectedIdx >= 0
                ? whatIfMoves[whatIfSelectedIdx]?.to ?? selectedMove.to
                : selectedMove.to;
              if (!gradeLabel) return null;
              return (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: `${(squareToBoardPos(badgeTo, analysis.subjectColor ?? "white").x + 1 / 8) * 100}%`,
                    top: `${squareToBoardPos(badgeTo, analysis.subjectColor ?? "white").y * 100}%`,
                    transform: "translate(-100%, 0)",
                    zIndex: 20,
                  }}
                >
                  <img
                    src={`/images/brilliance_v2/svg/${gradeLabel}.svg`}
                    alt=""
                    className="size-8"
                    style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }}
                  />
                </div>
              );
            })()}
            {legalMoves.length > 0 && selectedSquare && (
              <div className="pointer-events-none absolute inset-0 z-15 animate-[fadeIn_150ms_ease-out]">
                <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}`}</style>
                {dedupedMoves.map(move => {
                  const pos = squareToBoardPos(move.to, analysis.subjectColor ?? "white");
                  const isCapture = move.flags.includes("c");
                  if (isCapture) {
                    return (
                      <div
                        key={move.to}
                        onClick={() => {
                          clearSelection();
                          const fen = altFen ?? (isStartPosition ? STARTING_FEN : selectedMove.fenAfter);
                          try {
                            const chess = new Chess(fen);
                            const result = chess.move({ from: selectedSquare!, to: move.to, promotion: "q" });
                            if (result) onWhatIfDrop!(chess.fen(), result.san);
                          } catch { /* ignore */ }
                        }}
                        className="pointer-events-auto absolute cursor-pointer"
                        style={{
                          left: `${(pos.x + 0.5 / 8) * 100}%`,
                          top: `${(pos.y + 0.5 / 8) * 100}%`,
                          transform: "translate(-50%, -50%)",
                          width: "11%",
                          height: "11%",
                          borderRadius: "50%",
                          border: "3px solid rgba(239, 68, 68, 0.7)",
                          background: "transparent",
                          zIndex: 15,
                        }}
                      />
                    );
                  }
                  return (
                    <div
                      key={move.to}
                      onClick={() => {
                        clearSelection();
                        const fen = altFen ?? (isStartPosition ? STARTING_FEN : selectedMove.fenAfter);
                        try {
                          const chess = new Chess(fen);
                          const result = chess.move({ from: selectedSquare!, to: move.to, promotion: "q" });
                          if (result) onWhatIfDrop!(chess.fen(), result.san);
                        } catch { /* ignore */ }
                      }}
                      className="pointer-events-auto absolute cursor-pointer"
                      style={{
                        left: `${(pos.x + 0.5 / 8) * 100}%`,
                        top: `${(pos.y + 0.5 / 8) * 100}%`,
                        transform: "translate(-50%, -50%)",
                        width: "3.5%",
                        height: "3.5%",
                        borderRadius: "50%",
                        backgroundColor: "rgba(74, 222, 128, 0.7)",
                        zIndex: 15,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Horizontal move bar — swaps data source in what-if mode */}
        <div className="relative flex items-stretch h-11 rounded-lg border border-neutral-700/50 bg-[#1f1f1f] w-full">
          <button
            type="button"
            aria-label="Previous move"
            onClick={() => { if (!isLiveActive) onJump(-1); }}
            disabled={isLiveActive || selectedIndex <= -1}
            className="flex shrink-0 items-center justify-center transition-[background-color,transform] active:scale-[0.96] disabled:active:scale-100 w-11 rounded-l-lg border-r border-black/10 bg-amber-400 text-[#171717] hover:bg-amber-500 active:bg-amber-500 disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </button>

          <div ref={moveBarRef} className="relative flex h-full flex-1 items-center gap-0.5 overflow-x-auto px-1.5 cursor-grab [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {isLiveActive && whatIfMoves ? (
              /* What-If mode: show "Back to Game" + temporary moves */
              <>
                <button
                  type="button"
                  onClick={() => clearAltLine?.()}
                  className="flex shrink-0 items-center gap-1 rounded px-2 py-1 font-mono text-xs font-semibold text-amber-400 transition hover:text-amber-300 active:scale-[0.97]"
                >
                  <ChevronLeft className="size-3.5" strokeWidth={2.5} />
                  Back to Game
                </button>
                <span className="h-4 w-px shrink-0 bg-neutral-700/40" />
                {whatIfMoves.map((m, i) => {
                  const isActiveItem = (whatIfSelectedIdx ?? (whatIfMoves.length - 1)) === i;
                  const snapGrade = whatIfSessionList?.[i]?.grade;
                  const labelFile = snapGrade ? GRADE_TO_LABEL[snapGrade] : null;
                  return (
                    <button
                      key={`whatif-${i}`}
                      type="button"
                      onClick={() => onSelectWhatIfMove?.(i)}
                      data-current={isActiveItem ? "true" : undefined}
                      className={`relative flex shrink-0 items-center gap-[5px] whitespace-nowrap rounded px-[7px] py-1 font-mono text-sm transition-[background-color,color,transform] duration-150 active:scale-[0.96] ${
                        isActiveItem
                          ? "bg-amber-400 font-semibold text-[#171717]"
                          : "text-neutral-200 hover:bg-neutral-700"
                      }`}
                    >
                      {m.san}
                      {labelFile && (
                        <span className="inline-flex h-3.5 w-3.5 shrink-0 [&_img]:!h-3.5 [&_img]:!w-3.5 [&_img]:!max-w-none">
                          <div title={`${snapGrade} Move`} className="inline-block">
                            <img
                              alt={`${snapGrade} Move`}
                              fetchPriority="high"
                              width="14"
                              height="14"
                              decoding="async"
                              src={`/images/brilliance_v2/svg/${labelFile}.svg`}
                            />
                          </div>
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            ) : (
              /* Normal mode: original game moves */
              moves.map((m, idx) => {
                const isActive2 = moves[idx]?.ply === selectedMove.ply;
                const labelFile = GRADE_TO_LABEL[m.grade] ?? null;
                return (
                  <button
                    key={`${idx}-${m.san}`}
                    type="button"
                    aria-label={`Move ${m.san}${isActive2 ? " (current)" : ""}`}
                    aria-current={isActive2 ? "true" : undefined}
                    data-current={isActive2 ? "true" : undefined}
                    onClick={() => { const target = moves[idx]; if (target) setSelectedPly(target.ply); }}
                    className={`relative flex items-center gap-[5px] whitespace-nowrap rounded px-[7px] py-1 font-mono text-sm transition-[background-color,color,transform] duration-150 active:scale-[0.96] ${
                      isActive2
                        ? "bg-amber-400 font-semibold text-[#171717]"
                        : "text-neutral-200 hover:bg-neutral-700"
                    }`}
                  >
                    {m.san}
                    {labelFile && (
                      <span className="inline-flex h-3.5 w-3.5 shrink-0 [&_img]:!h-3.5 [&_img]:!w-3.5 [&_img]:!max-w-none">
                        <div title={`${m.grade} Move`} className="inline-block">
                          <img
                            alt={`${m.grade} Move`}
                            fetchPriority="high"
                            width="14"
                            height="14"
                            decoding="async"
                            src={`/images/brilliance_v2/svg/${labelFile}.svg`}
                          />
                        </div>
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            aria-label="Next move"
            onClick={() => { if (!isLiveActive) onJump(1); }}
            disabled={isLiveActive || selectedIndex >= moves.length - 1}
            className="flex shrink-0 items-center justify-center transition-[background-color,transform] active:scale-[0.96] disabled:active:scale-100 w-11 rounded-r-lg border-l border-black/10 bg-amber-400 text-[#171717] hover:bg-amber-500 active:bg-amber-500 disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          {autoPlay && (
            <span className="flex items-center gap-1.5 rounded bg-green-500/15 px-2 py-1 text-[9px] font-semibold text-green-400">
              <span className="size-1.5 animate-pulse rounded-full bg-green-400" />
              Auto-playing
            </span>
          )}
          <span className="flex items-center gap-2 text-[9px] text-stone-500">
            <kbd className="rounded border border-stone-600 bg-stone-800 px-1 py-px font-mono text-[8px]">←</kbd>
            <kbd className="rounded border border-stone-600 bg-stone-800 px-1 py-px font-mono text-[8px]">→</kbd>
            <span>Navigate</span>
            <span className="text-stone-600">|</span>
            <kbd className="rounded border border-stone-600 bg-stone-800 px-1 py-px font-mono text-[8px]">Space</kbd>
            <span>Play</span>
            <span className="text-stone-600">|</span>
            <kbd className="rounded border border-stone-600 bg-stone-800 px-1 py-px font-mono text-[8px]">J</kbd>
            <kbd className="rounded border border-stone-600 bg-stone-800 px-1 py-px font-mono text-[8px]">K</kbd>
            <span>Critical</span>
          </span>
        </div>
        </div>

      </div>
    </main>
  );
}

export function GameAnalysisPage({ analysis }: { analysis: AnalysisRun }) {
  return (
    <SettingsProvider>
      <GameAnalysisPageInner analysis={analysis} />
    </SettingsProvider>
  );
}

function GameAnalysisPageInner({ analysis }: { analysis: AnalysisRun }) {
  const moves = analysis.moveEvaluations;
  const pathname = useStablePathname();
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [selectedPly, setSelectedPly] = useState(0);
  const [startEngineLines, setStartEngineLines] = useState<EngineLine[]>([]);
  const [avatarUrls, setAvatarUrls] = useState<{ white?: string; black?: string }>({});

  // ── Trainer State ──
  const [isTrainerMode, setIsTrainerMode] = useState(false);
  const [trainerMistakes, setTrainerMistakes] = useState<MoveEvaluation[]>([]);
  const [trainerIndex, setTrainerIndex] = useState(0);
  const [trainerStatus, setTrainerStatus] = useState<"playing" | "success" | "failed" | "finished">("playing");
  const [trainerAttempt, setTrainerAttempt] = useState<string | null>(null);

  const startTrainer = useCallback(() => {
    const mistakes = moves.filter(
      (m) => m.side === analysis.subjectColor && (m.grade === "Blunder" || m.grade === "Mistake")
    );
    if (mistakes.length === 0) return;
    setTrainerMistakes(mistakes);
    setTrainerIndex(0);
    setTrainerStatus("playing");
    setTrainerAttempt(null);
    setIsTrainerMode(true);
    // Jump to the position BEFORE the mistake
    setSelectedPly(mistakes[0].ply - 1);
  }, [moves, analysis.subjectColor, setSelectedPly]);

  const handleTrainerNext = useCallback(() => {
    const nextIdx = trainerIndex + 1;
    if (nextIdx >= trainerMistakes.length) {
      setTrainerStatus("finished");
    } else {
      setTrainerIndex(nextIdx);
      setTrainerStatus("playing");
      setTrainerAttempt(null);
      setSelectedPly(trainerMistakes[nextIdx].ply - 1);
    }
  }, [trainerIndex, trainerMistakes, setSelectedPly]);

  const handleTrainerRetry = useCallback(() => {
    setTrainerStatus("playing");
    setTrainerAttempt(null);
    setSelectedPly(trainerMistakes[trainerIndex].ply - 1);
  }, [trainerIndex, trainerMistakes, setSelectedPly]);

  const handleTrainerAttempt = useCallback((userSan: string, bestSan: string) => {
    setTrainerAttempt(userSan);
    if (userSan === bestSan) {
      setTrainerStatus("success");
      // Actually play the correct move on the board by advancing the ply
      setSelectedPly(trainerMistakes[trainerIndex].ply);
    } else {
      setTrainerStatus("failed");
    }
  }, [trainerIndex, trainerMistakes, setSelectedPly]);

  const handleTrainerExit = useCallback(() => {
    setIsTrainerMode(false);
    setSelectedPly(0);
  }, [setSelectedPly]);

  const { analysis: engineAnalysis, startAnalysis, stopAnalysis } = useEngine();
  const { showBestMoves, engineDepth, setLiveEngine } = useSettings();

  useEffect(() => {
    if (activeTab === "Analysis") {
      setLiveEngine(true);
    }
  }, [activeTab, setLiveEngine]);

  /* ── What-If Session Manager (immutable snapshots, clean pipeline) ── */
  const whatIf = useWhatIfSessions({
    engineAnalysis,
    startAnalysis,
    stopAnalysis,
    targetDepth: engineDepth,
  });

  // Ordered list of what-if moves for the move bar (derived from sessions + pending data)
  const whatIfSessionOrderRef = useRef<string[]>([]);
  const [pendingMoveData, setPendingMoveData] = useState<{san: string; from: string; to: string; fen: string} | null>(null);

  const isLiveActive = whatIf.selectedId !== null;
  const altFen: string | null = whatIf.currentSession?.fen ?? whatIf.pendingFen ?? null;
  const altLabel: string | null = isLiveActive ? "What If" : null;

  /* ── Ordered snapshot list for move bar badge resolution ── */
  const whatIfSessionList = useMemo((): WhatIfSnapshot[] => {
    return whatIfSessionOrderRef.current
      .map(id => whatIf.sessions.get(id))
      .filter((s): s is WhatIfSnapshot => s !== undefined);
  }, [whatIf.sessions]);

  /* ── Derive whatIfMoves from session list + pending move data ── */
  const whatIfMoves: WhatIfMove[] = useMemo(() => {
    const result: WhatIfMove[] = whatIfSessionList.map(s => ({
      san: s.san,
      from: s.from,
      to: s.to,
      fen: s.fen,
      grade: s.grade ?? undefined,
      score: s.topMoves[0]?.eval,
    }));
    if (isLiveActive && pendingMoveData && !result.some(m => m.fen === pendingMoveData.fen)) {
      result.push(pendingMoveData);
    }
    return result;
  }, [whatIfSessionList, isLiveActive, pendingMoveData]);

  /* ── DeepSeek LLM analysis for What-If mode (parallel to engine) ── */
  // Live moves are evaluated only by the local Stockfish worker. Do not make
  // a background OpenRouter request on every drop: it is slow and can fail
  // when AI credits are unavailable.
  const llmAnalysis: LLMAnalysis | null = null;
  const llmLoading = false;

  // Selected index derived from session order
  const whatIfSelectedIdx: number = whatIf.selectedId
    ? whatIfSessionOrderRef.current.indexOf(whatIf.selectedId)
    : -1;

  /* ── Removed: whatIfEngineLines, whatIfDisplayEval, whatIfDisplayDepth, whatIfDisplayGrade ── */
  /* BoardWorkspace and RightPanel now read these fields from currentSession directly. */

  // Graph values follow the visible what-if line only, using the snapshot eval.
  const whatIfGraphValues = useMemo(() => {
    if (whatIfSessionList.length === 0) return null;
    return whatIfSessionList.map((snap) => {
      const score = snap.evaluation?.type === "cp"
        ? snap.evaluation.value * 100
        : snap.evaluation?.type === "mate"
          ? (snap.evaluation.value > 0 ? 100_000 : -100_000)
          : 0;
      return Math.max(0, Math.min(100, score / 2 + 50));
    });
  }, [whatIfSessionList]);

  /* ── Lazy-fetch player avatars from Chess.com/Lichess API ── */
  useEffect(() => {
    if (analysis.source === "pgn") return;
    const isChess = analysis.source === "chesscom";
    const name = isChess ? analysis.white : analysis.white.toLowerCase();
    const apiUrl = isChess
      ? `https://api.chess.com/pub/player/${encodeURIComponent(name)}`
      : `https://lichess.org/api/user/${encodeURIComponent(name)}`;
    fetch(apiUrl)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.avatar) setAvatarUrls((prev) => ({ ...prev, white: data.avatar })); })
      .catch(() => {});
  }, [analysis.white, analysis.source]);

  useEffect(() => {
    if (analysis.source === "pgn") return;
    const isChess = analysis.source === "chesscom";
    const name = isChess ? analysis.black : analysis.black.toLowerCase();
    const apiUrl = isChess
      ? `https://api.chess.com/pub/player/${encodeURIComponent(name)}`
      : `https://lichess.org/api/user/${encodeURIComponent(name)}`;
    fetch(apiUrl)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.avatar) setAvatarUrls((prev) => ({ ...prev, black: data.avatar })); })
      .catch(() => {});
  }, [analysis.black, analysis.source]);
  const selectedIndex = moves.findIndex((move) => move.ply === selectedPly);
  const selectedMove = selectedIndex >= 0 ? moves[selectedIndex] : moves[0];
  const isStartPosition = selectedPly === 0;
  const displayScore = selectedMove.score;
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Best move arrow toggle (persistent gold arrow overlay, no step-through) ── */
  const [showBestMoveArrow, setShowBestMoveArrow] = useState(showBestMoves);
  const toggleBestMoveArrow = useCallback(() => {
    setShowBestMoveArrow(v => !v);
  }, []);

  /* ── Sync arrow visibility with the "Show best moves" review setting ── */
  useEffect(() => {
    setShowBestMoveArrow(showBestMoves);
  }, [showBestMoves]);

  /* ── Navigate within what-if moves ── */
  const onSelectWhatIfMove = useCallback((idx: number) => {
    const sid = whatIfSessionOrderRef.current[idx];
    if (sid) whatIf.selectSession(sid);
  }, [whatIf.selectSession]);

  const exitWhatIfMode = useCallback(() => {
    if (!isLiveActive) return;
    whatIf.clearAll();
    setPendingMoveData(null);
    whatIfSessionOrderRef.current = [];
  }, [isLiveActive, whatIf.clearAll]);

  /* ── "Best Move" pill: play the engine's top move from the current position as a new what-if branch ── */
  const playBestMove = useCallback((san: string) => {
    if (!san || san === "the engine move") return;
    const chainFen = whatIf.currentSession?.fen ?? whatIf.pendingFen;
    if (isLiveActive && chainFen) {
      try {
        const chess = new Chess(chainFen);
        const move = chess.move(san);
        if (!move) return;
        const nextFen = chess.fen();
        const soundName = san.includes("#") ? "game-win" : san.includes("x") ? "capture" : san.includes("+") ? "move-check" : "move-self";
        playSound(soundName);
        const sessionId = whatIf.createSession(nextFen, move.san, move.from, move.to);
        const selectedIdx = whatIf.selectedId
          ? whatIfSessionOrderRef.current.indexOf(whatIf.selectedId)
          : whatIfSessionOrderRef.current.length - 1;
        const branchRootIdx = selectedIdx >= 0 ? selectedIdx : whatIfSessionOrderRef.current.length - 1;
        setPendingMoveData({ san: move.san, from: move.from, to: move.to, fen: nextFen });
        whatIfSessionOrderRef.current = [
          ...whatIfSessionOrderRef.current.slice(0, branchRootIdx + 1),
          sessionId,
        ];
      } catch (error) {
        console.error("[BestMove] Failed to continue the live line", error);
      }
      return;
    }
    const boardFen = isStartPosition ? STARTING_FEN : (selectedMove.fenBefore ?? STARTING_FEN);
    try {
      const chess = new Chess(boardFen);
      const move = chess.move(san);
      if (!move) return;
      const nextFen = chess.fen();
      const soundName = san.includes("#") ? "game-win" : san.includes("x") ? "capture" : san.includes("+") ? "move-check" : "move-self";
      playSound(soundName);
      const sessionId = whatIf.createSession(nextFen, move.san, move.from, move.to, {
        fenBefore: boardFen,
        scoreBefore: isStartPosition ? 0 : (selectedMove.score ?? 0),
      });
      setPendingMoveData({ san: move.san, from: move.from, to: move.to, fen: nextFen });
      whatIfSessionOrderRef.current = [sessionId];
    } catch (error) {
      console.error("[BestMove] Failed to start analysis for best move", { san, error });
    }
  }, [isLiveActive, isStartPosition, selectedMove.fenBefore, selectedMove.score, whatIf]);

  /* ── On mount, populate starting position analysis from the first move's engine data ── */
  useEffect(() => {
    if (moves[0]?.engineLines) {
      setStartEngineLines(moves[0].engineLines);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function jump(delta: number) {
    const nextIndex = Math.max(-1, Math.min(moves.length - 1, selectedIndex + delta));
    if (nextIndex < 0) {
      setSelectedPly(0);
    } else {
      const nextMove = moves[nextIndex];
      if (nextMove) setSelectedPly(nextMove.ply);
    }
  }

  /* ── Auto-focus container for keyboard events ── */
  useEffect(() => { containerRef.current?.focus(); }, []);

  /* ── Move navigation sound ── */
  const prevIndexRef = useRef(selectedIndex);
  useEffect(() => {
    if (prevIndexRef.current !== selectedIndex) {
      const wentForward = selectedIndex > prevIndexRef.current;
      prevIndexRef.current = selectedIndex;
      if (selectedMove.isCapture) {
        playSound("capture");
      } else if (selectedMove.isCheck) {
        playSound("move-check");
      } else if (selectedMove.isCheckmate) {
        playSound("game-win");
      } else {
        playSound(wentForward ? "move-self" : "move-opponent");
      }
    }
  }, [selectedIndex, selectedMove]);

  /* ── Auto-play ── */
  const [autoPlay, setAutoPlay] = useState(false);
  const [activeTab, setActiveTab] = useState("Analysis");
  const selectedPlyRef = useRef(selectedPly);
  selectedPlyRef.current = selectedPly;

  useEffect(() => {
    if (!autoPlay || moves.length === 0) return;
    const currentIndex = moves.findIndex((m) => m.ply === selectedPlyRef.current);
    if (currentIndex >= moves.length - 1) {
      setAutoPlay(false);
      return;
    }
    const id = window.setInterval(() => {
      const idx = moves.findIndex((m) => m.ply === selectedPlyRef.current);
      if (idx >= moves.length - 1) {
        setAutoPlay(false);
        return;
      }
      setSelectedPly(moves[idx + 1].ply);
    }, 2000);
    return () => window.clearInterval(id);
  }, [autoPlay, moves]);

  /* ── Critical moments ── */
  const criticalMoments = useMemo(
    () =>
      moves.filter((m) => m.cpLoss >= 100 || m.grade === "Blunder" || m.grade === "Mistake").map((m) => m.ply),
    [moves],
  );

  /* ── Keyboard listener (synthetic onKeyDown, not window) ── */
  const movesRef = useRef(moves);
  movesRef.current = moves;
  const criticalRef = useRef(criticalMoments);
  criticalRef.current = criticalMoments;

  const isWhatIfRef = useRef(isLiveActive);
  isWhatIfRef.current = isLiveActive;

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

    // When in what-if mode, arrow keys exit back to the game
    if (isWhatIfRef.current) {
      e.preventDefault();
      return;
    }

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        setSelectedPly((prev) => {
          const idx = movesRef.current.findIndex((m) => m.ply === prev);
          if (idx > 0) return movesRef.current[idx - 1].ply;
          if (idx === 0) return 0;
          return prev;
        });
        break;
      case "ArrowRight":
        e.preventDefault();
        setSelectedPly((prev) => {
          const idx = movesRef.current.findIndex((m) => m.ply === prev);
          return idx < movesRef.current.length - 1 ? movesRef.current[idx + 1].ply : prev;
        });
        break;
      case "Home":
        e.preventDefault();
        setSelectedPly(0);
        break;
      case "End":
        e.preventDefault();
        if (movesRef.current[movesRef.current.length - 1]) setSelectedPly(movesRef.current[movesRef.current.length - 1].ply);
        break;
      case " ":
        e.preventDefault();
        setAutoPlay((prev) => !prev);
        break;
      case "j":
        e.preventDefault();
        {
          const next = criticalRef.current.find((ply) => ply > selectedPlyRef.current);
          if (next) {
            const move = movesRef.current.find((m) => m.ply === next);
            if (move) setSelectedPly(move.ply);
          }
        }
        break;
      case "k":
        e.preventDefault();
        {
          const prev = [...criticalRef.current].reverse().find((ply) => ply < selectedPlyRef.current);
          if (prev) {
            const move = movesRef.current.find((m) => m.ply === prev);
            if (move) setSelectedPly(move.ply);
          }
        }
        break;
    }
  }, [setSelectedPly, setAutoPlay]);

  if (moves.length === 0) {
    return (
      <section className="grid min-h-screen place-items-center bg-[#171613] px-6 text-stone-200">
        <div className="rounded-xl bg-[#242321] p-8 text-center">
          <Search className="mx-auto size-8 text-stone-500" />
          <h1 className="mt-4 text-2xl font-bold">No moves to analyze</h1>
          <Link href="/analyze" className="mt-6 inline-flex rounded-lg bg-[#ffc12c] px-4 py-2 text-sm font-bold text-[#282417]">
            Analyze a game
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-[1000] overflow-hidden bg-[#171613] text-stone-100" onKeyDown={onKeyDown} tabIndex={0}>
      <PremiumSidebar
        pathname={pathname}
        onShowWhatsNew={() => setShowWhatsNew(true)}
        collapsed={navCollapsed}
        onToggleCollapsed={() => setNavCollapsed((c) => !c)}
      />
      <div className={cn("grid h-screen", navCollapsed ? "lg:grid-cols-[60px_minmax(560px,1fr)_420px]" : "lg:grid-cols-[256px_minmax(560px,1fr)_420px]")}>
        <div className="hidden lg:block" />
        <BoardWorkspace
          analysis={analysis}
          moves={moves}
          selectedMove={selectedMove}
          selectedPly={selectedPly}
          setSelectedPly={setSelectedPly}
          onJump={jump}
          autoPlay={autoPlay}
          isStartPosition={isStartPosition}
          altFen={altFen}
          altLabel={altLabel}
           onWhatIfDrop={(fen, san) => {
             setShowBestMoveArrow(false);
             const soundName = san.includes("#") ? "game-win" : san.includes("x") ? "capture" : san.includes("+") ? "move-check" : "move-self";
             const chainFen = whatIf.currentSession?.fen ?? whatIf.pendingFen;
             if (isLiveActive && chainFen) {
               try {
                 const chess = new Chess(chainFen);
                 const move = chess.move(san);
                 playSound(soundName);
                 const sessionId = whatIf.createSession(fen, move.san, move.from, move.to);
                const selectedIdx = whatIf.selectedId
                  ? whatIfSessionOrderRef.current.indexOf(whatIf.selectedId)
                  : whatIfSessionOrderRef.current.length - 1;
                const branchRootIdx = selectedIdx >= 0 ? selectedIdx : whatIfSessionOrderRef.current.length - 1;
                setPendingMoveData({ san: move.san, from: move.from, to: move.to, fen });
                whatIfSessionOrderRef.current = [
                  ...whatIfSessionOrderRef.current.slice(0, branchRootIdx + 1),
                  sessionId,
                ];
              } catch (error) {
                console.error("[WhatIf] Failed to continue the live line", error);
              }
              return;
            }
            const boardFen = isStartPosition ? STARTING_FEN : selectedMove.fenAfter;
            if (selectedPly < moves.length - 1) {
              const nextGameMove = moves[selectedPly + 1];
              if (nextGameMove && nextGameMove.san === san) {
                setSelectedPly(nextGameMove.ply);
                return;
              }
            }
            try {
               const chess = new Chess(boardFen);
               const move = chess.move(san);
               playSound(soundName);
               const sessionId = whatIf.createSession(fen, move.san, move.from, move.to, {
                fenBefore: boardFen,
                scoreBefore: isStartPosition ? 0 : selectedMove.score,
              });
              setPendingMoveData({ san: move.san, from: move.from, to: move.to, fen });
              whatIfSessionOrderRef.current = [sessionId];
            } catch (error) {
              console.error("[WhatIf] Failed to start analysis for dropped move", { fen, san, error });
            }
          }}
          avatarUrls={avatarUrls}
          whatIfMoves={whatIfMoves}
          whatIfSelectedIdx={whatIfSelectedIdx}
          whatIfSessionList={whatIfSessionList}
          currentSession={whatIf.currentSession}
           onSelectWhatIfMove={onSelectWhatIfMove}
           clearAltLine={exitWhatIfMode}
           showBestMoveArrow={showBestMoveArrow}
           isTrainerMode={isTrainerMode}
           trainerMistakes={trainerMistakes}
           trainerIndex={trainerIndex}
           onTrainerAttempt={handleTrainerAttempt}
        />
        <RightPanel
          moves={moves}
          selectedMove={selectedMove}
          depth={selectedMove.depth}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          analysis={analysis}
          startEngineLines={startEngineLines}
          isStartPosition={isStartPosition}
          setSelectedPly={setSelectedPly}
          altFen={altFen}
          showBestMoveArrow={showBestMoveArrow}
          onToggleBestMoveArrow={toggleBestMoveArrow}
          onToggleLiveEngine={exitWhatIfMode}
          onPlayBestMove={playBestMove}
          onSelectAltLine={(fen, san) => {
            if (!fen || isLiveActive) return;
            if (selectedPly >= moves.length - 1) return;
            const boardFen = isStartPosition ? STARTING_FEN : selectedMove.fenAfter;
            const nextGameMove = moves[selectedPly + 1];
            if (nextGameMove && nextGameMove.san === san) {
              setSelectedPly(nextGameMove.ply);
              return;
            }
            try {
              const chess = new Chess(boardFen);
              const move = chess.move(san);
              const nextFen = fen || chess.fen();
              const sessionId = whatIf.createSession(nextFen, move.san, move.from, move.to, {
                fenBefore: boardFen,
                scoreBefore: isStartPosition ? 0 : selectedMove.score,
              });
              setPendingMoveData({ san: move.san, from: move.from, to: move.to, fen: nextFen });
              whatIfSessionOrderRef.current = [sessionId];
            } catch { /* ignore */ }
          }}
          onShowLine={(fen, san) => {
            try {
              const chess = new Chess(fen);
              const move = chess.move(san);
              const nextFen = chess.fen();
              const sessionId = whatIf.createSession(nextFen, move.san, move.from, move.to, {
                fenBefore: fen,
                scoreBefore: isStartPosition ? 0 : selectedMove.score,
              });
              setPendingMoveData({ san: move.san, from: move.from, to: move.to, fen: nextFen });
              whatIfSessionOrderRef.current = [sessionId];
            } catch { /* ignore */ }
          }}
          clearAltLine={exitWhatIfMode}
          avatarUrls={avatarUrls}
          whatIfMoves={whatIfMoves}
          whatIfSelectedIdx={whatIfSelectedIdx}
          whatIfGraphValues={whatIfGraphValues}
          onSelectWhatIfMove={onSelectWhatIfMove}
          llmAnalysis={llmAnalysis}
          llmLoading={llmLoading}
          currentSession={whatIf.currentSession}
          isTrainerMode={isTrainerMode}
          trainerMistakes={trainerMistakes}
          trainerIndex={trainerIndex}
          trainerStatus={trainerStatus}
          trainerAttempt={trainerAttempt}
          onTrainerAttempt={handleTrainerAttempt}
          onTrainerNext={handleTrainerNext}
          onTrainerRetry={handleTrainerRetry}
          onTrainerExit={handleTrainerExit}
          onStartTrainer={startTrainer}
        />
      </div>
      <div className="fixed left-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-[#242321]/95 px-3 py-2 lg:hidden">
        <ChessforkLogo className="size-7" />
        <span className="text-sm font-bold">Chessfork</span>
        <span className="ml-2 text-xs text-stone-500">{resultLabel(analysis.result)}</span>
      </div>
      {showWhatsNew && <WhatsNewDialog onClose={() => setShowWhatsNew(false)} />}
    </div>
  );
}
