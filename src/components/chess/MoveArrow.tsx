"use client";

import { type CSSProperties } from "react";

export interface MoveArrowInfo {
  from: string;
  to: string;
  san: string;
  eval: number;
}

interface MoveArrowProps {
  move: MoveArrowInfo;
  rank: number;
  opacity: number;
  onClick?: (san: string) => void;
}

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

export function squareToBoardPos(
  square: string,
  orientation: "white" | "black",
): { x: number; y: number } {
  const fileIdx = files.indexOf(square[0]);
  const rankIdx = parseInt(square[1], 10) - 1;

  if (orientation === "white") {
    return { x: fileIdx / 8, y: (7 - rankIdx) / 8 };
  }
  return { x: (7 - fileIdx) / 8, y: rankIdx / 8 };
}

export function MoveArrowBadge({
  move,
  rank,
  opacity,
  onClick,
  orientation,
}: MoveArrowProps & { orientation: "white" | "black" }) {
  const pos = squareToBoardPos(move.to, orientation);

  const style: CSSProperties = {
    position: "absolute",
    left: `${(pos.x + 1 / 16) * 100}%`,
    top: `${(pos.y + 1 / 16) * 100}%`,
    transform: "translate(-50%, -50%)",
    pointerEvents: "auto",
    zIndex: 30 - rank,
  };

  return (
    <div style={style}>
      <button
        onClick={() => onClick?.(move.san)}
        title={`Play ${move.san} (${formatEval(move.eval)})`}
        className="flex items-center gap-0.5 whitespace-nowrap rounded px-1 py-px text-[9px] font-bold leading-tight text-blue-300 shadow-lg transition hover:scale-110"
        style={{ backgroundColor: `rgba(59, 130, 246, ${Math.min(opacity + 0.1, 0.3)})`, opacity }}
      >
        <span>{move.san}</span>
        <span className="opacity-70">{formatEval(move.eval)}</span>
      </button>
    </div>
  );
}

function formatEval(eval_: number): string {
  if (eval_ > 5000) return `M${Math.round((100000 - eval_) / 100)}`;
  if (eval_ < -5000) return `-M${Math.round((100000 + eval_) / 100)}`;
  return `${eval_ >= 0 ? "+" : ""}${(eval_ / 100).toFixed(1)}`;
}
