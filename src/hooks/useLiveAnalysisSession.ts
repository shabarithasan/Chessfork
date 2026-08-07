import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";

import type { AnalysisRun, MoveEvaluation, MoveGrade } from "@/types/platform";

export interface AnalysisSessionState {
  isAnalyzing: boolean;
  isFinished: boolean;
  analysisProgress: number; // 0-100
  currentAnalyzedMove: MoveEvaluation | null;
  replayBoardFen: string;
  whiteAccuracy: number;
  blackAccuracy: number;
  estimatedRatingWhite: number;
  estimatedRatingBlack: number;
  moveQualityCounts: {
    white: Record<MoveGrade, number>;
    black: Record<MoveGrade, number>;
  };
  moveList: MoveEvaluation[];
  engineStatus: string;
  analysisId: string | null;
  error: string | null;
}

const emptyMoveCounts = (): Record<MoveGrade, number> => ({
  Brilliant: 0,
  Great: 0,
  Best: 0,
  Excellent: 0,
  Good: 0,
  Book: 0,
  Inaccuracy: 0,
  Mistake: 0,
  Blunder: 0,
});

export function useLiveAnalysisSession() {
  const [state, setState] = useState<AnalysisSessionState>({
    isAnalyzing: false,
    isFinished: false,
    analysisProgress: 0,
    currentAnalyzedMove: null,
    replayBoardFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    whiteAccuracy: 100,
    blackAccuracy: 100,
    estimatedRatingWhite: 2100,
    estimatedRatingBlack: 2100,
    moveQualityCounts: {
      white: emptyMoveCounts(),
      black: emptyMoveCounts(),
    },
    moveList: [],
    engineStatus: "Initializing...",
    analysisId: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const startAnalysis = useCallback(async (
    pgn: string, 
    mode: "quick" | "deep" = "quick",
    source?: "pgn" | "chesscom" | "lichess",
    subject?: string
  ) => {
    // Reset state
    setState({
      isAnalyzing: true,
      isFinished: false,
      analysisProgress: 0,
      currentAnalyzedMove: null,
      replayBoardFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      whiteAccuracy: 100,
      blackAccuracy: 100,
      estimatedRatingWhite: 2100,
      estimatedRatingBlack: 2100,
      moveQualityCounts: {
        white: emptyMoveCounts(),
        black: emptyMoveCounts(),
      },
      moveList: [],
      engineStatus: "Parsing PGN...",
      analysisId: null,
      error: null,
    });

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const initRes = await fetch("/api/analyze-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn, mode, source, subject }),
        signal: abortControllerRef.current.signal,
      });

      if (!initRes.ok) {
        throw new Error(`Failed to start analysis session: ${initRes.statusText}`);
      }

      const initData = await initRes.json();
      const sessionId = initData.sessionId;

      if (!sessionId) {
        throw new Error("No session ID returned.");
      }

      setState((prev) => ({ ...prev, engineStatus: "Connecting to Stockfish 18..." }));

      const es = new EventSource(`/api/analyze-stream?sessionId=${sessionId}`);
      eventSourceRef.current = es;

      let whiteLossSum = 0;
      let blackLossSum = 0;
      let whiteMoves = 0;
      let blackMoves = 0;

      es.addEventListener("opening", (e) => {
        setState((prev) => ({ ...prev, engineStatus: "Calculating opening accuracy..." }));
      });

      es.addEventListener("move", (e) => {
        const data = JSON.parse(e.data) as {
          bestMove: string;
          cpLoss: number;
          grade: MoveGrade;
          move: MoveEvaluation;
          moveIndex: number;
          progress: number;
          totalMoves: number;
        };

        const { move, progress, totalMoves } = data;

        if (move.side === "white") {
          whiteLossSum += move.cpLoss || 0;
          whiteMoves += 1;
        } else {
          blackLossSum += move.cpLoss || 0;
          blackMoves += 1;
        }

        const avgWhiteLoss = whiteMoves > 0 ? whiteLossSum / whiteMoves : 0;
        const avgBlackLoss = blackMoves > 0 ? blackLossSum / blackMoves : 0;
        const whiteAcc = Math.max(0, Math.min(100, 100 - avgWhiteLoss * 0.15));
        const blackAcc = Math.max(0, Math.min(100, 100 - avgBlackLoss * 0.15));
        const estWhite = Math.round(900 + whiteAcc * 12);
        const estBlack = Math.round(900 + blackAcc * 12);

        setState((prev) => {
          const newWhiteCounts = { ...prev.moveQualityCounts.white };
          const newBlackCounts = { ...prev.moveQualityCounts.black };
          if (move.side === "white") {
            newWhiteCounts[move.grade] = (newWhiteCounts[move.grade] || 0) + 1;
          } else {
            newBlackCounts[move.grade] = (newBlackCounts[move.grade] || 0) + 1;
          }

          let newStatus = `Analyzing move ${move.moveNumber} of ${Math.ceil(totalMoves / 2)}...`;
          if (move.grade === "Blunder") newStatus = "Calculating blunder centipawn loss...";
          if (move.grade === "Brilliant") newStatus = "Verifying brilliant sacrifice...";
          if (progress > 90) newStatus = "Preparing final coach insights...";

          return {
            ...prev,
            analysisProgress: progress,
            currentAnalyzedMove: move,
            replayBoardFen: move.fenAfter,
            whiteAccuracy: whiteAcc,
            blackAccuracy: blackAcc,
            estimatedRatingWhite: estWhite,
            estimatedRatingBlack: estBlack,
            moveQualityCounts: {
              white: newWhiteCounts,
              black: newBlackCounts,
            },
            moveList: [...prev.moveList, move],
            engineStatus: newStatus,
          };
        });
      });

      es.addEventListener("complete", (e) => {
        const data = JSON.parse(e.data) as AnalysisRun & { id?: string; analysisId?: string };
        const id = data.id || data.analysisId;
        setState((prev) => ({
          ...prev,
          analysisProgress: 100,
          isAnalyzing: false,
          isFinished: true,
          analysisId: id || null,
          engineStatus: "Analysis complete",
        }));
        es.close();
      });

      es.addEventListener("error", (e) => {
        let msg = "Analysis stream error.";
        try {
          // @ts-ignore
          if (e.data) {
            // @ts-ignore
            const data = JSON.parse(e.data);
            if (data.message) msg = data.message;
          }
        } catch {}
        
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          error: msg,
          engineStatus: "Error",
        }));
        es.close();
      });

      es.onerror = (e) => {
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          error: "Connection lost to analysis server.",
          engineStatus: "Disconnected",
        }));
        es.close();
      };
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          error: (err as Error).message,
          engineStatus: "Failed to start",
        }));
      }
    }
  }, []);

  const cancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setState((prev) => ({
      ...prev,
      isAnalyzing: false,
      engineStatus: "Cancelled",
    }));
  }, []);

  return {
    ...state,
    startAnalysis,
    cancelAnalysis,
  };
}
