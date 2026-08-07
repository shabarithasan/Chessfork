"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Dot,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

interface DataPoint {
  move: number;
  score: number;
}

interface MomentumChartProps {
  data: DataPoint[];
}

export function MomentumChart({ data }: MomentumChartProps) {
  const [perspective, setPerspective] = useState<"white" | "black">("white");

  /* ── Flip scores for black perspective ── */
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        move: d.move,
        score: perspective === "white" ? d.score : -d.score,
      })),
    [data, perspective],
  );

  const scores = chartData.map((d) => d.score);
  const minScore = Math.min(...scores, 0);
  const maxScore = Math.max(...scores, 0);
  const padding = Math.max(Math.abs(minScore), Math.abs(maxScore), 100) * 0.15;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-lg">
      {/* Header + Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Game Momentum
        </span>

        {/* Toggle: Yellow = White, Grey = Black */}
        <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 p-0.5">
          <button
            type="button"
            onClick={() => setPerspective("white")}
            className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
              perspective === "white"
                ? "bg-yellow-400 text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            White
          </button>
          <button
            type="button"
            onClick={() => setPerspective("black")}
            className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
              perspective === "black"
                ? "bg-gray-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Black
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 6, right: 4, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="momentumFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dc2626" stopOpacity={0.55} />
                <stop offset="50%" stopColor="#6b7280" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#6b7280" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />

            <XAxis
              dataKey="move"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
              label={false}
            />

            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              domain={[minScore - padding, maxScore + padding]}
              tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${(v / 100).toFixed(1)}`}
            />

            <Area
              type="monotone"
              dataKey="score"
              stroke="#dc2626"
              strokeWidth={2}
              fill="url(#momentumFill)"
              dot={<DotComponent />}
              activeDot={{ r: 5, fill: "#dc2626", stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Small circular dot for each data point ── */
function DotComponent(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props;
  if (cx === undefined || cy === undefined) return null;
  return (
    <circle cx={cx} cy={cy} r={3} fill="#dc2626" stroke="#fff" strokeWidth={1.5} />
  );
}
