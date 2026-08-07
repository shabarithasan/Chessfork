"use client";

import { motion } from "framer-motion";
import { Chessboard } from "react-chessboard";

interface ChessGameProps {
  fen: string;
  selectedSquare: string | null;
  legalTargets: Set<string>;
  legalMoves: Array<{ to: string; captured?: unknown }>;
  onSquareClick: (square: string) => void;
  onPieceDrop?: (from: string, to: string) => boolean;
}

export function ChessGame({ fen, selectedSquare, legalTargets, legalMoves, onSquareClick, onPieceDrop }: ChessGameProps) {
  const squareStyles: Record<string, React.CSSProperties> = {};

  if (selectedSquare) {
    squareStyles[selectedSquare] = {
      backgroundColor: "rgba(75, 139, 191, 0.3)",
      borderRadius: "4px",
      boxShadow: "inset 0 0 0 2px rgba(75, 139, 191, 0.6)",
    };
  }

  for (const to of legalTargets) {
    const targetMove = legalMoves.find((m) => m.to === to);
    const isCapture = targetMove?.captured;
    squareStyles[to] = {
      background: isCapture
        ? "radial-gradient(circle, transparent 60%, rgba(34, 197, 94, 0.35) 60%)"
        : "radial-gradient(circle, rgba(34, 197, 94, 0.4) 20%, transparent 20%)",
      borderRadius: "50%",
    };
  }

  return (
    <motion.div
      layout
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 26, mass: 0.5 }}
      className="h-full w-full"
    >
      <Chessboard
        options={{
          position: fen,
          boardOrientation: "white",
          onSquareClick: ({ square }) => onSquareClick(square),
          onPieceDrop: ({ sourceSquare, targetSquare }) =>
            onPieceDrop ? onPieceDrop(sourceSquare, targetSquare ?? "") : false,
          squareStyles,
          allowDragging: true,
          showNotation: true,
          animationDurationInMs: 220,
          boardStyle: { borderRadius: "8px" },
          darkSquareStyle: { backgroundColor: "#4b8bbf30" },
          lightSquareStyle: { backgroundColor: "#e8eaed10" },
        }}
      />
    </motion.div>
  );
}
