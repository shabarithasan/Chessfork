"use client";

import { useMemo } from "react";
import { Chessboard } from "react-chessboard";
import type { ChessboardOptions } from "react-chessboard";
import { Chess } from "chess.js";

interface ChessBoardProps {
  fen: string;
  onMove: (from: string, to: string) => boolean;
  bestMove?: string | null;
  lastMove?: { from: string; to: string } | null;
  boardWidth?: number | string;
  orientation?: "white" | "black";
  preview?: boolean;
  onSquareClick?: (square: string) => void;
  canDragPiece?: (piece: string, square: string) => boolean;
}

export default function ChessBoard({
  fen,
  onMove,
  bestMove,
  lastMove,
  boardWidth = 440,
  orientation = "white",
  preview = false,
  onSquareClick,
  canDragPiece,
}: ChessBoardProps) {
  const options: ChessboardOptions = useMemo(() => {
    const arrows: { startSquare: string; endSquare: string; color: string }[] = [];
    const squareStyles: Record<string, React.CSSProperties> = {};

    if (lastMove && !preview) {
      squareStyles[lastMove.from] = { backgroundColor: "rgba(155, 199, 0, 0.41)" };
      squareStyles[lastMove.to] = { backgroundColor: "rgba(155, 199, 0, 0.41)" };
    }

    if (bestMove) {
      try {
        const c = new Chess(fen);
        const from = bestMove.slice(0, 2);
        const to = bestMove.slice(2, 4);
        const promotion = bestMove.slice(4, 5) || "q";
        const move = c.move({ from, to, promotion });
        if (move) {
          arrows.push({
            startSquare: move.from,
            endSquare: move.to,
            color: "rgb(105,168,0)",
          });
        }
      } catch {
        /* skip invalid move */
      }
    }

    return {
      position: fen,
      boardOrientation: orientation,
      showNotation: true,
      allowDragging: !preview,
      animationDurationInMs: 180,
      boardStyle: { borderRadius: 0 },
      lightSquareStyle: { backgroundColor: "#e0e0e8" },
      darkSquareStyle: { backgroundColor: "#3c465a" },
      lightSquareNotationStyle: { color: "rgba(28,29,33,0.74)", fontWeight: 700 },
      darkSquareNotationStyle: { color: "rgba(255,255,255,0.72)", fontWeight: 700 },
      squareStyles,
      arrows,
      onPieceDrop: ({ sourceSquare, targetSquare }) => {
        if (!targetSquare) return false;
        return onMove(sourceSquare, targetSquare);
      },
      canDragPiece: canDragPiece
        ? ({ piece, square }) => canDragPiece(piece.pieceType, square ?? "")
        : undefined,
      onSquareClick: onSquareClick ? ({ square }) => onSquareClick(square) : undefined,
    };
  }, [fen, lastMove, bestMove, orientation, preview, onMove, canDragPiece, onSquareClick]);

  return (
    <div
      className="relative overflow-hidden rounded-md shadow-[0_10px_15px_rgba(0,0,0,.4),0_4px_6px_rgba(0,0,0,.2)] aspect-square"
      style={{ width: boardWidth }}
    >
      <Chessboard options={options} />
    </div>
  );
}
