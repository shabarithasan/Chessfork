"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

interface EvalRecord {
  move: number;
  score: number;
}

interface EvalGraphProps {
  data: EvalRecord[];
  currentIndex: number;
  onSeek: (index: number) => void;
}

export function EvalGraph({ data, currentIndex, onSeek }: EvalGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const scores = useMemo(() => data.map((d) => d.score), [data]);
  const minScore = Math.min(...scores, 0);
  const maxScore = Math.max(...scores, 0);
  const padding = Math.max(Math.abs(minScore), Math.abs(maxScore), 100) * 0.15;

  const seekFromEvent = useCallback(
    (clientX: number) => {
      if (!containerRef.current || data.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const xRatio = (clientX - rect.left) / rect.width;
      const clampedRatio = Math.max(0, Math.min(1, xRatio));
      const dataIndex = Math.round(clampedRatio * (data.length - 1));
      const targetIndex = data[dataIndex].move - 1;
      if (targetIndex !== currentIndex) onSeek(targetIndex);
    },
    [data, currentIndex, onSeek],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      seekFromEvent(e.clientX);
    },
    [seekFromEvent],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      seekFromEvent(e.clientX);
    },
    [isDragging, seekFromEvent],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const currentMove = currentIndex + 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 24, mass: 0.6 }}
      className="rounded-2xl border border-white/10 bg-[#1e1f23] p-4 shadow-lg select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Evaluation Graph
        </span>
        {currentIndex >= 0 && (
          <motion.span
            key={currentMove}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400"
          >
            Move {currentMove}
          </motion.span>
        )}
      </div>

      <div className="relative h-48 w-full">
        {data.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No evaluation data yet
          </div>
        )}

        {data.length > 0 && (
          <>
            <div
              ref={containerRef}
              className={`absolute inset-0 z-10 ${isDragging ? "cursor-grabbing" : "cursor-pointer"}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
            />

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 6, right: 8, bottom: 0, left: -12 }}
              >
                <defs>
                  <linearGradient id="evalFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f0b429" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f0b429" stopOpacity={0.04} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#ffffff12"
                  vertical={false}
                />

                <XAxis
                  dataKey="move"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={{ stroke: "#ffffff15" }}
                />

                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[minScore - padding, maxScore + padding]}
                  tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${(v / 100).toFixed(1)}`}
                  width={40}
                />

                {currentIndex >= 0 && (
                  <ReferenceLine
                    x={currentMove}
                    stroke="#f0b429"
                    strokeWidth={2}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#f0b429"
                  strokeWidth={2}
                  fill="url(#evalFill)"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </motion.div>
  );
}
