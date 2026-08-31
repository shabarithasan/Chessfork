"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords } from "lucide-react";

import { FullAnalysisBoard } from "@/components/chess/FullAnalysisBoard";
import { EvalBar } from "@/components/chess/EvalBar";
import EvaluationGraph from "@/components/chess/EvaluationGraph";
import { TabPanel } from "@/components/chess/TabPanel";
import { PGNLoader } from "@/components/chess/PGNLoader";
import { AnalysisPanel, type AnalysisPanelMove } from "@/components/chess/AnalysisPanel";
import { KeyboardHints } from "@/components/chess/KeyboardHints";
import type { MoveArrowInfo } from "@/components/chess/MoveArrow";
import type { GameHeaders, ParsedMove } from "@/lib/pgn-parser";
import { getFenAtMove } from "@/lib/pgn-parser";
import { Chess } from "chess.js";
import { analyzeFullGame, type GameAnalysis } from "@/lib/game-analyzer";
import { useSettings } from "@/contexts/SettingsContext";
import { useEngine } from "@/hooks/useEngine";

type TabId = "report" | "analysis" | "coach" | "insights" | "openings";
type AppStatus = "loading" | "pgn" | "analyzing" | "done";

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

export function AnalysisPageClient() {
  const [status, setStatus] = useState<AppStatus>("pgn");
  const [gameData, setGameData] = useState<GameHeaders | null>(null);
  const [moves, setMoves] = useState<ParsedMove[]>([]);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<TabId>("report");
  const [analyzeProgress, setAnalyzeProgress] = useState<{ current: number; total: number } | null>(null);
  const [topMoves, setTopMoves] = useState<MoveArrowInfo[]>([]);
  const [topMovesFull, setTopMovesFull] = useState<AnalysisPanelMove[]>([]);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [altFen, setAltFen] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [depth, setDepth] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const topMovesRef = useRef<AbortController | null>(null);
  const movesRef = useRef<ParsedMove[]>(moves);
  movesRef.current = moves;

  const { liveEngine } = useSettings();
  const { analysis: liveAnalysis, startAnalysis, stopAnalysis } = useEngine();
  const liveAnalysisRef = useRef(liveAnalysis);
  liveAnalysisRef.current = liveAnalysis;

  const handleGameLoaded = useCallback((headers: GameHeaders, parsedMoves: ParsedMove[]) => {
    movesRef.current = parsedMoves;
    setGameData(headers);
    setMoves(parsedMoves);
    setCurrentMoveIndex(-1);
    setAnalysis(null);
  }, []);

  const handleAnalyzeStart = useCallback(async () => {
    const currentMoves = movesRef.current;
    if (currentMoves.length === 0) return;

    setStatus("analyzing");
    setAnalyzeProgress({ current: 0, total: currentMoves.length });

    abortRef.current = new AbortController();

    try {
      const result = await analyzeFullGame(
        currentMoves,
        (current, total) => {
          setAnalyzeProgress({ current, total });
        },
        abortRef.current.signal,
      );

      setAnalysis(result);
      setStatus("done");
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
    if (status !== "done") {
      setTopMoves([]);
      setTopMovesFull([]);
      setSelectedLineIndex(null);
      stopAnalysis();
      return;
    }

    setTopMoves([]);
    setTopMovesFull([]);
    setSelectedLineIndex(null);
    topMovesRef.current?.abort();

    // currentMoveIndex -1 = starting position
    const fen = currentMoveIndex >= 0 ? getFenAtMove(moves, currentMoveIndex) : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    if (liveEngine) {
      // Use client-side WASM engine for continuous deepening
      setIsAnalyzing(true);
      startAnalysis(fen, { depth: 16, multiPV: 3 });

      const updateFromLive = () => {
        const la = liveAnalysisRef.current;
        if (la.lines.length > 0) {
          const chess = new Chess(fen);
          setTopMoves(
            la.lines.map((l) => {
              const uci = l.pv[0];
              try {
                const move = chess.move(uci);
                chess.undo();
                return {
                  from: move.from,
                  to: move.to,
                  san: move.san,
                  eval: l.evaluation?.type === "cp" ? l.evaluation.value : l.evaluation?.type === "mate" ? l.evaluation.value * 10000 : 0,
                };
              } catch {
                return { from: uci?.slice(0, 2) || "", to: uci?.slice(2, 4) || "", san: uci || "", eval: l.evaluation?.type === "cp" ? l.evaluation.value : 0 };
              }
            })
          );
          setTopMovesFull(
            la.lines.map((l, i) => {
              const uci = l.pv[0];
              try {
                const move = chess.move(uci);
                chess.undo();
                return {
                  from: move.from,
                  to: move.to,
                  san: move.san,
                  eval: l.evaluation?.type === "cp" ? l.evaluation.value : l.evaluation?.type === "mate" ? l.evaluation.value * 10000 : 0,
                  mate: l.evaluation?.type === "mate" ? l.evaluation.value : null,
                  line: l.pv,
                };
              } catch {
                return { from: uci?.slice(0, 2) || "", to: uci?.slice(2, 4) || "", san: uci || "", eval: l.evaluation?.type === "cp" ? l.evaluation.value : 0, mate: l.evaluation?.type === "mate" ? l.evaluation.value : null, line: l.pv };
              }
            })
          );
          setDepth(la.depth);
          setIsAnalyzing(la.status === "analyzing");
        } else if (la.status === "idle" && la.depth > 0) {
          setIsAnalyzing(false);
        }
      };

      const interval = window.setInterval(updateFromLive, 200);
      updateFromLive();

      return () => {
        window.clearInterval(interval);
        stopAnalysis();
        setIsAnalyzing(false);
      };
    } else {
      // Fallback: server /api/analyze
      const controller = new AbortController();
      topMovesRef.current = controller;

      const fetchTopMoves = async () => {
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
          setDepth(data.depth);
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            console.error("[analysis] Fetch failed:", err);
          }
        } finally {
          if (!controller.signal.aborted) {
            setIsAnalyzing(false);
          }
        }
      };

      setIsAnalyzing(true);
      fetchTopMoves();

      return () => {
        controller.abort();
        setIsAnalyzing(false);
      };
    }
  }, [status, currentMoveIndex, moves, liveEngine, startAnalysis, stopAnalysis]);

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
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .depth-pill-animating {
          background: linear-gradient(
            90deg,
            #1e1e1e 25%,
            #f3c53d 50%,
            #1e1e1e 75%
          );
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }
      `}</style>
      <header className="sticky top-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0a]/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-cyan-500/20">
              <Swords className="size-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">ChessFork</h1>
              <p className="text-[9px] font-medium uppercase tracking-widest text-cyan-400">
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
            <span className="rounded bg-[#1a1a1a] px-2 py-1 font-mono text-cyan-400">
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
              <PGNLoader
                onGameLoaded={handleGameLoaded}
                onAnalyzeStart={handleAnalyzeStart}
                isAnalyzing={true}
                analyzeProgress={analyzeProgress}
              />
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
                    setMoves([]);
                    setGameData(null);
                    setCurrentMoveIndex(-1);
                  }}
                  className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400"
                >
                  New Analysis
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <EvalBar
                      evaluation={evalScore}
                      mate={mateScore}
                      depth={analysis?.moves[currentMoveIndex]?.depth ?? 20}
                      isAnalyzing={false}
                    />
                    <div className="min-w-0 flex-1">
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
                    </div>
                  </div>
                  {/* Horizontal move bar below the board */}
                  {moves.length > 0 && (
                    <div className="flex items-center gap-2 py-2 px-4 bg-[#262421] rounded-lg border border-[#3d3b38]">
                      <button
                        onClick={() => handleNavigate(Math.max(-1, currentMoveIndex - 1))}
                        disabled={currentMoveIndex < 0}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#f3c53d] text-black font-bold text-sm shrink-0 hover:bg-yellow-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        &lt;
                      </button>

                      <div className="flex items-center gap-4 flex-1 overflow-x-auto scroll-smooth px-2 whitespace-nowrap text-sm no-scrollbar">
                        <style>{`
                          .no-scrollbar::-webkit-scrollbar { display: none; }
                          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                        `}</style>
                        {moves.map((move, i) => {
                          const isActive = i === currentMoveIndex;
                          const moveNum = Math.floor(i / 2) + 1;
                          const prefix = i % 2 === 0 ? `${moveNum}.` : `${moveNum}...`;
                          const ma = analysis?.moves?.[i];
                          const CLASS_TO_LABEL: Record<string, string> = {
                            Brilliant: "brilliant", Best: "best", Excellent: "excellent",
                            Good: "good", Inaccuracy: "inaccuracy", Mistake: "mistake", Blunder: "blunder",
                          };
                          const labelFile = ma ? CLASS_TO_LABEL[ma.classification] : null;
                          return (
                            <span
                              key={i}
                              onClick={() => handleNavigate(i)}
                              className={`inline-flex items-center gap-1 cursor-pointer px-4 py-1.5 rounded-full transition-all font-mono text-xs ${
                                isActive
                                  ? "text-[#262421] font-bold bg-[#f3c53d]/20 border border-[#f3c53d]"
                                  : "text-[#b4b4b4] hover:scale-105"
                              }`}
                            >
                              {prefix}{move.san}
                              {labelFile && (
                                <img
                                  src={`/images/brilliance_v2/svg/${labelFile}.svg`}
                                  alt=""
                                  className="size-5 shrink-0"
                                />
                              )}
                            </span>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handleNavigate(Math.min(moves.length - 1, currentMoveIndex + 1))}
                        disabled={currentMoveIndex >= moves.length - 1}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#f3c53d] text-black font-bold text-sm shrink-0 hover:bg-yellow-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        &gt;
                      </button>
                    </div>
                  )}
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
                      analysisMoves={analysis?.moves}
                    />
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="sticky top-16 flex h-[calc(100vh-6rem)] flex-col gap-3">
                    <EvaluationGraph
                      moves={moves}
                      currentPly={currentMoveIndex}
                      onMoveClick={handleGraphClick}
                      gameResult={gameData?.result}
                      analysisMoves={analysis?.moves}
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
                        depth={depth}
                        isAnalyzing={isAnalyzing}
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
          <span>ChessFork — Chess Analysis Platform</span>
          <span>Stockfish 18 &middot; DeepSeek AI</span>
        </div>
      </footer>
    </div>
  );
}
