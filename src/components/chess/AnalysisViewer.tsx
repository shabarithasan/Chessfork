"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Swords, Loader2, AlertTriangle, Zap, Target } from "lucide-react";

import { FullAnalysisBoard } from "./FullAnalysisBoard";
import { MoveList } from "./MoveList";
import EvaluationGraph from "./EvaluationGraph";
import { TabPanel } from "./TabPanel";
import { PGNLoader } from "./PGNLoader";
import { AnalysisPanel, type AnalysisPanelMove } from "./AnalysisPanel";
import { KeyboardHints } from "./KeyboardHints";
import type { MoveArrowInfo } from "./MoveArrow";
import type { GameHeaders, ParsedMove } from "@/lib/pgn-parser";
import { getFenAtMove } from "@/lib/pgn-parser";
import { Chess } from "chess.js";
import type { GameAnalysis } from "@/lib/game-analyzer";
import type { GameReport } from "@/lib/report-generator";
import type { AnalysisProgress } from "@/lib/analysis-engine";

type TabId = "report" | "analysis" | "coach" | "insights" | "openings";
type AppStatus = "loading" | "pgn" | "analyzing" | "done";

interface AnalyzeGameResponse {
  gameData: GameHeaders;
  moves: ParsedMove[];
  analysis: GameAnalysis;
  report: GameReport;
}

interface AnalyzeResponse {
  eval: number;
  mate: number | null;
  bestMove: string;
  bestLine: string[];
  depth: number;
  topMoves?: Array<{
    from: string;
    to: string;
    san: string;
    eval: number;
    mate: number | null;
    line: string[];
  }>;
}

function EvalBadge({ value }: { value: number }) {
  const color = value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-slate-400";
  return (
    <span className={`font-mono text-xs font-bold ${color}`}>
      {value > 0 ? "+" : ""}{value.toFixed(1)}
    </span>
  );
}

