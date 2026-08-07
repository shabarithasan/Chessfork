"use client";

import { useCallback } from "react";
import { Chess } from "chess.js";
import type { EngineLine } from "@/types/platform";

interface AlternativeLinesProps {
  lines: EngineLine[];
  fenBefore: string;
  moveNumber?: number;
  onSelectLine?: (fen: string, san: string) => void;
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

function AlternativeLines({ lines, fenBefore, moveNumber, onSelectLine }: AlternativeLinesProps) {
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
    return null;
  }

  const startMoveNum = moveNumber ?? 1;

  return (
    <div className="mt-3.5">
      <div className="flex flex-col gap-1.5">
        {lines.map((line) => {
          const allMoves = [line.san, ...line.line.slice(1)];
          return (
            <div key={`${line.rank}-${line.san}`} className="flex items-center gap-2 overflow-hidden h-[27px]">
              <span className="rounded border px-1.5 py-0.5 text-center font-mono font-semibold border-neutral-300 bg-neutral-100 text-neutral-900 min-w-[42px] text-[11px]">
                {formatScore(line.score)}
              </span>
              <span className="overflow-hidden whitespace-nowrap font-mono text-neutral-400 text-[13px]">
                {allMoves.map((san, moveIdx) => {
                  const moveNum = startMoveNum + moveIdx;
                  const side = moveIdx % 2 === 0 ? "black" : "white";
                  const isFirst = moveIdx === 0;
                  return (
                    <span key={moveIdx}>
                      <span className="mr-1 tabular-nums text-neutral-600">
                        {formatMoveNumber(moveNum, side)}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { AlternativeLines, formatScore };
