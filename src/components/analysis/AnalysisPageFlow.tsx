"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords } from "lucide-react";
import { Chess } from "chess.js";

import { PGNLoader } from "@/components/chess/PGNLoader";
import { PlayerAvatar } from "@/components/chess/PlayerAvatar";
import { SquigglyLines } from "@/components/decorations/SquigglyLines";
import { StaggerChildren } from "@/components/animations/BadgeAnimation";
import { LiveAnalysisScreen } from "@/components/analysis/live-analysis-screen";
import { useLiveAnalysisSession } from "@/hooks/useLiveAnalysisSession";
import { AnalysisReport } from "./AnalysisReport";
import type { GameHeaders, ParsedMove } from "@/lib/pgn-parser";
import type { GameAnalysis } from "@/lib/game-analyzer";
import type { GameReport } from "@/lib/report-generator";
import type { AnalyzedMove, AnalysisProgress } from "@/lib/analysis-engine";

type ViewMode = "pgn" | "analyzing" | "report" | "interactive";

interface AnalyzeGameResponse {
  gameData: GameHeaders;
  moves: ParsedMove[];
  analysis: GameAnalysis & { analyzedMoves: AnalyzedMove[] };
  report: GameReport;
  status: string;
}

export function AnalysisPageFlow() {
  const [viewMode, setViewMode] = useState<ViewMode>("pgn");
  const [gameData, setGameData] = useState<GameHeaders | null>(null);
  const [moves, setMoves] = useState<ParsedMove[]>([]);
  const [analysis, setAnalysis] = useState<(GameAnalysis & { analyzedMoves: AnalyzedMove[] }) | null>(null);
  const [report, setReport] = useState<GameReport | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress>({ current: 0, total: 0, phase: "opening", fen: "" });
  const [jumpToPly, setJumpToPly] = useState<number | undefined>(undefined);

  const liveSession = useLiveAnalysisSession();

  useEffect(() => {
    if (liveSession.isFinished && liveSession.analysisId) {
      window.location.href = `/analysis/${liveSession.analysisId}`;
    }
  }, [liveSession.isFinished, liveSession.analysisId]);

  const abortRef = useRef<AbortController | null>(null);
  const gameDataRef = useRef<GameHeaders | null>(null);
  const movesRef = useRef<ParsedMove[]>([]);

  const handleGameLoaded = useCallback((headers: GameHeaders, parsedMoves: ParsedMove[]) => {
    gameDataRef.current = headers;
    movesRef.current = parsedMoves;
    setGameData(headers);
    setMoves(parsedMoves);
  }, []);

  const handleAnalyze = useCallback(async () => {
    const h = gameDataRef.current;
    const m = movesRef.current;
    if (!h || m.length === 0) return;

    setViewMode("analyzing");
    const pgn = reconstructPgn(h, m);
    await liveSession.startAnalysis(pgn, "quick");
  }, [liveSession]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    liveSession.cancelAnalysis();
    setViewMode("pgn");
  }, [liveSession]);

  const handleViewInteractive = useCallback(() => {
    setViewMode("interactive");
  }, []);

  const handleBackToReport = useCallback(() => {
    setViewMode("report");
  }, []);

  const handleNewAnalysis = useCallback(() => {
    setAnalysis(null);
    setReport(null);
    setMoves([]);
    setGameData(null);
    setViewMode("pgn");
  }, []);

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
            {viewMode !== "pgn" && gameData && (
              <span className="hidden items-center gap-1.5 sm:flex max-w-[260px]">
                <PlayerAvatar name={gameData.white} size="sm" />
                <span className="truncate">{gameData.white}</span>
                <span className="text-slate-600">vs</span>
                <PlayerAvatar name={gameData.black} size="sm" />
                <span className="truncate">{gameData.black}</span>
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
          {viewMode === "pgn" && (
            <motion.div
              key="pgn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[60vh] items-center justify-center"
            >
              <StaggerChildren>
                <PGNLoader
                  onGameLoaded={handleGameLoaded}
                  onAnalyzeStart={handleAnalyze}
                  isAnalyzing={false}
                  analyzeProgress={null}
                />
              </StaggerChildren>
            </motion.div>
          )}

          {viewMode === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LiveAnalysisScreen
                session={liveSession}
                whitePlayer={gameData?.white ?? "White"}
                blackPlayer={gameData?.black ?? "Black"}
              />
            </motion.div>
          )}

          {viewMode === "report" && report && (
            <motion.div
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative mx-auto max-w-2xl"
            >
              <div className="absolute -left-12 top-20 hidden lg:block">
                <SquigglyLines color="#FBBF24" style="wave" width={80} height={40} />
              </div>
              <div className="absolute -right-12 bottom-40 hidden rotate-180 lg:block">
                <SquigglyLines color="#22C55E" style="wave" width={80} height={40} />
              </div>
              <AnalysisReport
                report={report}
                onJumpToMove={(ply) => {
                  const idx = ply - 1;
                  if (idx >= 0 && idx < moves.length) {
                    setJumpToPly(ply);
                    setViewMode("interactive");
                  }
                }}
                onViewInteractive={handleViewInteractive}
              />
            </motion.div>
          )}

          {viewMode === "interactive" && moves.length > 0 && analysis && (
            <motion.div
              key="interactive-placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex items-center justify-center py-20"
            >
              <p className="text-neutral-400">Interactive analysis is available on the <a href={`/analysis/`} className="text-amber-400 underline">main analysis page</a>.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-[#1e1e2e] bg-[#0a0a0a]/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 text-[9px] text-slate-600 sm:px-6">
          <span>Chessigma — Full Game Analysis Platform</span>
          <span>Stockfish 18 &middot; Multi-PV &middot; AI Explanations</span>
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
    } catch { break; }
  }

  const moveText: string[] = [];
  for (let i = 0; i < sanMoves.length; i += 2) {
    const num = Math.floor(i / 2) + 1;
    let line = `${num}. ${sanMoves[i]}`;
    if (i + 1 < sanMoves.length) line += ` ${sanMoves[i + 1]}`;
    moveText.push(line);
  }

  return [...tagRows, "", ...moveText, headers.result].join("\n");
}
