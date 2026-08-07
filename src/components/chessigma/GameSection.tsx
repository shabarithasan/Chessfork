"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { ChessEngine, type AnalysisResult, type CoachCommentary } from "./ChessEngine";

export interface EvalRecord {
  move: number;
  score: number;
}

export function useChessGame() {
  const gameRef = useRef(new Chess());
  const engineRef = useRef<ChessEngine | null>(null);
  const currentIndexRef = useRef(-1);
  const evalByIndex = useRef<Record<number, number>>({});
  const [fen, setFen] = useState(gameRef.current.fen());
  const [history, setHistory] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [coach, setCoach] = useState<CoachCommentary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evalHistory, setEvalHistory] = useState<EvalRecord[]>([]);

  const turn = gameRef.current.turn();
  const canGoBack = currentIndex >= 0;
  const canGoForward = currentIndex < history.length - 1;

  const sq = (s: string) => s as import("chess.js").Square;

  /* ── Engine setup ── */
  useEffect(() => {
    engineRef.current = new ChessEngine(
      (result) => {
        setAnalysis(result);
        setIsAnalyzing(false);

        const idx = currentIndexRef.current;
        const score =
          result.mate !== null
            ? result.mate > 0
              ? 10000
              : -10000
            : result.eval;

        evalByIndex.current[idx] = score;

        const entries = Object.entries(evalByIndex.current)
          .map(([key, val]) => ({ move: Number(key) + 1, score: val }))
          .filter((e) => e.move >= 1)
          .sort((a, b) => a.move - b.move);

        setEvalHistory(entries);
      },
      (commentary) => {
        setCoach(commentary);
      },
    );
    return () => engineRef.current?.cancel();
  }, []);

  /* ── Sync ref ── */
  currentIndexRef.current = currentIndex;

  /* ── Trigger analysis on fen change ── */
  useEffect(() => {
    setIsAnalyzing(true);
    engineRef.current?.analyze(fen);
  }, [fen]);

  /* ── Legal moves for the selected piece ── */
  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    try {
      return gameRef.current.moves({ square: sq(selectedSquare), verbose: true });
    } catch {
      return [];
    }
  }, [fen, selectedSquare]);

  const legalTargets = useMemo(() => new Set<string>(legalMoves.map((m) => m.to)), [legalMoves]);

  /* ── Navigate to a given ply index ── */
  const replayTo = useCallback(
    (target: number) => {
      const game = gameRef.current;
      game.reset();
      for (const san of history.slice(0, target + 1)) {
        try {
          game.move(san);
        } catch {
          break;
        }
      }
      setFen(game.fen());
      setCurrentIndex(target);
      setSelectedSquare(null);
    },
    [history],
  );

  /* ── Commit a new move ── */
  const commitMove = useCallback(
    (san: string) => {
      const newHistory = [...history.slice(0, currentIndex + 1), san];
      setHistory(newHistory);
      setCurrentIndex(newHistory.length - 1);
      setFen(gameRef.current.fen());
      setSelectedSquare(null);
    },
    [history, currentIndex],
  );

  /* ── Board click ── */
  const handleSquareClick = useCallback(
    (square: string) => {
      if (!square) return;

      if (selectedSquare && legalTargets.has(square)) {
        try {
          const move = gameRef.current.move({ from: sq(selectedSquare), to: sq(square), promotion: "q" });
          if (move) {
            commitMove(move.san);
          }
          return;
        } catch {
          /* illegal — fall through */
        }
      }

      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      const piece = gameRef.current.get(sq(square));
      if (piece && piece.color === turn) {
        setSelectedSquare(square);
      } else {
        setSelectedSquare(null);
      }
    },
    [selectedSquare, legalTargets, turn, commitMove],
  );

  const handleStepBack = useCallback(() => {
    if (canGoBack) replayTo(currentIndex - 1);
  }, [canGoBack, currentIndex, replayTo]);

  const handleStepForward = useCallback(() => {
    if (canGoForward) replayTo(currentIndex + 1);
  }, [canGoForward, currentIndex, replayTo]);

  const handleGoTo = useCallback(
    (index: number) => {
      if (index !== currentIndex) replayTo(index);
    },
    [currentIndex, replayTo],
  );

  const handlePieceDrop = useCallback(
    (from: string, to: string): boolean => {
      try {
        const move = gameRef.current.move({ from: sq(from), to: sq(to), promotion: "q" });
        if (move) {
          commitMove(move.san);
          return true;
        }
      } catch {
        /* illegal drop */
      }
      return false;
    },
    [commitMove],
  );

  return {
    fen,
    selectedSquare,
    legalTargets,
    legalMoves,
    history,
    currentIndex,
    canGoBack,
    canGoForward,
    analysis,
    coach,
    isAnalyzing,
    evalHistory,
    handleSquareClick,
    handleStepBack,
    handleStepForward,
    handleGoTo,
    handlePieceDrop,
  };
}
