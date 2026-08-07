"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";

import { Navbar } from "./Navbar";
import { PlayerBar } from "./PlayerBar";
import { ChessBoardSection } from "./ChessBoardSection";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";
import { ChessEngine, type AnalysisResult, type CoachCommentary } from "./ChessEngine";
import styles from "./styles.module.css";

interface MoveRecord {
  san: string;
  from: string;
  to: string;
}

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function ChessigmaPage() {
  const gameRef = useRef(new Chess());
  const engineRef = useRef<ChessEngine | null>(null);
  const [fen, setFen] = useState(INITIAL_FEN);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [currentPly, setCurrentPly] = useState(-1);
  const [flipped, setFlipped] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [coach, setCoach] = useState<CoachCommentary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const lastMove = useMemo(() => {
    if (currentPly < 0) return null;
    return moveHistory[currentPly] ?? null;
  }, [currentPly, moveHistory]);

  /* ── Engine setup ── */
  useEffect(() => {
    engineRef.current = new ChessEngine(
      (result) => {
        setAnalysis(result);
        setIsAnalyzing(false);
      },
      (commentary) => {
        setCoach(commentary);
      },
    );
    return () => engineRef.current?.cancel();
  }, []);

  const triggerAnalysis = useCallback((targetFen: string) => {
    setIsAnalyzing(true);
    engineRef.current?.analyze(targetFen);
  }, []);

  /* ── Move handling ── */
  const makeMove = useCallback(
    (from: string, to: string) => {
      const game = gameRef.current;
      try {
        const move = game.move({ from, to, promotion: "q" });
        if (!move) return false;

        const record: MoveRecord = {
          san: move.san,
          from: move.from,
          to: move.to,
        };

        const newHistory = [...moveHistory.slice(0, currentPly + 1), record];
        setMoveHistory(newHistory);
        setCurrentPly(newHistory.length - 1);
        setFen(game.fen());
        triggerAnalysis(game.fen());
        return true;
      } catch {
        return false;
      }
    },
    [moveHistory, currentPly, triggerAnalysis],
  );

  const handlePieceDrop = useCallback(
    (from: string, to: string): boolean => makeMove(from, to),
    [makeMove],
  );

  const handleSuggestionClick = useCallback(
    (san: string) => {
      const game = gameRef.current;
      try {
        const move = game.move(san);
        if (!move) return;

        const record: MoveRecord = {
          san: move.san,
          from: move.from,
          to: move.to,
        };

        const newHistory = [...moveHistory.slice(0, currentPly + 1), record];
        setMoveHistory(newHistory);
        setCurrentPly(newHistory.length - 1);
        setFen(game.fen());
        triggerAnalysis(game.fen());
      } catch {
        // Invalid suggestion for current position
      }
    },
    [moveHistory, currentPly, triggerAnalysis],
  );

  const handleMoveClick = useCallback(
    (ply: number) => {
      if (ply === currentPly) return;

      const game = gameRef.current;
      game.reset();
      for (let i = 0; i <= ply; i++) {
        const m = moveHistory[i];
        if (!m) break;
        try {
          game.move({ from: m.from, to: m.to, promotion: "q" });
        } catch {
          break;
        }
      }
      setCurrentPly(ply);
      setFen(game.fen());
      triggerAnalysis(game.fen());
    },
    [currentPly, moveHistory, triggerAnalysis],
  );

  /* ── First analysis ── */
  useEffect(() => {
    triggerAnalysis(INITIAL_FEN);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    return {
      accuracyWhite: 100,
      accuracyBlack: 100,
      moveCounts: {
        Brilliant: 0,
        Great: 1,
        Best: moveHistory.length,
        Inaccuracy: 0,
        Mistake: 0,
        Blunder: 0,
      },
    };
  }, [moveHistory]);

  /* ── Handlers ── */
  const handleExplain = useCallback(() => {
    if (!analysis) return;
    const evalText = analysis.mate
      ? `M${analysis.mate}`
      : `${(analysis.eval / 100).toFixed(2)}`;
    alert(
      `Engine Analysis\nDepth: ${analysis.depth}\nBest: ${analysis.bestMove}\nEval: ${evalText}\nLine: ${analysis.bestLine.slice(0, 5).join(" ")}`,
    );
  }, [analysis]);

  const handleSeeBestMove = useCallback(() => {
    if (!analysis?.topMoves?.[0]) return;

    const top = analysis.topMoves[0];
    const game = gameRef.current;
    const fenBefore = game.fen();

    try {
      const chess = new Chess(fenBefore);
      const move = chess.move(top.san);
      if (!move) return;

      const record: MoveRecord = {
        san: move.san,
        from: move.from,
        to: move.to,
      };

      const newHistory = [...moveHistory.slice(0, currentPly + 1), record];
      setMoveHistory(newHistory);
      setCurrentPly(newHistory.length - 1);
      setFen(game.fen());
      triggerAnalysis(game.fen());
    } catch {
      // Best move not applicable
    }
  }, [analysis, moveHistory, currentPly, triggerAnalysis]);

  return (
    <div className={styles.pageWrapper}>
      <Navbar />

      <PlayerBar
        white={{ name: "mr-demon-only", rating: 958, clock: "6:46" }}
        black={{ name: "monir26101967", rating: 927, clock: "7:35" }}
      />

      <div className={styles.mainBody}>
        <div className={styles.boardColumn}>
          <ChessBoardSection
            fen={fen}
            orientation="white"
            flipped={flipped}
            lastMove={lastMove}
            analysis={analysis}
            onPieceDrop={handlePieceDrop}
          />
        </div>

        <div className={styles.sidebarColumn}>
          <Sidebar
            analysis={analysis}
            coach={coach}
            stats={stats}
            moveHistory={moveHistory}
            currentPly={currentPly}
            topMoveSan={analysis?.bestMove ?? null}
            onSuggestionClick={handleSuggestionClick}
            onExplain={handleExplain}
            onSeeBestMove={handleSeeBestMove}
          />
        </div>
      </div>

      <Footer
        moves={moveHistory}
        currentPly={currentPly}
        result="*"
        onMoveClick={handleMoveClick}
      />
    </div>
  );
}