function PhaseCard({ phase, index }: { phase: GameReport["phases"][0]; index: number }) {
  const colors = [
    "border-l-cyan-500",
    "border-l-violet-500",
    "border-l-amber-500",
  ];
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`rounded-lg border border-[#2a2a2a] border-l-2 bg-[#1a1a1a] p-3 ${colors[index]}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-white">{phase.name}</span>
        <span className="text-[10px] text-slate-500">
          Ply {phase.startPly}–{phase.endPly}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <span className="text-slate-500">White:</span>{" "}
          <span className="text-green-400 font-semibold">{phase.whiteAccuracy}%</span>
        </div>
        <div>
          <span className="text-slate-500">Black:</span>{" "}
          <span className="text-red-400 font-semibold">{phase.blackAccuracy}%</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <AlertTriangle className="size-2.5" /> {phase.blunders + phase.mistakes} errors
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <Target className="size-2.5" /> {phase.inaccuracies} inaccuracies
        </div>
      </div>
    </motion.div>
  );
}

function PlayerStatCard({ label, stats, color }: { label: string; stats: GameReport["players"]["white"]; color: string }) {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`size-2 rounded-full ${color}`} />
        <span className="text-xs font-bold text-white">{label}</span>
      </div>
      <div className="space-y-1.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-slate-500">Accuracy</span>
          <span className="font-bold text-white">{stats.accuracy}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Avg CP Loss</span>
          <span className="font-mono text-white">{stats.avgCpLoss}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Blunders</span>
          <span className="text-red-400 font-semibold">{stats.blunders}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Mistakes</span>
          <span className="text-orange-400 font-semibold">{stats.mistakes}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Best Moves</span>
          <span className="text-green-400 font-semibold">{stats.bestMoves}/{stats.totalMoves}</span>
        </div>
      </div>
    </div>
  );
}

export function AnalysisViewer() {
  const [status, setStatus] = useState<AppStatus>("pgn");
  const [gameData, setGameData] = useState<GameHeaders | null>(null);
  const [moves, setMoves] = useState<ParsedMove[]>([]);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [report, setReport] = useState<GameReport | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<TabId>("report");
  const [analyzeProgress, setAnalyzeProgress] = useState<AnalysisProgress | null>(null);
  const [topMoves, setTopMoves] = useState<MoveArrowInfo[]>([]);
  const [topMovesFull, setTopMovesFull] = useState<AnalysisPanelMove[]>([]);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [altFen, setAltFen] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const topMovesRef = useRef<AbortController | null>(null);
  const movesRef = useRef<ParsedMove[]>(moves);
  movesRef.current = moves;
  const gameDataRef = useRef<GameHeaders | null>(gameData);
  gameDataRef.current = gameData;

  const handleGameLoaded = useCallback((headers: GameHeaders, parsedMoves: ParsedMove[]) => {
    movesRef.current = parsedMoves;
    gameDataRef.current = headers;
    setGameData(headers);
    setMoves(parsedMoves);
    setCurrentMoveIndex(-1);
    setAnalysis(null);
    setReport(null);
  }, []);

  const handleAnalyzeStart = useCallback(async () => {
    const currentMoves = movesRef.current;
    if (currentMoves.length === 0) return;

    setStatus("analyzing");
    setAnalyzeProgress({ current: 0, total: currentMoves.length, phase: "opening", fen: "" });

    abortRef.current = new AbortController();

    try {
      const gd = gameDataRef.current;
      const res = await fetch("/api/analyze-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn: gd ? reconstructPgn(gd, currentMoves) : "" }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Analysis failed: ${res.statusText}`);

      const data = (await res.json()) as AnalyzeGameResponse;

      setAnalysis(data.analysis);
      setReport(data.report);
      setStatus("done");
      if (data.moves.length > 0) {
        setCurrentMoveIndex(0);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("[analysis] Analysis error:", err);
        setStatus("done");
      }
    }

    setAnalyzeProgress(null);
  }, []);

  const analysisMoves = analysis?.moves ?? null;

  /* ── Keyboard navigation state and helpers ── */
  const [autoPlay, setAutoPlay] = useState(false);

  const navigateToMove = useCallback(
    (index: number) => {
      setAutoPlay(false);
      setCurrentMoveIndex(index);
      setSelectedLineIndex(null);
      setAltFen(null);
    },
    [],
  );

  const criticalMoments = useMemo(() => analysis?.criticalMoments ?? [], [analysis]);

  const jumpToNextCriticalMoment = useCallback(() => {
    if (criticalMoments.length === 0) return;
    const next = criticalMoments.find((cm) => cm.ply > currentMoveIndex);
    if (next) navigateToMove(next.ply);
  }, [criticalMoments, currentMoveIndex, navigateToMove]);

  const jumpToPreviousCriticalMoment = useCallback(() => {
    if (criticalMoments.length === 0) return;
    const prev = [...criticalMoments].reverse().find((cm) => cm.ply < currentMoveIndex);
    if (prev) navigateToMove(prev.ply);
  }, [criticalMoments, currentMoveIndex, navigateToMove]);

  const handleNavigate = useCallback(
    (index: number) => {
      navigateToMove(index);
    },
    [navigateToMove],
  );

  const handleGraphClick = useCallback(
    (ply: number) => {
      navigateToMove(ply);
    },
    [navigateToMove],
  );

  /* ── Keyboard event listener ── */
  const keyboardMovesRef = useRef(moves);
  keyboardMovesRef.current = moves;
  const keyboardStatusRef = useRef(status);
  keyboardStatusRef.current = status;
  const keyboardMoveIdxRef = useRef(currentMoveIndex);
  keyboardMoveIdxRef.current = currentMoveIndex;
  const jumpNextRef = useRef(jumpToNextCriticalMoment);
  jumpNextRef.current = jumpToNextCriticalMoment;
  const jumpPrevRef = useRef(jumpToPreviousCriticalMoment);
  jumpPrevRef.current = jumpToPreviousCriticalMoment;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (keyboardStatusRef.current !== "done") return;
      const m = keyboardMovesRef.current;
      if (m.length === 0) return;

      const resetNav = () => {
        setAutoPlay(false);
        setSelectedLineIndex(null);
        setAltFen(null);
      };

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          resetNav();
          setCurrentMoveIndex(Math.max(-1, keyboardMoveIdxRef.current - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          resetNav();
          setCurrentMoveIndex(Math.min(m.length - 1, keyboardMoveIdxRef.current + 1));
          break;
        case "Home":
          e.preventDefault();
          resetNav();
          setCurrentMoveIndex(0);
          break;
        case "End":
          e.preventDefault();
          resetNav();
          setCurrentMoveIndex(m.length - 1);
          break;
        case " ":
          e.preventDefault();
          setAutoPlay((prev) => !prev);
          break;
        case "j":
          e.preventDefault();
          jumpNextRef.current();
          break;
        case "k":
          e.preventDefault();
          jumpPrevRef.current();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* ── Auto-play interval ── */
  const currentMoveRef = useRef(currentMoveIndex);
  currentMoveRef.current = currentMoveIndex;

  useEffect(() => {
    if (!autoPlay || moves.length === 0) return;
    if (currentMoveRef.current >= moves.length - 1) {
      setAutoPlay(false);
      return;
    }

    const id = window.setInterval(() => {
      const prev = currentMoveRef.current;
      if (prev >= moves.length - 1) {
        setAutoPlay(false);
        return;
      }
      setCurrentMoveIndex(prev + 1);
    }, 2000);

    return () => window.clearInterval(id);
  }, [autoPlay, moves.length]);

  /* ── Fetch multi-Pv analysis for current position ── */
  useEffect(() => {
    if (status !== "done" || currentMoveIndex < 0) {
      setTopMoves([]);
      setTopMovesFull([]);
      setSelectedLineIndex(null);
      return;
    }

    topMovesRef.current?.abort();
    const controller = new AbortController();
    topMovesRef.current = controller;

    const fetchTopMoves = async () => {
      const fen = getFenAtMove(moves, currentMoveIndex);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fen, depth: 16, maxTime: 2500, multiPv: 3 }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as AnalyzeResponse;
        if (data.topMoves && data.topMoves.length > 0) {
          setTopMoves(data.topMoves.map((m) => ({ from: m.from, to: m.to, san: m.san, eval: m.eval })));
          setTopMovesFull(data.topMoves);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[analysis] Fetch failed:", err);
        }
      }
    };

    fetchTopMoves();

    return () => controller.abort();
  }, [status, currentMoveIndex, moves]);

  /* ── Alternative line selection ── */
  const handleSelectLine = useCallback(
    (index: number) => {
      setSelectedLineIndex((prev) => (prev === index ? null : index));
      if (topMovesFull[index]) {
        const move = topMovesFull[index];
        try {
          const chess = new Chess(getFenAtMove(moves, currentMoveIndex));
          chess.move(move.san);
          setAltFen(chess.fen());
        } catch {
          setAltFen(null);
        }
      }
    },
    [topMovesFull, moves, currentMoveIndex],
  );

  const handleSeeBestMove = useCallback(() => {
    if (topMovesFull.length > 0) {
      handleSelectLine(0);
    }
  }, [topMovesFull, handleSelectLine]);

  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const explainAbortRef = useRef<AbortController | null>(null);

  const handleExplain = useCallback(() => {
    const fen = getFenAtMove(moves, currentMoveIndex);
    const top = topMovesFull[0];
    if (!top) return;

    explainAbortRef.current?.abort();
    const controller = new AbortController();
    explainAbortRef.current = controller;
    setIsExplaining(true);
    setExplanation(null);

    fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fen, move: top.san, evalScore: top.eval }),
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Explain failed: ${r.statusText}`);
        return r.json();
      })
      .then((data) => {
        setExplanation(data.explanation);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setExplanation("Could not generate explanation. The AI service may be unavailable.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsExplaining(false);
        }
      });
  }, [topMovesFull, moves, currentMoveIndex]);

  const evalScore = topMovesFull[0]?.eval ?? 0;
  const mateScore = topMovesFull[0]?.mate ?? null;
  const bestSan = topMovesFull[0]?.san ?? "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <header className="sticky top-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0a]/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-amber-500/20">
              <Swords className="size-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">Chessigma</h1>
              <p className="text-[9px] font-medium uppercase tracking-widest text-amber-400">
                Game Analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            {status === "done" && gameData && (
              <span className="hidden truncate sm:block max-w-[200px]">
                {gameData.white} vs {gameData.black}
              </span>
            )}
            <span className="rounded bg-[#1a1a1a] px-2 py-1 font-mono text-amber-400">
              Stockfish 18
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <AnimatePresence mode="wait">
          {status === "pgn" && (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[60vh] items-center justify-center"
            >
              <PGNLoader
                onGameLoaded={handleGameLoaded}
                onAnalyzeStart={handleAnalyzeStart}
                isAnalyzing={false}
                analyzeProgress={null}
              />
            </motion.div>
          )}

          {status === "analyzing" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[60vh] items-center justify-center"
            >
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="size-8 animate-spin text-amber-400" />
                <div className="text-center">
                  <p className="text-sm text-white">Analyzing game with Stockfish 18...</p>
                  {analyzeProgress && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                        <span>Move {analyzeProgress.current} of {analyzeProgress.total}</span>
                        <span className="rounded bg-[#1a1a1a] px-1.5 py-0.5 text-[10px] capitalize text-amber-400">
                          {analyzeProgress.phase}
                        </span>
                      </div>
                      <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-[#2a2a2a]">
                        <motion.div
                          className="h-full bg-amber-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${(analyzeProgress.current / analyzeProgress.total) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {status === "done" && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {gameData?.white} vs {gameData?.black}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {gameData?.result} &middot; {gameData?.date ?? "Unknown date"} &middot; {moves.length} moves
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStatus("pgn");
                    setAnalysis(null);
                    setReport(null);
                    setMoves([]);
                    setGameData(null);
                    setCurrentMoveIndex(-1);
                  }}
                  className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs text-slate-400 transition hover:border-amber-500 hover:text-amber-400"
                >
                  New Analysis
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_18rem_20rem]">
                <div className="space-y-3">
                  <FullAnalysisBoard
                    moves={moves}
                    currentMoveIndex={currentMoveIndex}
                    onNavigate={handleNavigate}
                    bestMoves={topMoves}
                    selectedLineIndex={selectedLineIndex}
                    altFen={altFen}
                    onClearAlt={() => setAltFen(null)}
                    analysisMoves={analysis?.moves}
                  />
                  <div className="mt-2 flex items-center justify-center gap-2">
                    {autoPlay && (
                      <span className="flex items-center gap-1.5 rounded bg-green-500/15 px-2 py-1 text-[9px] font-semibold text-green-400">
                        <span className="size-1.5 animate-pulse rounded-full bg-green-400" />
                        Auto-playing
                      </span>
                    )}
                    <KeyboardHints />
                  </div>

                  <div className="block lg:hidden">
                    <EvaluationGraph
                      moves={moves}
                      currentPly={currentMoveIndex}
                      onMoveClick={handleGraphClick}
                      gameResult={gameData?.result}
                    />
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="sticky top-16 flex h-[calc(100vh-6rem)] flex-col gap-3">
                    <div className="flex-1 min-h-0">
                      <MoveList
                        moves={moves}
                        analysis={analysisMoves}
                        currentMoveIndex={currentMoveIndex}
                        onMoveClick={handleNavigate}
                        whiteAccuracy={analysis?.whiteAccuracy}
                        blackAccuracy={analysis?.blackAccuracy}
                      />
                    </div>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="sticky top-16 flex h-[calc(100vh-6rem)] flex-col gap-3 overflow-y-auto">
                    {report && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3"
                      >
                        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                          <BarChart3 className="size-3" />
                          Report
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <PlayerStatCard label={report.game.white} stats={report.players.white} color="bg-green-400" />
                          <PlayerStatCard label={report.game.black} stats={report.players.black} color="bg-red-400" />
                        </div>
                        {report.biggestSwings.overall.length > 0 && (
                          <div className="mt-2">
                            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                              <Zap className="size-2.5" /> Biggest Swings
                            </div>
                            <div className="space-y-1">
                              {report.biggestSwings.overall.slice(0, 3).map((swing, i) => (
                                <button
                                  key={swing.ply}
                                  onClick={() => navigateToMove(swing.ply)}
                                  className="flex w-full items-center gap-1.5 rounded bg-[#242424] px-2 py-1 text-[10px] text-left transition hover:bg-[#2a2a2a]"
                                >
                                  <span className="text-slate-500">{swing.moveNumber}{swing.side === "white" ? "." : "..."}</span>
                                  <span className="text-white">{swing.san}</span>
                                  <span className="ml-auto font-mono text-[9px] text-red-400">
                                    {swing.diff > 0 ? "+" : ""}{swing.diff}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {report.phases.length > 1 && (
                          <div className="mt-2 space-y-1.5">
                            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                              <BarChart3 className="size-2.5" /> Phase Accuracy
                            </div>
                            {report.phases.map((phase, i) => (
                              <PhaseCard key={phase.name} phase={phase} index={i} />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                    <EvaluationGraph
                      moves={moves}
                      currentPly={currentMoveIndex}
                      onMoveClick={handleGraphClick}
                      gameResult={gameData?.result}
                    />
                    {currentMoveIndex >= 0 && (
                      <AnalysisPanel
                        bestMove={bestSan}
                        evalScore={evalScore}
                        mate={mateScore}
                        topMoves={topMovesFull}
                        selectedLineIndex={selectedLineIndex}
                        onSelectLine={handleSelectLine}
                        onSeeBestMove={handleSeeBestMove}
                        onExplain={handleExplain}
                        explanation={explanation}
                        isExplaining={isExplaining}
                      />
                    )}
                    <div className="flex-1 min-h-0">
                      <TabPanel
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        gameData={gameData}
                        analysis={analysis}
                        moves={moves}
                        currentMoveIndex={currentMoveIndex}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 block lg:hidden">
                <div className="mb-3">
                  <MoveList
                    moves={moves}
                    analysis={analysisMoves}
                    currentMoveIndex={currentMoveIndex}
                    onMoveClick={handleNavigate}
                    whiteAccuracy={analysis?.whiteAccuracy}
                    blackAccuracy={analysis?.blackAccuracy}
                  />
                </div>
                <TabPanel
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  gameData={gameData}
                  analysis={analysis}
                  moves={moves}
                  currentMoveIndex={currentMoveIndex}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-[#1e1e2e] bg-[#0a0a0a]/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 text-[9px] text-slate-600 sm:px-6">
          <span>Chessigma — Full Game Analysis Platform</span>
          <span>Stockfish 18 &middot; Multi-PV &middot; DeepSeek AI</span>
        </div>
      </footer>
    </div>
  );
}

function reconstructPgn(headers: GameHeaders, moves: ParsedMove[]): string {
  const tagRows: string[] = [];
  const tags: Record<string, string> = {
    Event: headers.event ?? "Chess Analysis",
    Site: headers.site ?? "Online",
    Date: headers.date ?? "????.??.??",
    Round: headers.round ?? "-",
    White: headers.white,
    Black: headers.black,
    Result: headers.result,
  };
  if (headers.whiteElo) tags.WhiteElo = headers.whiteElo;
  if (headers.blackElo) tags.BlackElo = headers.blackElo;
  if (headers.eco) tags.ECO = headers.eco;
  if (headers.opening) tags.Opening = headers.opening;

  for (const [k, v] of Object.entries(tags)) {
    tagRows.push(`[${k} "${v}"]`);
  }

  const chess = new Chess();
  const sanMoves: string[] = [];
  for (const m of moves) {
    try {
      const move = chess.move(m.san);
      sanMoves.push(move.san);
    } catch {
      break;
    }
  }

  const moveText: string[] = [];
  for (let i = 0; i < sanMoves.length; i += 2) {
    const num = Math.floor(i / 2) + 1;
    let line = `${num}. ${sanMoves[i]}`;
    if (i + 1 < sanMoves.length) {
      line += ` ${sanMoves[i + 1]}`;
    }
    moveText.push(line);
  }

  return [...tagRows, "", ...moveText, headers.result].join("\n");
}
