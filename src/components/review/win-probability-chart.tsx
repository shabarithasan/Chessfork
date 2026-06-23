"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type MouseHandlerDataParam,
} from "recharts";

export type WinProbabilityPoint = {
  evaluation?: number;
  move: string;
  ply: number;
  winProbability?: number;
};

export function WinProbabilityChart({
  data,
  onSelectPly,
}: {
  data: WinProbabilityPoint[];
  onSelectPly: (ply: number) => void;
}) {
  const normalizedData = data.map((point) => ({
    ...point,
    evaluation:
      typeof point.evaluation === "number"
        ? point.evaluation
        : typeof point.winProbability === "number"
          ? (point.winProbability - 50) / 10
          : 0,
  }));

  return (
    <div className="h-56 min-w-0 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <ComposedChart
          data={normalizedData}
          margin={{ bottom: 8, left: -10, right: 8, top: 12 }}
          onClick={(state: MouseHandlerDataParam) => {
            const index = Number(state.activeTooltipIndex);
            const point = Number.isFinite(index) ? normalizedData[index] : undefined;
            if (point) {
              onSelectPly(point.ply);
            }
          }}
        >
          <defs>
            <linearGradient id="evaluationFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.58} />
              <stop offset="50%" stopColor="#00d4aa" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.34} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis
            dataKey="move"
            minTickGap={18}
            stroke="rgba(148,163,184,0.52)"
            tick={{ fill: "rgba(148,163,184,0.78)", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            domain={[-8, 8]}
            stroke="rgba(148,163,184,0.52)"
            tick={{ fill: "rgba(148,163,184,0.78)", fontSize: 11 }}
            tickFormatter={(value) => `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(0)}`}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(10,10,15,0.96)",
              border: "1px solid rgba(0,212,170,0.22)",
              borderRadius: "12px",
              boxShadow: "0 0 20px rgba(0,212,170,0.12)",
              color: "#f1f5f9",
            }}
            formatter={(value) => [`${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(2)}`, "Evaluation"]}
            labelFormatter={(label) => `Move ${label}`}
          />
          <ReferenceLine stroke="rgba(241,245,249,0.32)" strokeDasharray="4 4" y={0} />
          <Area dataKey="evaluation" fill="url(#evaluationFill)" stroke="transparent" type="monotone" />
          <Line
            activeDot={{ fill: "#00d4aa", r: 5, stroke: "#f8fafc", strokeWidth: 2 }}
            dataKey="evaluation"
            dot={false}
            stroke="#00d4aa"
            strokeWidth={3}
            type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
