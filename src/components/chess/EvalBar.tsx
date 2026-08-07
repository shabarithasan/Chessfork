"use client";

import { motion } from "framer-motion";

interface EvalBarProps {
  evaluation: number;
  mate: number | null;
  depth: number;
  isAnalyzing: boolean;
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

export function EvalBar({ evaluation, mate, depth, isAnalyzing }: EvalBarProps) {
  const displayEval = formatEval(evaluation, mate);
  const whitePercent = mate !== null ? (mate > 0 ? 100 : 0) : evalToPercent(evaluation);
  const blackPercent = 100 - whitePercent;
  const isMate = mate !== null;
  const isWhiteWinning = isMate ? mate > 0 : evaluation > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex w-14 flex-col items-center"
    >
      {/* Eval number */}
      <motion.span
        key={displayEval}
        initial={{ opacity: 0, y: -6, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`mb-1 font-mono text-sm font-black tracking-tight ${
          isMate
            ? "text-amber-400"
            : isWhiteWinning
              ? "text-green-400"
              : "text-red-400"
        }`}
      >
        {displayEval}
      </motion.span>

      {/* Bar track */}
      <div className="relative h-full min-h-[14rem] w-3 overflow-hidden rounded-full border border-[#2a2a2a] bg-[#1a1a2e] shadow-inner">
        {/* Background gradient hint */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-green-500/10 via-transparent to-red-500/10" />

        {/* Black fill (bottom) */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 rounded-b-full bg-gradient-to-t from-[#111] via-[#2a2a2a] to-[#3a3a3a]"
          animate={{ height: `${blackPercent}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18, mass: 1.2 }}
        />

        {/* White fill (top) */}
        <motion.div
          className="absolute top-0 left-0 right-0 rounded-t-full bg-gradient-to-b from-[#f1f5f9] via-[#e2e8f0] to-[#cbd5e1] shadow-[inset_0_2px_8px_rgba(255,255,255,0.25)]"
          animate={{ height: `${whitePercent}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18, mass: 1.2 }}
        >
          {/* Top highlight */}
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-black/10" />
        </motion.div>

        {/* Center divider */}
        <div className="absolute left-1/2 top-1/2 h-2 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/60" />

        {/* Mate glow */}
        {isMate && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              boxShadow: isWhiteWinning
                ? ["inset 0 0 6px rgba(34,197,94,0.3)", "inset 0 0 12px rgba(34,197,94,0.5)", "inset 0 0 6px rgba(34,197,94,0.3)"]
                : ["inset 0 0 6px rgba(239,68,68,0.3)", "inset 0 0 12px rgba(239,68,68,0.5)", "inset 0 0 6px rgba(239,68,68,0.3)"],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          </div>
        )}
      </div>

      {/* Percentages */}
      <div className="mt-2 flex flex-col items-center gap-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-500">
        <motion.span
          key={`w-${whitePercent}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-bold text-white/80"
        >
          {Math.round(whitePercent)}%
        </motion.span>
        <div className="h-px w-3 bg-[#2a2a2a]" />
        <motion.span
          key={`b-${blackPercent}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-bold text-slate-400"
        >
          {Math.round(blackPercent)}%
        </motion.span>
      </div>

      {/* Labels */}
      <div className="mt-1.5 flex flex-col items-center gap-0.5 text-[7px] text-slate-600">
        <span className="flex items-center gap-0.5">
          <span className="inline-block size-1.5 rounded-full bg-[#f1f5f9]" />
          W
        </span>
        <span className="flex items-center gap-0.5">
          <span className="inline-block size-1.5 rounded-full bg-[#1a1a2e]" />
          B
        </span>
      </div>

      {/* Depth */}
      {depth > 0 && (
        <span className="mt-1.5 text-[8px] text-slate-600">d{depth}</span>
      )}
    </motion.div>
  );
}
