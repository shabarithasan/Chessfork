import { useCallback, useRef, useState } from "react";

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
      // Stream analysis directly from POST — no separate GET needed.
      // This works on Vercel because the response is a single streaming fetch,
      // avoiding the broken in-memory session map across serverless invocations.
      const res = await fetch("/api/analyze-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn, mode, source, subject }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errData.message || `Failed to start analysis: ${res.statusText}`);
      }

      setState((prev) => ({ ...prev, engineStatus: "Connecting to Stockfish 18..." }));

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response body to stream.");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (terminated by double newline)
        const lastDoubleNewline = buffer.lastIndexOf("\n\n");
        if (lastDoubleNewline === -1) continue;

        const completePart = buffer.slice(0, lastDoubleNewline + 2);
        buffer = buffer.slice(lastDoubleNewline + 2);

        const events = parseSseEvents(completePart);
        for (const sseEvent of events) {
          handleSseEvent(sseEvent.event, sseEvent.data);
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const events = parseSseEvents(buffer);
        for (const sseEvent of events) {
          handleSseEvent(sseEvent.event, sseEvent.data);
        }
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

    function handleSseEvent(eventType: string, rawData: string) {
      try {
        const data = JSON.parse(rawData);

        switch (eventType) {
          case "opening":
            setState((prev) => ({ ...prev, engineStatus: "Calculating opening accuracy..." }));
            break;

          case "move": {
            const { move, progress, totalMoves } = data as {
              bestMove: string;
              cpLoss: number;
              grade: MoveGrade;
              move: MoveEvaluation;
              moveIndex: number;
              progress: number;
              totalMoves: number;
            };

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
            break;
          }

          case "complete": {
            const completeData = data as AnalysisRun & { id?: string; analysisId?: string };
            const id = completeData.id || completeData.analysisId;
            setState((prev) => ({
              ...prev,
              analysisProgress: 100,
              isAnalyzing: false,
              isFinished: true,
              analysisId: id || null,
              engineStatus: "Analysis complete",
            }));
            break;
          }

          case "error": {
            setState((prev) => ({
              ...prev,
              isAnalyzing: false,
              error: data.message || "Analysis stream error.",
              engineStatus: "Error",
            }));
            break;
          }
        }
      } catch {
        // Ignore malformed SSE data
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
