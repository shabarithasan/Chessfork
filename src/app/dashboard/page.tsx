"use client";

import { useEffect } from "react";
import { DashboardLayout } from "@/components/chessigma/DashboardLayout";
import { ChessGame } from "@/components/chessigma/ChessGame";
import { MoveNavBar } from "@/components/chessigma/MoveNavBar";
import { useChessGame } from "@/components/chessigma/GameSection";
import { AnalysisCard } from "@/components/chessigma/AnalysisCard";
import { EvalGraph } from "@/components/chessigma/EvalGraph";

export default function DashboardPage() {
  const game = useChessGame();

  /* Keyboard navigation: ← → to step through moves */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (game.canGoBack) game.handleStepBack();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (game.canGoForward) game.handleStepForward();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [game]);

  const analysisScore = game.analysis?.eval ?? 0;
  const analysisTitle = game.coach?.title ?? "Analyzing...";
  const analysisBody = game.coach?.explanation ?? "Waiting for engine evaluation...";
  const analysisTag = game.analysis?.bestMove ?? "";

  return (
    <DashboardLayout
      boardContent={
        <ChessGame
          fen={game.fen}
          selectedSquare={game.selectedSquare}
          legalTargets={game.legalTargets}
          legalMoves={game.legalMoves}
          onSquareClick={game.handleSquareClick}
          onPieceDrop={game.handlePieceDrop}
        />
      }
      navSlot={
        <MoveNavBar
          moves={game.history}
          currentIndex={game.currentIndex}
          onGoTo={game.handleGoTo}
          onStepBack={game.handleStepBack}
          onStepForward={game.handleStepForward}
          canGoBack={game.canGoBack}
          canGoForward={game.canGoForward}
        />
      }
      sidebarContent={
        <div className="flex flex-col gap-3">
          <AnalysisCard
            score={analysisScore}
            title={analysisTitle}
            body={analysisBody}
            tagText={analysisTag}
            loading={game.isAnalyzing}
          />
          <EvalGraph
            data={game.evalHistory}
            currentIndex={game.currentIndex}
            onSeek={game.handleGoTo}
          />
        </div>
      }
    />
  );
}
