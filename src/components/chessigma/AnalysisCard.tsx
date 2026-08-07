"use client";

import { motion, AnimatePresence } from "framer-motion";

interface AnalysisCardProps {
  score: number;
  title: string;
  body: string;
  tagText: string;
  loading?: boolean;
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-200 ${className ?? ""}`} />
  );
}

export function AnalysisCard({ score, title, body, tagText, loading = false }: AnalysisCardProps) {
  const isPositive = score >= 0;
  const formattedScore = `${isPositive ? "+" : ""}${(score / 100).toFixed(2)}`;
  const parts = body.split(tagText);

  if (loading) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-white p-5 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-5 w-20" />
        </div>
        <SkeletonBlock className="mb-2 h-6 w-3/4" />
        <SkeletonBlock className="mb-2 h-4 w-full" />
        <SkeletonBlock className="mb-5 h-4 w-5/6" />
        <SkeletonBlock className="h-11 w-full rounded-xl" />
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 24, mass: 0.6 }}
      className="rounded-2xl bg-white p-5 shadow-lg"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Analysis
        </span>
        <motion.span
          key={formattedScore}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className={`font-mono text-lg font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}
        >
          {formattedScore}
        </motion.span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <h3 className="mb-2 text-lg font-extrabold text-gray-900">
            {title}
          </h3>

          <p className="mb-5 text-sm leading-relaxed text-gray-600">
            {parts.map((part, i) => (
              <span key={i}>
                {part}
                {i < parts.length - 1 && (
                  <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-sm font-bold text-orange-700">
                    {tagText}
                  </span>
                )}
              </span>
            ))}
          </p>
        </motion.div>
      </AnimatePresence>

      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-gray-900 shadow-sm transition hover:bg-yellow-300"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
        Explain
      </motion.button>
    </motion.div>
  );
}
