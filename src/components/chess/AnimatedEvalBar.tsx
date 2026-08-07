"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface AnimatedEvalBarProps {
  evalScore: number;
  mate: number | null;
  depth: number;
  side?: "white" | "black";
}

function evalToPercent(evalScore: number): number {
  const clamped = Math.max(-500, Math.min(500, evalScore));
  return 50 + (clamped / 500) * 50;
}

function formatEval(evalScore: number, mate: number | null): string {
  if (mate !== null) {
    return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  }
  const inCp = evalScore / 100;
  const absCp = Math.abs(inCp);
  if (absCp >= 10) return `${inCp > 0 ? "+" : ""}${inCp.toFixed(0)}`;
  if (absCp >= 1) return `${inCp > 0 ? "+" : ""}${inCp.toFixed(1)}`;
  return `${inCp > 0 ? "+" : ""}${inCp.toFixed(2)}`;
}

function winPercent(evalScore: number, mate: number | null): number {
  if (mate !== null) return mate > 0 ? 100 : 0;
  const clamped = Math.max(-500, Math.min(500, evalScore));
  return 50 + (clamped / 500) * 50;
}

export function AnimatedEvalBar({ evalScore, mate, depth, side = "white" }: AnimatedEvalBarProps) {
  const whitePct = mate !== null ? (mate > 0 ? 100 : 0) : evalToPercent(evalScore);
  const displayEval = formatEval(evalScore, mate);
  const wWin = winPercent(evalScore, mate);
  const bWin = 100 - wWin;

  const isDecisive = Math.abs(evalScore) >= 200 || mate !== null;
  const isWhiteWinning = evalScore > 0 || (mate !== null && mate > 0);

  const barColor = isDecisive
    ? isWhiteWinning
      ? "from-emerald-500 via-emerald-400 to-emerald-300"
      : "from-red-500 via-red-400 to-red-300"
    : evalScore > 50
      ? "from-emerald-500 via-lime-400 to-yellow-300"
      : evalScore < -50
        ? "from-red-500 via-orange-400 to-yellow-300"
        : "from-stone-500 via-stone-400 to-stone-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      {/* Eval number */}
      <div className="mb-1.5 flex items-center justify-between">
        <motion.div
          key={displayEval}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`font-mono text-lg font-black tracking-tight ${
            mate !== null
              ? "text-amber-400"
              : evalScore >= 0
                ? "text-emerald-400"
                : "text-red-400"
          }`}
        >
          {displayEval}
          {mate !== null && (
            <motion.span
              initial={{ rotate: -10, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              className="ml-1.5 inline-block rounded bg-amber-500/20 px-1 py-px text-[9px] font-bold text-amber-400"
            >
              MATE
            </motion.span>
          )}
        </motion.div>
        <div className="flex items-center gap-2">
          <motion.span
            className="text-[9px] font-mono text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            d{depth}
          </motion.span>
          <span className={`text-[10px] font-bold ${evalScore >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {side === "white" ? "W" : "B"}
          </span>
        </div>
      </div>

      {/* Bar track */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#1a1a2e] shadow-inner">
        {/* Background gradient */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/20 via-stone-500/20 to-emerald-500/20" />

        {/* White fill (from left) */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r shadow-lg"
          animate={{ width: `${whitePct}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18, mass: 1.2 }}
        >
          <div className={`h-full w-full rounded-full bg-gradient-to-r ${barColor} shadow-lg`} />
          {/* Glow overlay */}
          {isDecisive && (
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  "inset 0 0 8px rgba(255,255,255,0.3)",
                  "inset 0 0 16px rgba(255,255,255,0.5)",
                  "inset 0 0 8px rgba(255,255,255,0.3)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </motion.div>

        {/* Center marker */}
        <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-white/20" />

        {/* Animated dot at current eval */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 z-10"
          animate={{ left: `${whitePct}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18, mass: 1.2 }}
        >
          <motion.div
            className="size-3.5 rounded-full border-2 shadow-lg"
            animate={{
              borderColor: isDecisive
                ? isWhiteWinning ? "#22C55E" : "#EF4444"
                : "#A1A1AA",
              backgroundColor: isDecisive
                ? isWhiteWinning ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"
                : "rgba(161,161,170,0.2)",
              scale: isDecisive ? [1, 1.3, 1] : 1,
            }}
            transition={{ duration: 1.5, repeat: isDecisive ? Infinity : 0, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Eval markers at key points */}
        <div className="absolute inset-0 flex items-center px-2">
          <div className="flex w-full justify-between text-[7px] font-mono text-white/30">
            <span>-5</span>
            <span>-3</span>
            <span>-1</span>
            <span>0</span>
            <span>+1</span>
            <span>+3</span>
            <span>+5</span>
          </div>
        </div>
      </div>

      {/* Win probability */}
      <div className="mt-1.5 flex items-center justify-between text-[10px]">
        <motion.span
          key={`w-${wWin}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-bold text-emerald-400"
        >
          {wWin.toFixed(0)}%
        </motion.span>
        <div className="flex items-center gap-1.5">
          <motion.div
            className="size-2 rounded-full"
            animate={{
              backgroundColor: isDecisive && isWhiteWinning ? "#22C55E" : "#A1A1AA",
            }}
          />
          <span className="text-[9px] text-slate-600">White</span>
          <span className="text-[9px] text-slate-600">|</span>
          <span className="text-[9px] text-slate-600">Black</span>
          <motion.div
            className="size-2 rounded-full"
            animate={{
              backgroundColor: isDecisive && !isWhiteWinning ? "#EF4444" : "#A1A1AA",
            }}
          />
        </div>
        <motion.span
          key={`b-${bWin}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-bold text-red-400"
        >
          {bWin.toFixed(0)}%
        </motion.span>
      </div>
    </motion.div>
  );
}
