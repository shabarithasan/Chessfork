"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Chess } from "chess.js";
import type { Arrow } from "react-chessboard";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChessKing,
  CircleAlert,
  Clipboard,
  Copy,
  FlipHorizontal2,
  Home,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  SkipBack,
  SkipForward,
  Swords,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";

import { detectOpeningFromPgn } from "@/lib/chess/eco-database";
import { formatOpeningName } from "@/lib/chess/openings";
import { readHeaders } from "@/lib/chess/pgn";
import { mergeGamePages } from "@/lib/chess/game-utils";
import { winProbabilityFromCentipawns } from "@/lib/chess/rating";
import { recordAnalysisAndCheckBadges, recordShareAndCheckBadges } from "@/lib/badgeChecker";
import { hashAnalysisInput, readCachedAnalysis, writeCachedAnalysis } from "@/lib/client/analysis-cache";
import { saveGuestAnalysis } from "@/lib/guestSession";
import { cn } from "@/lib/utils";
import type {
  AnalysisRun,
  ImportGameLibraryFilters,
  ImportGameLibraryResponse,
  ImportGameResultFilter,
  ImportableGameOption,
  MoveEvaluation,
  MoveGrade,
  OpeningTag,
} from "@/types/platform";

import type { WinProbabilityPoint } from "@/components/review/win-probability-chart";

const LazyWinProbabilityChart = dynamic(
  () => import("@/components/review/win-probability-chart").then((module) => module.WinProbabilityChart),
  {
    loading: () => <div className="h-56 animate-pulse rounded-[1rem] bg-white/[0.05]" />,
    ssr: false,
  },
);

const LazyReviewBoard = dynamic(() => import("@/components/review/review-board").then((module) => module.ReviewBoard), {
  loading: () => <div className="aspect-square w-full animate-pulse rounded-xl border border-[#1e1e2e] bg-white/[0.05]" />,
  ssr: false,
});

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const moveGrades: MoveGrade[] = ["Brilliant", "Great", "Best", "Excellent", "Good", "Book", "Inaccuracy", "Mistake", "Blunder"];

type AnalysisResponse = {
  analysisId: string;
  chartData?: WinProbabilityPoint[];
  elapsedMs?: number;
  message: string;
  report: AnalysisRun;
  shareUrl: string;
};

type ReviewMode = "deep" | "quick";

type ImportBrowserResponse = Partial<ImportGameLibraryResponse> & {
  analysisId?: string;
  message?: string;
  pgn?: string;
  shareUrl?: string;
};

const defaultBrowserFilters: ImportGameLibraryFilters = {
  search: "",
  result: "all",
  timeClass: "all",
};

function normalizeBrowserUsername(value: string) {
  return value.trim().toLowerCase();
}

async function readBrowserResponse(response: Response) {
  const body = await response.text();

  try {
    return JSON.parse(body) as ImportBrowserResponse;
  } catch {
    return { message: body || "The server returned an unreadable response." } as ImportBrowserResponse;
  }
}

function formatPlayedShort(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function describeOutcome(game: ImportableGameOption) {
  const side = game.playerColor === "white" ? "as White" : "as Black";

  if (game.outcome === "win") return `Won ${side}`;
  if (game.outcome === "loss") return `Lost ${side}`;
  return `Drew ${side}`;
}

function describeGameLine(game: Pick<ImportableGameOption, "black" | "result" | "white">) {
  if (game.result === "1-0") return `${game.white} won`;
  if (game.result === "0-1") return `${game.black} won`;
  return "Draw";
}

function ratingLineValue(game: Pick<ImportableGameOption, "blackRating" | "playerColor" | "whiteRating">) {
  const playerRating = game.playerColor === "white" ? game.whiteRating : game.blackRating;
  const opponentRating = game.playerColor === "white" ? game.blackRating : game.whiteRating;

  if (!playerRating && !opponentRating) {
    return null;
  }

  return `${playerRating ?? "?"} vs ${opponentRating ?? "?"}`;
}

type PreviewMove = Pick<MoveEvaluation, "fenAfter" | "fenBefore" | "from" | "moveNumber" | "ply" | "san" | "side" | "to">;

type StreamHandshake = {
  moveCount: number;
  opening: OpeningTag;
  sessionId: string;
};

type StreamMoveEvent = {
  bestMove: string;
  cpLoss: number;
  grade: MoveGrade;
  move: MoveEvaluation;
  moveIndex: number;
  progress: number;
  totalMoves: number;
};

type ContextMenuState = {
  square: string | null;
  x: number;
  y: number;
} | null;

const gradeClasses: Record<MoveGrade, string> = {
  Best: "border-[#22c55e]/30 bg-[#22c55e]/14 text-emerald-50",
  Brilliant: "border-cyan-300/30 bg-cyan-400/18 text-cyan-50",
  Book: "border-white/10 bg-white/[0.035] text-slate-200",
  Blunder: "border-[#ef4444]/45 bg-[#ef4444]/22 font-bold text-red-50",
  Excellent: "border-[#22c55e]/30 bg-[#22c55e]/18 text-green-50",
  Good: "border-white/10 bg-white/[0.02] text-slate-200",
  Great: "border-[#22c55e]/30 bg-[#22c55e]/16 text-green-50",
  Inaccuracy: "border-[#f59e0b]/45 bg-[#f59e0b]/18 text-amber-50",
  Mistake: "border-[#f97316]/45 bg-[#f97316]/24 font-bold text-orange-50",
};

const gradeDotClasses: Record<MoveGrade, string> = {
  Best: "bg-[#22c55e]",
  Brilliant: "bg-[#00c2ff]",
  Book: "bg-slate-500",
  Blunder: "bg-[#ef4444]",
  Excellent: "bg-[#22c55e]",
  Good: "bg-slate-300",
  Great: "bg-[#22c55e]",
  Inaccuracy: "bg-[#f59e0b]",
  Mistake: "bg-[#f97316]",
};

function evaluationLabel(score?: number) {
  if (typeof score !== "number") {
    return "0.00";
  }

  if (Math.abs(score) > 99_000) {
    return score > 0 ? "+M" : "-M";
  }

  const pawnScore = score / 100;
  const sign = pawnScore > 0 ? "+" : "";
  return `${sign}${pawnScore.toFixed(Math.abs(pawnScore) >= 10 ? 1 : 2)}`;
}

function formatCpLossValue(cpLoss: number) {
  if (!Number.isFinite(cpLoss)) {
    return "0";
  }

  return Math.max(0, Math.round(cpLoss)).toString();
}

function buildPreviewMoves(pgn: string): PreviewMove[] {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const replay = new Chess();

    return chess.history({ verbose: true }).map((move, index) => {
      const fenBefore = replay.fen();
      const turn = replay.turn();
      replay.move(move);

      return {
        fenAfter: replay.fen(),
        fenBefore,
        from: move.from,
        moveNumber: Math.floor(index / 2) + 1,
        ply: index + 1,
        san: move.san,
        side: turn === "w" ? "white" : "black",
        to: move.to,
      };
    });
  } catch {
    return [];
  }
}

