"use client";

import { motion } from "framer-motion";

interface BestMovesProps {
  bestMove: string;
  bestLine: string[];
  eval: number;
  depth: number;
}

export function BestMoves({ bestMove, bestLine, eval: evalScore, depth }: BestMovesProps) {
  const moves = bestLine.length > 0
    ? bestLine.map((san, i) => ({
        san,
        eval: evalScore - i * 5,
        isBest: i === 0,
      }))
    : bestMove
      ? [{ san: bestMove, eval: evalScore, isBest: true }]
      : [];

  const displayMoves = moves.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Best Moves
        </h3>
        <span className="text-[10px] text-slate-600">d{depth}</span>
      </div>

      <div className="max-h-48 space-y-1 overflow-y-auto">
        {displayMoves.map((move, i) => {
          const isPositive = move.eval >= 0;
          const isImprovement = i === 0 && evalScore > 0;

          return (
            <motion.div
              key={`${move.san}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition hover:bg-[#1a1a1a] ${
                move.isBest ? "border-l-2 border-[#77b82b] bg-[#77b82b]/5" : "border-l-2 border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-4 text-[10px] font-medium text-slate-600">
                  {i + 1}.
                </span>
                <span className="font-mono text-sm font-semibold text-slate-200">
                  {move.san}
                </span>
              </div>
              <span
                className={`font-mono text-[11px] font-medium ${
                  isImprovement
                    ? "text-[#22c55e]"
                    : !move.isBest && i > 0
                      ? "text-[#ef4444]"
                      : isPositive
                        ? "text-[#22c55e]"
                        : "text-[#ef4444]"
                }`}
              >
                {move.eval > 0 ? "+" : ""}{(move.eval / 100).toFixed(1)}
              </span>
            </motion.div>
          );
        })}

        {displayMoves.length === 0 && (
          <p className="py-3 text-center text-[11px] text-slate-500">
            Analysis pending...
          </p>
        )}
      </div>
    </motion.div>
  );
}
