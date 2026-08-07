"use client";

import { useCallback } from "react";
import { Chessboard } from "react-chessboard";
import type { AnalysisResult } from "./ChessEngine";
import styles from "./styles.module.css";

interface ChessBoardSectionProps {
  fen: string;
  orientation: "white" | "black";
  lastMove: { from: string; to: string } | null;
  analysis: AnalysisResult | null;
  onPieceDrop: (from: string, to: string) => boolean;
  flipped: boolean;
}

const arrowOpacities = [0.94, 0.56, 0.38];

export function ChessBoardSection({
  fen,
  lastMove,
  analysis,
  onPieceDrop,
  flipped,
}: ChessBoardSectionProps) {
  const orientation = flipped ? "black" : "white";

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    squareStyles[lastMove.from] = {
      backgroundColor: "rgba(75, 139, 191, 0.2)",
      borderRadius: "2px",
    };
    squareStyles[lastMove.to] = {
      backgroundColor: "rgba(75, 139, 191, 0.3)",
      borderRadius: "2px",
    };
  }

  const arrows: Array<{ startSquare: string; endSquare: string; color: string }> = [];
  if (analysis?.topMoves) {
    analysis.topMoves.slice(0, 3).forEach((m, i) => {
      arrows.push({
        startSquare: m.from,
        endSquare: m.to,
        color: `rgba(75, 139, 191, ${arrowOpacities[i] ?? 0.38})`,
      });
    });
  }

  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (!targetSquare) return false;
      return onPieceDrop(sourceSquare, targetSquare);
    },
    [onPieceDrop],
  );

  return (
    <div className={styles.boardContainer}>
      <div className={styles.boardWrapper}>
        <div className="relative">
          <Chessboard
            options={{
              position: fen,
              boardOrientation: orientation,
              onPieceDrop: ({ sourceSquare, targetSquare }) =>
                handlePieceDrop(sourceSquare, targetSquare ?? ""),
              squareStyles,
              arrows,
              allowDragging: true,
              showNotation: true,
              animationDurationInMs: 200,
              boardStyle: {
                borderRadius: "8px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
              },
              darkSquareStyle: { backgroundColor: "#4b8bbf30" },
              lightSquareStyle: { backgroundColor: "#e8eaed10" },
            }}
          />

        </div>
      </div>
    </div>
  );
}