function previewFen(previewMoves: PreviewMove[], currentPly: number) {
  if (currentPly <= 0) {
    return STARTING_FEN;
  }

  return previewMoves[currentPly - 1]?.fenAfter ?? STARTING_FEN;
}

function sanToArrow(fen: string, san?: string, color = "#00d4aa"): Arrow | null {
  if (!san) {
    return null;
  }

  try {
    const chess = new Chess(fen);
    const move = chess.move(san);

    if (!move) {
      return null;
    }

    return {
      color,
      endSquare: move.to,
      startSquare: move.from,
    };
  } catch {
    return null;
  }
}

type DisplayMove = MoveEvaluation | PreviewMove;

function isEvaluatedMove(move: DisplayMove): move is MoveEvaluation {
  return "grade" in move;
}

function groupMoves(moves: DisplayMove[]) {
  const grouped = new Map<number, { black?: DisplayMove; white?: DisplayMove }>();

  for (const move of moves) {
    const entry = grouped.get(move.moveNumber) ?? {};
    entry[move.side] = move;
    grouped.set(move.moveNumber, entry);
  }

  return [...grouped.entries()].map(([moveNumber, pair]) => ({ moveNumber, ...pair }));
}

function buildChartData(report: AnalysisRun): WinProbabilityPoint[] {
  return report.moveEvaluations.map((move) => ({
    evaluation: Math.max(-8, Math.min(8, move.score / 100)),
    move: `${move.moveNumber}${move.side === "white" ? "." : "..."} ${move.san}`,
    ply: move.ply,
    winProbability: Math.round(winProbabilityFromCentipawns(move.score) * 100),
  }));
}

function countGrades(moves: DisplayMove[], side: "black" | "white") {
  const counts = Object.fromEntries(moveGrades.map((grade) => [grade, 0])) as Record<MoveGrade, number>;

  for (const move of moves) {
    if (isEvaluatedMove(move) && move.side === side) {
      counts[move.grade] += 1;
    }
  }

  return counts;
}

