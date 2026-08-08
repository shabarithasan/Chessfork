import { useCallback, useRef, useState } from "react";
import { analyzePgnClientSide, buildClientReport } from "@/lib/chess/client-analyzer";

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

/**
 * Parse a chunk of SSE text into individual events.
 * Each event looks like: "event: <name>\ndata: <json>\n\n"
 */
function parseSseEvents(text: string): { event: string; data: string }[] {
  const events: { event: string; data: string }[] = [];
  // Split on double newline to get individual events
  const blocks = text.split(/\n\n/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const eventMatch = trimmed.match(/^event:\s*(.+)$/m);
    const dataMatch = trimmed.match(/^data:\s*(.+)$/m);
    if (eventMatch && dataMatch) {
      events.push({ event: eventMatch[1].trim(), data: dataMatch[1].trim() });
    }
  }
  return events;
}

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

    let whiteLossSum = 0;
    let blackLossSum = 0;
    let whiteMoves = 0;
    let blackMoves = 0;

    try {
      setState((prev) => ({ ...prev, engineStatus: "Connecting to Stockfish 18 WASM..." }));

      const evaluations = await analyzePgnClientSide(pgn, {
        depth: mode === "deep" ? "deep" : "quick",
        abortSignal: abortControllerRef.current.signal,
        onProgress: ({ move, moveIndex, totalMoves }) => {
          const progress = Math.round(((moveIndex + 1) / totalMoves) * 100);

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
        },
      });

      if (!abortControllerRef.current.signal.aborted) {
        const completeData = buildClientReport(evaluations, pgn, mode === "deep" ? "deep" : "quick");
        setState((prev) => ({
          ...prev,
          analysisProgress: 100,
          isAnalyzing: false,
          isFinished: true,
          analysisId: completeData.id || null,
          engineStatus: "Analysis complete",
        }));
      }

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
