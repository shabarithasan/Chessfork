"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

import type { MoveAnalysis } from "@/lib/game-analyzer";
import { getMoveNumber, getSide } from "@/lib/pgn-parser";

interface MoveListProps {
  moves: { san: string }[];
  analysis: MoveAnalysis[] | null;
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
  whiteAccuracy?: number;
  blackAccuracy?: number;
}

const classificationIcons: Record<string, { icon: string; color: string; label: string }> = {
  Brilliant: { icon: "★", color: "text-yellow-400", label: "Brilliant" },
  Best: { icon: "●", color: "text-green-400", label: "Best" },
  Excellent: { icon: "●", color: "text-emerald-400", label: "Excellent" },
  Good: { icon: "○", color: "text-slate-400", label: "Good" },
  Inaccuracy: { icon: "▲", color: "text-yellow-500", label: "Inaccuracy" },
  Mistake: { icon: "▼", color: "text-orange-400", label: "Mistake" },
  Blunder: { icon: "✕", color: "text-red-500", label: "Blunder" },
};

const defaultIcon = { icon: "○", color: "text-slate-500", label: "Unanalyzed" };

export function MoveList({
  moves,
  analysis,
  currentMoveIndex,
  onMoveClick,
  whiteAccuracy,
  blackAccuracy,
}: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentRowRef.current) {
      currentRowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentMoveIndex]);

  const pairs: Array<[number, { san: string }, { san: string } | null]> = [];
  for (let i = 0; i < moves.length; i += 2) {
    const whiteMove = moves[i];
    const blackMove = i + 1 < moves.length ? moves[i + 1] : null;
    pairs.push([Math.floor(i / 2) + 1, whiteMove, blackMove]);
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex h-full flex-col rounded-xl border border-[#1e1e2e] bg-[#111118] shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-[#1e1e2e] px-3 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Moves</h3>
        <div className="flex gap-3 text-[10px]">
          {whiteAccuracy !== undefined && (
            <span className="text-slate-400">
              <span className="text-white">{whiteAccuracy}%</span>
            </span>
          )}
          {blackAccuracy !== undefined && (
            <span className="text-slate-400">
              <span className="text-slate-300">{blackAccuracy}%</span>
            </span>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
        {pairs.map(([number, whiteMove, blackMove], pairIndex) => {
          const whiteIndex = pairIndex * 2;
          const blackIndex = pairIndex * 2 + 1;
          const isWhiteCurrent = whiteIndex === currentMoveIndex;
          const isBlackCurrent = blackIndex === currentMoveIndex;
          const whiteAnalysis = analysis?.[whiteIndex] ?? null;
          const blackAnalysis = blackMove && analysis?.[blackIndex] ? analysis[blackIndex] : null;
          const whiteIcon = whiteAnalysis ? classificationIcons[whiteAnalysis.classification] ?? defaultIcon : defaultIcon;
          const blackIcon = blackAnalysis ? classificationIcons[blackAnalysis.classification] ?? defaultIcon : defaultIcon;

          return (
            <div
              key={number}
              ref={isWhiteCurrent || isBlackCurrent ? currentRowRef : undefined}
              className="grid grid-cols-[2.5rem_1fr_1fr] gap-0 text-xs"
            >
              <div className="flex items-center px-2 py-1 text-[10px] text-slate-600">
                {number}.
              </div>

              <button
                onClick={() => onMoveClick(whiteIndex)}
                className={`flex items-center gap-1.5 px-2 py-1 text-left transition ${
                  isWhiteCurrent
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "text-slate-300 hover:bg-[#1a1a1a]"
                }`}
              >
                <span className={`text-[9px] ${whiteIcon.color}`} title={whiteIcon.label}>
                  {whiteIcon.icon}
                </span>
                <span className="font-mono text-[13px] font-medium">{whiteMove.san}</span>
              </button>

              <button
                onClick={() => blackMove && onMoveClick(blackIndex)}
                disabled={!blackMove}
                className={`flex items-center gap-1.5 px-2 py-1 text-left transition ${
                  isBlackCurrent
                    ? "bg-cyan-500/15 text-cyan-300"
                    : blackMove
                      ? "text-slate-300 hover:bg-[#1a1a1a]"
                      : "text-slate-700"
                }`}
              >
                {blackMove && (
                  <>
                    <span className={`text-[9px] ${blackIcon.color}`} title={blackIcon.label}>
                      {blackIcon.icon}
                    </span>
                    <span className="font-mono text-[13px] font-medium">{blackMove.san}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}

        {moves.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-slate-500">
            No moves loaded
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-[#1e1e2e] px-3 py-1.5 text-[9px] text-slate-600">
        <span className="flex items-center gap-1">
          <span className="text-green-400">●</span> Best
        </span>
        <span className="flex items-center gap-1">
          <span className="text-yellow-500">▲</span> Inaccuracy
        </span>
        <span className="flex items-center gap-1">
          <span className="text-orange-400">▼</span> Mistake
        </span>
        <span className="flex items-center gap-1">
          <span className="text-red-500">✕</span> Blunder
        </span>
      </div>
    </motion.div>
  );
}