const MoveList = memo(function MoveList({
  currentPly,
  moves,
  onSelectMove,
  totalMoves,
}: {
  currentPly: number;
  moves: DisplayMove[];
  onSelectMove: (ply: number) => void;
  totalMoves: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const groupedMoves = useMemo(() => groupMoves(moves), [moves]);

  useEffect(() => {
    containerRef.current
      ?.querySelector<HTMLButtonElement>(`[data-ply="${currentPly}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentPly]);

  return (
    <aside ref={containerRef} className="max-h-[34rem] w-full overflow-y-auto rounded-xl border border-[#1e1e2e] bg-[#111118] p-3 shadow-[0_0_20px_rgba(0,212,170,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <p className="text-sm font-semibold text-white">Move list</p>
        <p className="font-mono text-xs text-slate-500">
          {moves.filter(isEvaluatedMove).length}/{totalMoves || moves.length} plies
        </p>
      </div>
      <div className="grid gap-2">
        {groupedMoves.map((pair) => (
          <div key={pair.moveNumber} className="grid grid-cols-2 gap-2">
            {(["white", "black"] as const).map((side) => {
              const move = pair[side];
              if (!move) {
                return <div key={side} />;
              }

              const active = currentPly === move.ply;
              const evaluated = isEvaluatedMove(move);
              const winProbability = evaluated ? Math.round(winProbabilityFromCentipawns(move.score) * 100) : 50;

              return (
                <button
                  key={move.ply}
                  data-ply={move.ply}
                  type="button"
                  onClick={() => onSelectMove(move.ply)}
                  className={cn(
                    "relative min-h-11 overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition hover:scale-[1.01]",
                    evaluated ? gradeClasses[move.grade] : "border-white/10 bg-white/[0.025] text-slate-300",
                    active ? "border-l-4 border-l-[#00d4aa] bg-[#00d4aa]/10 ring-1 ring-[#00d4aa]/45" : "",
                  )}
                >
                  <span className="relative z-10 flex min-w-0 items-center gap-1.5">
                    {evaluated && move.grade === "Brilliant" ? <span className="text-cyan-200">*</span> : null}
                    <span className="shrink-0 text-xs text-slate-400">{move.moveNumber}.</span>
                    <span className="min-w-0 truncate">{move.san}</span>
                    {!evaluated ? <span className="ml-auto h-2 w-10 animate-pulse rounded-full bg-white/15" /> : null}
                  </span>
                  {evaluated ? (
                    <span
                      className={cn("absolute inset-x-0 bottom-0 h-px", move.score >= 0 ? "bg-white" : "bg-black")}
                      style={{ width: `${move.score >= 0 ? winProbability : 100 - winProbability}%` }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
});

function ReviewStats({ moves }: { moves: DisplayMove[] }) {
  const whiteCounts = countGrades(moves, "white");
  const blackCounts = countGrades(moves, "black");

  return (
    <div className="grid gap-3">
      {moveGrades.map((grade) => (
        <div key={grade} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="flex items-center gap-2 text-sm text-slate-200">
            <span className={cn("size-2 rounded-full", gradeDotClasses[grade])} />
            {grade}
          </span>
          <span className="rounded-full bg-white/[0.05] px-2 py-1 text-xs text-slate-300">W {whiteCounts[grade]}</span>
          <span className="rounded-full bg-white/[0.05] px-2 py-1 text-xs text-slate-300">B {blackCounts[grade]}</span>
        </div>
      ))}
    </div>
  );
}

function accuracyTone(score: number) {
  if (score > 90) {
    return "#22c55e";
  }

  if (score >= 70) {
    return "#f59e0b";
  }

  return "#ef4444";
}

function AccuracyRing({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const color = accuracyTone(score);
  const value = Math.max(0, Math.min(100, score));

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-white/[0.035] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div
        className="mx-auto grid size-24 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${value * 3.6}deg, rgba(148,163,184,0.14) 0deg)`,
          boxShadow: `0 0 22px ${color}24`,
        }}
      >
        <div className="grid size-[4.75rem] place-items-center rounded-full border border-white/10 bg-[#0a0a0f]">
          <span className="font-mono text-xl font-bold text-white">{score.toFixed(1)}%</span>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    </div>
  );
}

export function GameReviewPage({ initialPgn = "" }: { initialPgn?: string }) {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<ReviewMode>("quick");
  const [progress, setProgress] = useState(0);
  const [showBestLine, setShowBestLine] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [streamOpening, setStreamOpening] = useState<OpeningTag | null>(null);
  const [streamedMoves, setStreamedMoves] = useState<Map<number, MoveEvaluation>>(() => new Map());
  const boardTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  const [pgn, setPgn] = useState(initialPgn);
  const [showPicker, setShowPicker] = useState(initialPgn.length === 0);
  const [pickerTab, setPickerTab] = useState<"pgn" | "chesscom">("chesscom");
  const [pgnDraft, setPgnDraft] = useState("");
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [browserMessage, setBrowserMessage] = useState<string | null>(null);
  const [browserUsername, setBrowserUsername] = useState("");
  const [loadedUsername, setLoadedUsername] = useState<string | null>(null);
  const [archiveGames, setArchiveGames] = useState<ImportableGameOption[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [filteredGameCount, setFilteredGameCount] = useState(0);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [gameStats, setGameStats] = useState<ImportGameLibraryResponse["stats"] | null>(null);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveResultFilter, setArchiveResultFilter] = useState<ImportGameResultFilter>("all");
  const [archiveTimeFilter, setArchiveTimeFilter] = useState("all");
  const [appliedArchiveFilters, setAppliedArchiveFilters] = useState<ImportGameLibraryFilters>(defaultBrowserFilters);
  const [isFetchingArchive, setIsFetchingArchive] = useState(false);
  const [isLoadingGame, setIsLoadingGame] = useState(false);

  const normalizedBrowserUsername = normalizeBrowserUsername(browserUsername);
  const canBrowse = normalizedBrowserUsername.length >= 2;
  const hasLoadedLibrary = loadedUsername === normalizedBrowserUsername && gameStats !== null;
  const selectedArchiveGame = archiveGames.find((game) => game.id === selectedGameId) ?? archiveGames[0] ?? null;
  const hasPendingFilterChanges =
    hasLoadedLibrary &&
    (appliedArchiveFilters.search !== archiveSearch.trim() ||
      appliedArchiveFilters.result !== archiveResultFilter ||
      appliedArchiveFilters.timeClass !== archiveTimeFilter);
  const archiveTimeClassOptions = gameStats?.timeClasses ?? [];

  const previewMoves = useMemo(() => buildPreviewMoves(pgn), [pgn]);
  const previewHeaders = useMemo(() => readHeaders(pgn), [pgn]);
  const instantOpening = useMemo(() => {
    try {
      return detectOpeningFromPgn(pgn);
    } catch {
      return {
        eco: previewHeaders.ECO ?? "A00",
        name: previewHeaders.Opening ?? "Identifying opening",
      } satisfies OpeningTag;
    }
  }, [pgn, previewHeaders.ECO, previewHeaders.Opening]);

  useEffect(() => {
    let cancelled = false;
    let completed = false;
    let eventSource: EventSource | null = null;

    async function analyzeProgressively() {
      try {
        setAnalysis(null);
        setError(null);
        setElapsedMs(null);
        setProgress(1);
        setStatus("⚡ Identifying opening...");
        setStreamOpening(instantOpening);
        setStreamedMoves(new Map());

        if (pgn.trim().length < 10) {
          return;
        }

        const cacheKey = await hashAnalysisInput(pgn, mode);
        const cached = await readCachedAnalysis(cacheKey);

        if (cancelled) {
          return;
        }

        if (cached) {
          setAnalysis(cached as AnalysisResponse);
          setElapsedMs(cached.elapsedMs ?? 0);
          setProgress(100);
          setStatus("✓ Loaded cached analysis instantly.");
          setStreamOpening(cached.report.opening);
          setStreamedMoves(new Map(cached.report.moveEvaluations.map((move, index) => [index, move])));
          recordAnalysisAndCheckBadges(cached.report, cached.elapsedMs);
          saveGuestAnalysis(cached.report);
          return;
        }

        const sessionResponse = await fetch("/api/analyze-stream", {
          body: JSON.stringify({ mode, pgn }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const session = (await sessionResponse.json()) as StreamHandshake | { message?: string };

        if (!sessionResponse.ok || !("sessionId" in session)) {
          throw new Error("message" in session ? session.message : "Analysis stream could not start.");
        }

        setStreamOpening(session.opening);
        setStatus("🔍 Analyzing with Stockfish 18...");
        setProgress(2);

        eventSource = new EventSource(`/api/analyze-stream?sessionId=${encodeURIComponent(session.sessionId)}`);
        eventSource.addEventListener("opening", (event) => {
          const payload = JSON.parse((event as MessageEvent<string>).data) as Pick<StreamHandshake, "moveCount" | "opening">;
          setStreamOpening(payload.opening);
        });
        eventSource.addEventListener("move", (event) => {
          const payload = JSON.parse((event as MessageEvent<string>).data) as StreamMoveEvent;

          setStreamedMoves((moves) => {
            const nextMoves = new Map(moves);
            nextMoves.set(payload.moveIndex, payload.move);
            return nextMoves;
          });
          setProgress(payload.progress);
          setStatus(`🔍 Analyzing move ${payload.moveIndex + 1} of ${payload.totalMoves}...`);
        });
        eventSource.addEventListener("complete", (event) => {
          const data = JSON.parse((event as MessageEvent<string>).data) as AnalysisResponse;

          if (cancelled) {
            return;
          }

          completed = true;
          setAnalysis(data);
          setElapsedMs(data.elapsedMs ?? null);
          setProgress(100);
          setStatus(`✓ Analyzed in ${((data.elapsedMs ?? 0) / 1000).toFixed(1)}s`);
          setStreamOpening(data.report.opening);
          setStreamedMoves(new Map(data.report.moveEvaluations.map((move, index) => [index, move])));
          recordAnalysisAndCheckBadges(data.report, data.elapsedMs);
          saveGuestAnalysis(data.report);
          void writeCachedAnalysis(cacheKey, data);
          eventSource?.close();
        });
        eventSource.addEventListener("error", (event) => {
          if (event instanceof MessageEvent && event.data) {
            const payload = JSON.parse(event.data) as { message?: string };
            setError(payload.message ?? "Analysis failed.");
            eventSource?.close();
            return;
          }

          if (eventSource?.readyState === EventSource.CLOSED && !completed) {
            setError("Analysis stream closed before the report was ready.");
          }
        });
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Analysis failed.");
        }
      }
    }

    void analyzeProgressively();

    return () => {
      cancelled = true;
      eventSource?.close();
    };
  }, [pgn, instantOpening, mode]);

  const report = analysis?.report ?? null;
  const displayMoves = useMemo<DisplayMove[]>(() => {
    const evaluatedMoves = report?.moveEvaluations ?? [];
    const sourceMoves = previewMoves.length > 0 ? previewMoves : evaluatedMoves;

    return sourceMoves.map((move, index) => streamedMoves.get(index) ?? evaluatedMoves[index] ?? move);
  }, [previewMoves, report?.moveEvaluations, streamedMoves]);
  const evaluatedDisplayMoves = useMemo(() => displayMoves.filter(isEvaluatedMove), [displayMoves]);
  const maxPly = displayMoves.length;
  const fen = currentPly > 0 ? displayMoves[currentPly - 1]?.fenAfter ?? previewFen(previewMoves, currentPly) : STARTING_FEN;
  const currentMove = currentPly > 0 ? displayMoves[currentPly - 1] : undefined;
  const nextDisplayMove = displayMoves[currentPly];
  const arrowSourceMove = nextDisplayMove && isEvaluatedMove(nextDisplayMove) ? nextDisplayMove : currentMove && isEvaluatedMove(currentMove) ? currentMove : undefined;
  const chartData = useMemo(() => {
    if (report) {
      return buildChartData(report);
    }

    return evaluatedDisplayMoves.map((move) => ({
      evaluation: Math.max(-8, Math.min(8, move.score / 100)),
      move: `${move.moveNumber}${move.side === "white" ? "." : "..."} ${move.san}`,
      ply: move.ply,
      winProbability: Math.round(winProbabilityFromCentipawns(move.score) * 100),
    }));
  }, [evaluatedDisplayMoves, report]);
  const opening = report?.opening ?? streamOpening ?? instantOpening;
  const openingName = formatOpeningName(opening);
  const whiteName = report?.white ?? previewHeaders.White ?? "White";
  const blackName = report?.black ?? previewHeaders.Black ?? "Black";
  const resultLabel = report?.result ?? previewHeaders.Result ?? "*";
  const playedAtLabel = report?.playedAt ?? previewHeaders.Date ?? "PGN";
  const isAnalyzing = !analysis && !error;
  const currentEvaluation = currentMove && isEvaluatedMove(currentMove) ? currentMove : undefined;
  const arrows = useMemo(() => {
    if (!arrowSourceMove) {
      return [];
    }

    return [
      sanToArrow(fen, arrowSourceMove.engineLines?.[0]?.san ?? arrowSourceMove.bestMove, "rgba(0, 212, 170, 0.94)"),
      sanToArrow(fen, arrowSourceMove.engineLines?.[1]?.san, "rgba(0, 212, 170, 0.56)"),
      sanToArrow(fen, arrowSourceMove.engineLines?.[2]?.san, "rgba(0, 212, 170, 0.38)"),
    ].filter((arrow): arrow is Arrow => Boolean(arrow));
  }, [arrowSourceMove, fen]);
  const bestLine = arrowSourceMove?.engineLines?.[0]?.line ?? arrowSourceMove?.principalVariation ?? [];

  const goToPly = useCallback(
    (ply: number) => {
      setCurrentPly(Math.max(0, Math.min(maxPly, ply)));
      setContextMenu(null);
    },
    [maxPly],
  );

  const handleBoardTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) {
      boardTouchStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    boardTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleBoardTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const start = boardTouchStartRef.current;
      boardTouchStartRef.current = null;

      if (!start || event.changedTouches.length !== 1) {
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;

      if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
        return;
      }

      goToPly(currentPly + (deltaX < 0 ? 1 : -1));
    },
    [currentPly, goToPly],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPly(currentPly - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToPly(currentPly + 1);
      } else if (event.key === " ") {
        event.preventDefault();
        setAutoPlay((value) => !value);
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFlipped((value) => !value);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPly, goToPly]);

  useEffect(() => {
    if (!autoPlay || maxPly === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentPly((value) => {
        if (value >= maxPly) {
          setAutoPlay(false);
          return value;
        }

        return value + 1;
      });
    }, 900 / speed);

    return () => window.clearInterval(timer);
  }, [autoPlay, maxPly, speed]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    function closeMenu() {
      setContextMenu(null);
    }

    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [contextMenu]);

  async function copyText(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(message);
    } catch {
      setStatus("Copy is unavailable in this browser.");
    }
  }

  function resetArchiveLibrary() {
    setLoadedUsername(null);
    setArchiveGames([]);
    setSelectedGameId(null);
    setFilteredGameCount(0);
    setNextPage(null);
    setGameStats(null);
    setAppliedArchiveFilters(defaultBrowserFilters);
    setBrowserMessage(null);
    setBrowserError(null);
  }

  async function loadArchiveGames(options?: { append?: boolean; page?: number }) {
    if (!canBrowse) {
      setBrowserError("Enter a Chess.com username first.");
      return;
    }

    const page = options?.page ?? 0;
    setIsFetchingArchive(true);
    setBrowserError(null);

    try {
      const response = await fetch("/api/import/chesscom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: normalizedBrowserUsername,
          intent: "list",
          requestedDepth: "quick",
          page,
          pageSize: 24,
          search: archiveSearch.trim() || undefined,
          result: archiveResultFilter,
          timeClass: archiveTimeFilter !== "all" ? archiveTimeFilter : undefined,
        }),
      });

      const data = await readBrowserResponse(response);

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to fetch Chess.com games.");
      }

      const incomingGames = data.games ?? [];
      const nextGames = options?.append ? mergeGamePages(archiveGames, incomingGames) : incomingGames;

      setArchiveGames(nextGames);
      setSelectedGameId((current) => (current && nextGames.some((game) => game.id === current) ? current : nextGames[0]?.id ?? null));
      setLoadedUsername(normalizedBrowserUsername);
      setFilteredGameCount(data.filteredCount ?? nextGames.length);
      setNextPage(data.hasMore ? (data.page ?? page) + 1 : null);
      setGameStats(data.stats ?? null);
      setAppliedArchiveFilters(
        data.filters ?? {
          search: archiveSearch.trim(),
          result: archiveResultFilter,
          timeClass: archiveTimeFilter,
        },
      );
      setBrowserMessage(
        data.message ??
          (nextGames.length > 0
            ? `Loaded ${Math.min(nextGames.length, data.filteredCount ?? nextGames.length)} games for ${normalizedBrowserUsername}.`
            : `No public Chess.com games matched ${normalizedBrowserUsername}.`),
      );
    } catch (error) {
      resetArchiveLibrary();
      setBrowserMessage(null);
      setBrowserError(error instanceof Error ? error.message : "Unable to import Chess.com games.");
    } finally {
      setIsFetchingArchive(false);
    }
  }

  async function reviewArchivedGame(game: ImportableGameOption) {
    if (!game.archiveUrl) {
      setBrowserError("This game does not have a playable record. Try another game.");
      return;
    }

    setIsLoadingGame(true);
    setBrowserError(null);
    setBrowserMessage(null);

    try {
      const response = await fetch("/api/import/chesscom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: normalizedBrowserUsername,
          archiveUrl: game.archiveUrl,
          gameId: game.id,
          intent: "fetch-pgn",
          requestedDepth: "quick",
        }),
      });

      const data = await readBrowserResponse(response);

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to load the selected game.");
      }

      const gamePgn = data.pgn ?? (data.analysisId ? data.message : null);
      if (!gamePgn) {
        throw new Error("The selected game did not return a playable PGN.");
      }

      setCurrentPly(0);
      setProgress(0);
      setShowPicker(false);
      setPgn(gamePgn);
    } catch (error) {
      setBrowserError(error instanceof Error ? error.message : "Unable to load the selected game.");
    } finally {
      setIsLoadingGame(false);
    }
  }

  function reviewPgnDraft() {
    if (pgnDraft.trim().length < 10) {
      setBrowserError("Paste a longer PGN before reviewing.");
      return;
    }

    setPgn(pgnDraft.trim());
    setShowPicker(false);
    setCurrentPly(0);
    setProgress(0);
  }

  const openPicker = useCallback(() => {
    setShowPicker(true);
    setBrowserError(null);
    setBrowserMessage(null);
  }, []);

  if (error) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center px-4 py-10">
        <div className="rounded-xl border border-red-400/25 bg-[#111118] p-6 text-white shadow-[0_0_20px_rgba(239,68,68,0.12),0_28px_90px_rgba(0,0,0,0.4)]">
          <div className="grid size-12 place-items-center rounded-lg border border-red-400/25 bg-red-400/10 text-red-200">
            <CircleAlert className="size-6" />
          </div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-red-300">Analysis failed</p>
          <h1 className="mt-3 text-3xl font-semibold">The PGN could not be reviewed.</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">{error}</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#00d4aa] px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(0,212,170,0.2)]">
            <Home className="size-4" />
            Back home
          </Link>
        </div>
      </section>
    );
  }

  if (showPicker) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center px-4 py-10">
        <div className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-4 shadow-[0_0_20px_rgba(0,212,170,0.12),0_28px_90px_rgba(0,0,0,0.38)] sm:p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#00d4aa]">Game review</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Pick the game to review</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Paste a PGN, or browse a public Chess.com archive and narrow it down to the exact game you want to review.
              </p>
            </div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#00d4aa]">
              <ArrowLeft className="size-4" />
              Back home
            </Link>
          </header>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {(["pgn", "chesscom"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setPickerTab(tab);
                  setBrowserError(null);
                  setBrowserMessage(null);
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition active:scale-[0.97]",
                  pickerTab === tab
                    ? "bg-[#00d4aa] text-slate-950"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:text-white",
                )}
              >
                {tab === "pgn" ? <Clipboard className="size-4" /> : <Search className="size-4" />}
                {tab === "pgn" ? "Paste PGN" : "Chess.com archive"}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-5">
            {pickerTab === "pgn" ? (
              <div className="space-y-3">
                <textarea
                  value={pgnDraft}
                  onChange={(event) => {
                    setPgnDraft(event.target.value);
                    setBrowserError(null);
                  }}
                  placeholder="Paste a full PGN here, then review it move by move with Stockfish."
                  className="min-h-56 w-full rounded-xl border border-neutral-800 bg-[#111118] px-4 py-4 text-sm leading-6 text-neutral-100 outline-none transition focus:border-[#00d4aa]/70"
                />
                <button
                  type="button"
                  onClick={reviewPgnDraft}
                  className="rounded-lg bg-[#00d4aa] px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(0,212,170,0.2)] transition hover:bg-[#26e8c1] active:scale-[0.98]"
                >
                  Review PGN
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    value={browserUsername}
                    onChange={(event) => {
                      setBrowserUsername(event.target.value);
                      setBrowserError(null);
                      resetArchiveLibrary();
                    }}
                    placeholder="Enter a Chess.com username, e.g. MagnusCarlsen"
                    className="h-14 w-full rounded-xl border border-neutral-800 bg-[#111118] px-4 text-sm text-neutral-100 outline-none transition focus:border-[#00d4aa]/70"
                  />
                  <button
                    type="button"
                    onClick={() => void loadArchiveGames({ page: 0 })}
                    disabled={!canBrowse || isFetchingArchive}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00d4aa] px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(0,212,170,0.2)] transition hover:bg-[#26e8c1] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isFetchingArchive ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                    Browse archive
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Try it out:</span>
                  {["MagnusCarlsen", "GothamChess", "Hikaru"].map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      onClick={() => {
                        setBrowserUsername(handle);
                        setBrowserError(null);
                        resetArchiveLibrary();
                      }}
                      className="rounded-lg border border-neutral-700 bg-neutral-800/40 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-neutral-700/40"
                    >
                      {handle}
                    </button>
                  ))}
                </div>

                {hasLoadedLibrary ? (
                  <>
                    <div className="grid gap-3 rounded-xl border border-neutral-800 bg-[#111118] p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <input
                        value={archiveSearch}
                        onChange={(event) => {
                          setArchiveSearch(event.target.value);
                          setBrowserError(null);
                        }}
                        placeholder="Search opponent, ECO, opening, or date"
                        className="h-12 min-w-0 rounded-lg border border-neutral-800 bg-[#0a0a0a] px-4 text-sm text-neutral-100 outline-none transition focus:border-[#00d4aa]/70"
                      />
                      <select
                        value={archiveResultFilter}
                        onChange={(event) => setArchiveResultFilter(event.target.value as ImportGameResultFilter)}
                        className="h-12 min-w-0 rounded-lg border border-neutral-800 bg-[#0a0a0a] px-4 text-sm text-neutral-100 outline-none transition focus:border-[#00d4aa]/70"
                      >
                        <option value="all">All results</option>
                        <option value="win">Wins</option>
                        <option value="loss">Losses</option>
                        <option value="draw">Draws</option>
                      </select>
                      <select
                        value={archiveTimeFilter}
                        onChange={(event) => setArchiveTimeFilter(event.target.value)}
                        className="h-12 min-w-0 rounded-lg border border-neutral-800 bg-[#0a0a0a] px-4 text-sm text-neutral-100 outline-none transition focus:border-[#00d4aa]/70"
                      >
                        <option value="all">All time classes</option>
                        {archiveTimeClassOptions.map((timeClass) => (
                          <option key={timeClass} value={timeClass}>
                            {timeClass}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void loadArchiveGames({ page: 0 })}
                        disabled={isFetchingArchive}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:bg-neutral-700/40 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-3"
                      >
                        <RefreshCw className={cn("size-3.5", isFetchingArchive && "animate-spin")} />
                        {hasPendingFilterChanges ? "Apply filters" : "Refresh archive"}
                      </button>
                    </div>

                    {selectedArchiveGame ? (
                      <div className="rounded-lg border border-[#00d4aa]/25 bg-[#00d4aa]/10 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-white">vs {selectedArchiveGame.opponent}</p>
                            <p className="mt-1 break-words text-sm text-[#9fffea]">
                              {selectedArchiveGame.white} vs {selectedArchiveGame.black} / {formatPlayedShort(selectedArchiveGame.playedAt)}
                            </p>
                          </div>
                          <span className="rounded-lg border border-neutral-700 bg-neutral-800/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100">
                            {describeOutcome(selectedArchiveGame)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-lg border border-neutral-700 bg-neutral-800/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                            {selectedArchiveGame.timeClass ?? "chess"} / {selectedArchiveGame.timeControl}
                          </span>
                          {selectedArchiveGame.eco ? (
                            <span className="rounded-lg border border-neutral-700 bg-neutral-800/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                              {selectedArchiveGame.eco}
                            </span>
                          ) : null}
                          {selectedArchiveGame.openingName ? (
                            <span className="rounded-lg border border-neutral-700 bg-neutral-800/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                              {selectedArchiveGame.openingName}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                          <span>{describeGameLine(selectedArchiveGame)}</span>
                          {ratingLineValue(selectedArchiveGame) ? <span>Ratings {ratingLineValue(selectedArchiveGame)}</span> : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => void reviewArchivedGame(selectedArchiveGame)}
                          disabled={isLoadingGame}
                          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#00d4aa] px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(0,212,170,0.2)] transition hover:bg-[#26e8c1] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isLoadingGame ? <Loader2 className="size-4 animate-spin" /> : <Swords className="size-4" />}
                          Review this game
                        </button>
                      </div>
                    ) : null}

                    {filteredGameCount > 0 ? (
                      <div className="space-y-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Showing {archiveGames.length} of {filteredGameCount} matching games
                        </p>
                        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                          {archiveGames.map((game) => (
                            <button
                              key={game.id}
                              type="button"
                              onClick={() => {
                                setSelectedGameId(game.id);
                                setBrowserError(null);
                              }}
                              className={cn(
                                "w-full rounded-lg border p-4 text-left transition",
                                selectedArchiveGame?.id === game.id
                                  ? "border-[#00d4aa]/40 bg-[#00d4aa]/10"
                                  : "border-neutral-800 bg-[#111118] hover:border-neutral-700 hover:bg-neutral-800/40",
                              )}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-white">vs {game.opponent}</p>
                                  <p className="mt-1 break-words text-sm text-slate-400">
                                    {game.white} vs {game.black}
                                  </p>
                                </div>
                                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{formatPlayedShort(game.playedAt)}</span>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-lg border border-neutral-700 bg-neutral-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                                  {describeOutcome(game)}
                                </span>
                                <span className="rounded-lg border border-neutral-700 bg-neutral-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                                  {game.timeClass ?? "chess"}
                                </span>
                                <span className="rounded-lg border border-neutral-700 bg-neutral-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                                  {game.timeControl}
                                </span>
                                {game.eco ? (
                                  <span className="rounded-lg border border-neutral-700 bg-neutral-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                                    {game.eco}
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          ))}
                        </div>

                        {nextPage !== null ? (
                          <button
                            type="button"
                            onClick={() => void loadArchiveGames({ append: true, page: nextPage })}
                            disabled={isFetchingArchive}
                            className="rounded-lg border border-neutral-700 bg-neutral-800/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:bg-neutral-700/40 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isFetchingArchive ? "Loading more..." : "Load 24 more games"}
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm leading-7 text-slate-300">
                        The archive loaded, but nothing matched your current filters. Loosen the search, result, or time-class filters and try again.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm leading-7 text-slate-400">
                    No archive loaded yet. Enter a public username and click <span className="font-semibold text-[#9fffea]">Browse archive</span> to
                    load their recent games, then narrow down by opponent, result, or time class.
                  </p>
                )}

                {gameStats ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Total games", value: gameStats.totalGames.toLocaleString() },
                      { label: "Wins", value: gameStats.wins.toLocaleString() },
                      { label: "Losses", value: gameStats.losses.toLocaleString() },
                      { label: "Draws", value: gameStats.draws.toLocaleString() },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-lg border border-neutral-800 bg-[#111118] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                        <p className="mt-2 text-lg font-semibold text-white">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {browserMessage ? (
                  <div aria-live="polite" className="rounded-lg border border-[#00d4aa]/20 bg-[#00d4aa]/10 p-4 text-sm leading-6 text-[#d8fff6]">
                    {browserMessage}
                  </div>
                ) : null}
                {browserError ? (
                  <div aria-live="polite" className="rounded-lg border border-red-400/25 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
                    {browserError}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen px-0 py-2 text-slate-100 sm:px-2">
      <div className="mx-auto w-full max-w-[1600px] rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-3 shadow-[0_0_20px_rgba(0,212,170,0.1)]">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openPicker}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#00d4aa] transition hover:text-[#26e8c1]"
              >
                <ArrowLeft className="size-4" />
                New review
              </button>
              <span className="rounded-full border border-[#00d4aa]/20 bg-[#00d4aa]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9fffea]">
                Detected: {opening.eco}
              </span>
            </div>
            <h1 className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-2xl font-semibold">
              <span className="min-w-0 truncate">{whiteName}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                <ChessKing className="size-3.5 text-[#00d4aa]" />
                vs
              </span>
              <span className="min-w-0 truncate">{blackName}</span>
            </h1>
            <p className="text-sm text-slate-400">
              {openingName} / {resultLabel} / {playedAtLabel}
            </p>
            <div className="mt-3 max-w-xl">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-400">
                <span>{status ?? (isAnalyzing ? "🔍 Analyzing with Stockfish 18..." : "✓ Analysis ready")}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="analysis-progress-fill h-full rounded-full transition-[width] duration-300" style={{ width: `${progress}%` }} />
              </div>
              {process.env.NODE_ENV !== "production" ? (
                <p className="mt-2 text-xs text-slate-500">
                  Dev perf: {elapsedMs !== null ? `${(elapsedMs / 1000).toFixed(2)}s` : "streaming"} / {mode === "quick" ? "Quick target 5s" : "Deep target 30s"}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={mode}
              onChange={(event) => {
                setAnalysis(null);
                setError(null);
                setCurrentPly(0);
                setProgress(0);
                setMode(event.target.value as ReviewMode);
              }}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white outline-none"
            >
              <option className="bg-slate-950" value="quick">
                Quick (5s)
              </option>
              <option className="bg-slate-950" value="deep">
                Deep (30s)
              </option>
            </select>
            {analysis ? (
              <Link href={analysis.shareUrl} className="rounded-lg bg-[#00d4aa] px-4 py-2 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(0,212,170,0.18)] hover:bg-[#26e8c1]">
                Saved report
              </Link>
            ) : (
              <span className="rounded-lg border border-[#00d4aa]/25 bg-[#00d4aa]/10 px-4 py-2 text-sm font-bold text-[#9fffea]">
                Streaming
              </span>
            )}
          </div>
        </header>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
          <main className="min-w-0">
            <div className="mobile-review-board-shell" onTouchStart={handleBoardTouchStart} onTouchEnd={handleBoardTouchEnd}>
              <LazyReviewBoard
                arrows={arrows}
                currentMove={currentMove}
                fen={fen}
                flipped={flipped}
                onOpenContextMenu={(x, y, square) => setContextMenu({ square, x, y })}
              />
            </div>

            {contextMenu ? (
              <div
                className="fixed z-[60] w-56 rounded-[1rem] border border-white/10 bg-slate-950 p-2 text-white shadow-[0_20px_70px_rgba(0,0,0,0.5)]"
                style={{
                  left: `min(${contextMenu.x}px, calc(100vw - 15rem))`,
                  top: `min(${contextMenu.y}px, calc(100vh - 12rem))`,
                }}
              >
                <button
                  type="button"
                  onClick={() => copyText(fen, "FEN copied.")}
                  className="flex w-full items-center gap-2 rounded-[0.8rem] px-3 py-2 text-left text-sm hover:bg-white/10"
                >
                  <Copy className="size-4" />
                  Copy FEN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFlipped((value) => !value);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-[0.8rem] px-3 py-2 text-left text-sm hover:bg-white/10"
                >
                  <FlipHorizontal2 className="size-4" />
                  Flip board
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBestLine(true);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-[0.8rem] px-3 py-2 text-left text-sm hover:bg-white/10"
                >
                  <Clipboard className="size-4" />
                  Show best line
                </button>
              </div>
            ) : null}

            <div className="mobile-move-nav mt-3 rounded-xl border border-[#1e1e2e] bg-[#111118] p-3 shadow-[0_0_20px_rgba(0,212,170,0.08)]">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button type="button" onClick={() => goToPly(0)} className="rounded-lg border border-white/10 bg-white/5 p-3 text-white hover:border-[#00d4aa]/35 hover:bg-[#00d4aa]/10">
                  <SkipBack className="size-4" />
                </button>
                <button type="button" onClick={() => goToPly(currentPly - 1)} className="rounded-lg border border-white/10 bg-white/5 p-3 text-white hover:border-[#00d4aa]/35 hover:bg-[#00d4aa]/10">
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAutoPlay((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#00d4aa] px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(0,212,170,0.2)] hover:bg-[#26e8c1]"
                >
                  {autoPlay ? <Pause className="size-4" /> : <Play className="size-4" />}
                  {autoPlay ? "Pause" : "Play"}
                </button>
                <button type="button" onClick={() => goToPly(currentPly + 1)} className="rounded-lg border border-white/10 bg-white/5 p-3 text-white hover:border-[#00d4aa]/35 hover:bg-[#00d4aa]/10">
                  <ChevronRight className="size-4" />
                </button>
                <button type="button" onClick={() => goToPly(maxPly)} className="rounded-lg border border-white/10 bg-white/5 p-3 text-white hover:border-[#00d4aa]/35 hover:bg-[#00d4aa]/10">
                  <SkipForward className="size-4" />
                </button>
                <select
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white outline-none"
                >
                  <option className="bg-slate-950" value={0.5}>
                    0.5x
                  </option>
                  <option className="bg-slate-950" value={1}>
                    1x
                  </option>
                  <option className="bg-slate-950" value={2}>
                    2x
                  </option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    void copyText(window.location.href, "Review URL copied.");
                    recordShareAndCheckBadges();
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:border-[#00d4aa]/35 hover:bg-[#00d4aa]/10"
                >
                  <Share2 className="size-4" />
                  Share
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
                <p className="font-mono">
                  Move {currentPly} / {maxPly}
                  {currentMove ? ` / ${currentEvaluation?.grade ?? "Analyzing"} / ${currentMove.san}` : " / Initial position"}
                </p>
                {status ? <p className="text-[#00d4aa]">{status}</p> : null}
              </div>

              {showBestLine ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#00d4aa]/20 bg-[#00d4aa]/10 px-4 py-3">
                  <p className="text-sm text-[#d8fff6]">Best line: {bestLine.length > 0 ? bestLine.join(" ") : "No engine line available."}</p>
                  <button type="button" onClick={() => setShowBestLine(false)} className="text-sm font-semibold text-white">
                    Hide
                  </button>
                </div>
              ) : null}

              <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">FEN</summary>
                <p className="mt-3 break-all font-mono text-xs leading-6 text-slate-300">{fen}</p>
              </details>
            </div>
          </main>

          <aside className="review-analysis-panel max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-[#1e1e2e] bg-[#111118] p-4 shadow-[0_0_20px_rgba(0,212,170,0.1)]">
            <details open className="review-analysis-card rounded-lg border border-[#1e1e2e] bg-white/[0.03] p-4">
              <summary className="review-analysis-summary">
                <span>Players</span>
                <span>{resultLabel}</span>
              </summary>
              <div className="review-analysis-body">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#00d4aa]">Players</p>
                  <div className="mt-3 flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white">{whiteName}</span>
                    <ChessKing className="size-4 shrink-0 text-[#00d4aa]" />
                    <span className="truncate text-sm font-semibold text-white">{blackName}</span>
                  </div>
                </div>
                <span className="rounded-full border border-[#00d4aa]/20 bg-[#00d4aa]/10 px-3 py-1 text-xs font-semibold text-[#9fffea]">
                  {resultLabel}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {report ? (
                  <>
                    <AccuracyRing label="White" score={report.accuracyWhite} />
                    <AccuracyRing label="Black" score={report.accuracyBlack} />
                  </>
                ) : (
                  <>
                    <div className="h-24 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
                    <div className="h-24 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
                  </>
                )}
              </div>
              <div className="mt-3 rounded-full border border-[#00d4aa]/20 bg-[#00d4aa]/10 px-3 py-2 text-center text-xs font-semibold text-[#9fffea]">
                {openingName}
              </div>
              </div>
            </details>

            <details open className="review-analysis-card mt-4 rounded-lg border border-[#1e1e2e] bg-white/[0.03] p-4">
              <summary className="review-analysis-summary">
                <span>Engine evaluation</span>
                <span>{evaluationLabel(currentEvaluation?.score)}</span>
              </summary>
              <div className="review-analysis-body">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">Engine evaluation</p>
                <button type="button" onClick={() => setCurrentPly(0)} className="text-slate-400 hover:text-white">
                  <RotateCcw className="size-4" />
                </button>
              </div>
              <p className="mt-3 font-mono text-4xl font-semibold text-white">{evaluationLabel(currentEvaluation?.score)}</p>
              <p className="mt-2 text-sm text-slate-400">
                Depth {currentEvaluation?.depth ?? 0} / {currentEvaluation?.nodes.toLocaleString() ?? 0} nodes
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{currentEvaluation?.comment ?? "Select a move to inspect engine feedback."}</p>
              </div>
            </details>

            {currentEvaluation ? (
              <details open className="review-analysis-card mt-4 rounded-lg border border-[#1e1e2e] bg-white/[0.03] p-4">
                <summary className="review-analysis-summary">
                  <span>Move detail</span>
                  <span>{currentEvaluation.grade}</span>
                </summary>
                <div className="review-analysis-body">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={cn("rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]", gradeClasses[currentEvaluation.grade])}>
                    {currentEvaluation.grade}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-400">{formatCpLossValue(currentEvaluation.cpLoss)} CPL</span>
                </div>
                <p className="mt-3 text-lg font-semibold text-white">{currentEvaluation.moveNumber}.{currentEvaluation.side === "black" ? ".." : ""} {currentEvaluation.san}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Best move was <span className="font-semibold text-[#00d4aa]">{currentEvaluation.bestMove || "not stored"}</span>.
                </p>
                {bestLine.length > 0 ? (
                  <p className="mt-2 line-clamp-2 font-mono text-xs leading-5 text-slate-500">{bestLine.join(" ")}</p>
                ) : null}
                </div>
              </details>
            ) : null}

            <details open className="review-analysis-card mt-4 rounded-lg border border-[#1e1e2e] bg-white/[0.03] p-4">
              <summary className="review-analysis-summary">
                <span>Move statistics</span>
                <span>{evaluatedDisplayMoves.length}/{maxPly}</span>
              </summary>
              <div className="review-analysis-body">
              <p className="text-sm font-semibold text-white">Move statistics</p>
              <div className="mt-3">
                <ReviewStats moves={displayMoves} />
              </div>
              </div>
            </details>

            <details open className="review-analysis-card mt-4 rounded-lg border border-[#1e1e2e] bg-white/[0.03] p-4">
              <summary className="review-analysis-summary">
                <span>Evaluation graph</span>
                <span>{Math.round(progress)}%</span>
              </summary>
              <div className="review-analysis-body">
              <p className="text-sm font-semibold text-white">Evaluation graph</p>
              <p className="mt-1 text-xs text-slate-500">Click a point to jump to that move.</p>
              <div className="mt-3">
                <LazyWinProbabilityChart data={chartData} onSelectPly={goToPly} />
              </div>
              </div>
            </details>

            <details open className="review-analysis-card mt-4">
              <summary className="review-analysis-summary">
                <span>Move list</span>
                <span>{currentPly}/{maxPly}</span>
              </summary>
              <div className="review-analysis-body">
              <MoveList currentPly={currentPly} moves={displayMoves} onSelectMove={goToPly} totalMoves={maxPly} />
              </div>
            </details>
          </aside>
        </div>
      </div>
    </section>
  );
}
