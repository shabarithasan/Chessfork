"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface ExplanationPanelProps {
  explanation: string | null;
  classification: string | null;
  evalChange: number | null;
  isLoading: boolean;
}

const classificationConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  Brilliant: {
    icon: <Award className="size-3.5" />,
    color: "text-[#22c55e]",
    bg: "bg-[#22c55e]/10",
  },
  Best: {
    icon: <CheckCircle2 className="size-3.5" />,
    color: "text-[#22c55e]",
    bg: "bg-[#22c55e]/10",
  },
  Good: {
    icon: <ThumbsUp className="size-3.5" />,
    color: "text-[#86efac]",
    bg: "bg-[#86efac]/10",
  },
  Inaccuracy: {
    icon: <TrendingDown className="size-3.5" />,
    color: "text-[#fbbf24]",
    bg: "bg-[#fbbf24]/10",
  },
  Mistake: {
    icon: <AlertTriangle className="size-3.5" />,
    color: "text-[#f97316]",
    bg: "bg-[#f97316]/10",
  },
  Blunder: {
    icon: <ThumbsDown className="size-3.5" />,
    color: "text-[#ef4444]",
    bg: "bg-[#ef4444]/10",
  },
};

const defaultConfig = {
  icon: <CheckCircle2 className="size-3.5" />,
  color: "text-slate-400",
  bg: "bg-slate-400/10",
};

export function ExplanationPanel({
  explanation,
  classification,
  evalChange,
  isLoading,
}: ExplanationPanelProps) {
  const config = classification
    ? classificationConfig[classification] ?? defaultConfig
    : defaultConfig;

  const evalChangeDisplay =
    evalChange !== null
      ? evalChange > 0
        ? `+${(evalChange / 100).toFixed(2)}`
        : `${(evalChange / 100).toFixed(2)}`
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-3 shadow-lg"
    >
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        AI Coach
      </h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-[#77b82b]" />
            <span className="text-[10px] text-slate-500">Analyzing position...</span>
          </div>
        </div>
      ) : classification ? (
        <div className="space-y-3">
          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${config.bg}`}>
            <span className={config.color}>{config.icon}</span>
            <span className={`text-[11px] font-bold ${config.color}`}>
              {classification}
            </span>
          </div>

          {evalChangeDisplay && (
            <div className="flex items-center gap-1.5">
              {evalChange !== null && evalChange >= 0 ? (
                <TrendingUp className="size-3.5 text-[#22c55e]" />
              ) : (
                <TrendingDown className="size-3.5 text-[#ef4444]" />
              )}
              <span
                className={`font-mono text-xs font-semibold ${
                  evalChange !== null && evalChange >= 0
                    ? "text-[#22c55e]"
                    : "text-[#ef4444]"
                }`}
              >
                {evalChangeDisplay}
              </span>
              <span className="text-[10px] text-slate-500">eval change</span>
            </div>
          )}

          <p className="text-sm leading-relaxed text-slate-300">
            {explanation ?? "No explanation available."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ChessPieceIcon />
          <p className="mt-2 text-xs text-slate-500">
            Make a move to get AI coaching feedback
          </p>
        </div>
      )}
    </motion.div>
  );
}

function ChessPieceIcon() {
  return (
    <svg
      className="size-8 text-slate-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
    >
      <path d="M12 2c-1.5 0-3 1-3 3 0 1.5.5 2.5 1 3-.5.5-1 1.5-1 2.5s.5 2 1 2.5c-.5.5-1 1.5-1 2.5 0 1.5 1.5 2.5 3 2.5s3-1 3-2.5c0-1-.5-2-1-2.5.5-.5 1-1.5 1-2.5s-.5-2-1-2.5c.5-.5 1-1.5 1-3 0-2-1.5-3-3-3z" />
    </svg>
  );
}
