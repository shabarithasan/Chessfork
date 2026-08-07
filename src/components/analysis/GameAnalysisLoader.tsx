"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";

const PHASE_LABELS: Record<string, string> = {
  opening: "Analyzing opening...",
  middlegame: "Evaluating middlegame positions...",
  endgame: "Calculating endgame lines...",
};

interface GameAnalysisLoaderProps {
  current: number;
  total: number;
  phase: string;
  onCancel?: () => void;
}

export function GameAnalysisLoader({ current, total, phase, onCancel }: GameAnalysisLoaderProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const rate = current > 0 ? elapsed / current : 0;
  const remaining = rate * (total - current);
  const eta = remaining > 0 && remaining < 3600
    ? remaining >= 60
      ? `${Math.floor(remaining / 60)}m ${Math.ceil(remaining % 60)}s`
      : `${Math.ceil(remaining)}s`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-8"
    >
      <div className="relative">
        <Loader2 className="size-10 animate-spin text-amber-400" />
        <span className="absolute inset-0 grid place-items-center text-[9px] font-bold text-amber-400">
          {pct}
        </span>
      </div>

      <div className="w-full space-y-2 text-center">
        <p className="text-sm font-medium text-white">
          {PHASE_LABELS[phase] ?? "Analyzing positions..."}
        </p>
        <p className="text-xs text-slate-500">
          Move {Math.min(current, total)} of {total}
          {eta ? ` · ~${eta} remaining` : ""}
        </p>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#2a2a2a]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-600">
          <span>Stockfish 18 · Depth 20</span>
          <span className="capitalize">{phase}</span>
        </div>
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20"
        >
          <X className="size-3" />
          Cancel
        </button>
      )}
    </motion.div>
  );
}
