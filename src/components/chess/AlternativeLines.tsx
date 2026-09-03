"use client";

import { useCallback } from "react";
import { Chess } from "chess.js";
import { motion, useReducedMotion } from "framer-motion";
import type { EngineLine } from "@/types/platform";

interface AlternativeLinesProps {
  lines: EngineLine[];
  fenBefore: string;
  moveNumber?: number;
  onSelectLine?: (fen: string, san: string) => void;
  /** True only while Stockfish is actively refreshing these PVs. */
  isLive?: boolean;
}

function formatScore(score: number): string {
  if (score > 100_000) return "M" + (10_000 - (score - 100_000));
  if (score < -100_000) return "-M" + (10_000 - (score + 100_000));
  const cp = score / 100;
  return `${cp >= 0 ? "+" : ""}${cp.toFixed(1)}`;
}

function formatMoveNumber(moveNum: number, side: "white" | "black"): string {
  return side === "white" ? `${moveNum}.` : `${moveNum}...`;
}

function AlternativeLines({ lines, fenBefore, moveNumber, onSelectLine, isLive = false }: AlternativeLinesProps) {
  const reduceMotion = useReducedMotion();
  const handleLineClick = useCallback(
    (san: string) => {
      try {
        const chess = new Chess(fenBefore);
        const move = chess.move(san);
        if (move && onSelectLine) {
          onSelectLine(chess.fen(), san);
        }
      } catch {}
    },
    [fenBefore, onSelectLine],
  );

  if (!lines || lines.length === 0) {
    if (isLive) {
      return (
        <div className="mt-3.5 flex flex-col gap-1.5 h-[100px]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 overflow-hidden h-[27px] rounded px-1 -mx-1 animate-pulse">
              <span className="rounded-md border border-neutral-700 bg-neutral-800/50 px-1.5 py-[2px] min-w-[42px] h-[20px]" />
              <div className="h-[14px] bg-neutral-800/50 rounded w-2/3" />
            </div>
          ))}
        </div>
      );
    }
    return <div className="mt-3.5 h-[100px]" />; // Preserve the layout block height
  }

  const startMoveNum = moveNumber ?? 1;

  return (
    <div className="mt-3.5">
      <div className="flex flex-col gap-1.5">
        {lines.map((line, lineIndex) => {
          const allMoves = [line.san, ...line.line.slice(1)];
          const animKey = `${line.rank}-${line.san}-${line.score}-${line.depth}`;
          return (
            <motion.div
              key={animKey}
              initial={{ backgroundColor: "rgba(251, 191, 36, 0.25)" }}
              animate={isLive && !reduceMotion
                ? {
                    backgroundColor: ["rgba(251, 191, 36, 0)", "rgba(251, 191, 36, 0.12)", "rgba(251, 191, 36, 0)"],
                    filter: ["brightness(0.82)", "brightness(1.3)", "brightness(0.82)"],
                  }
                : { backgroundColor: "rgba(0, 0, 0, 0)", filter: "brightness(1)" }}
              transition={isLive && !reduceMotion
                ? { duration: 1.65, ease: "easeInOut", repeat: Infinity, delay: lineIndex * 0.18 }
                : { duration: 0.6, ease: "easeOut" }}
              className="flex items-center gap-2 overflow-hidden h-[27px] rounded px-1 -mx-1"
            >
              <span className="rounded-md border border-neutral-600 bg-transparent text-neutral-200 px-1.5 py-[2px] text-center font-mono font-semibold min-w-[42px] text-[11px]">
                {formatScore(line.score)}
              </span>
              <span className="overflow-hidden whitespace-nowrap font-mono text-neutral-400 text-[13px]">
                {allMoves.map((san, moveIdx) => {
                  let initialTurn = "white";
                  try {
                    initialTurn = new Chess(fenBefore).turn() === "w" ? "white" : "black";
                  } catch {}
                  const moveSide = (initialTurn === "white")
                    ? (moveIdx % 2 === 0 ? "white" : "black")
                    : (moveIdx % 2 === 0 ? "black" : "white");
                  
                  const moveNumIncrement = initialTurn === "white" ? Math.floor(moveIdx / 2) : Math.floor((moveIdx + 1) / 2);
                  const moveNum = startMoveNum + moveNumIncrement;
                  
                  const isFirst = moveIdx === 0;
                  return (
                    <span key={moveIdx}>
                      <span className="mr-1 tabular-nums text-neutral-600">
                        {formatMoveNumber(moveNum, moveSide as "white" | "black")}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleLineClick(san)}
                        className={`-mx-[3px] inline-flex items-center rounded-[3px] px-[3px] transition-colors duration-150 hover:bg-neutral-700 hover:text-white ${
                          isFirst ? "font-semibold text-white" : ""
                        }`}
                      >
                        {san}
                      </button>{" "}
                    </span>
                  );
                })}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export { AlternativeLines, formatScore };
