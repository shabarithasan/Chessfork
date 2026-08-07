"use client";

import { useMemo, useState } from "react";

/* ── Types ── */

interface HistoryPoint {
  moveNumber: number;
  score: number;
  status: "neutral" | "brilliant" | "blunder";
}

interface EvaluationHistoryGraphProps {
  gameHistory: HistoryPoint[];
  onPointClick?: (index: number) => void;
}

/* ── Constants ── */

const W = 1000;
const H = 120;

/* ── Component ── */

function EvaluationHistoryGraph({ gameHistory, onPointClick }: EvaluationHistoryGraphProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  /* Build points */
  const points = useMemo(() => {
    if (!gameHistory || gameHistory.length === 0) return [];
    const scores = gameHistory.map((p) => p.score);
    let min = Math.min(...scores);
    let max = Math.max(...scores);
    if (max - min < 1) { min -= 5; max += 5; }
    const range = max - min;
    const total = gameHistory.length;
    return gameHistory.map((p, i) => ({
      moveNumber: p.moveNumber,
      score: p.score,
      status: p.status,
      index: i,
      x: total > 1 ? (i / (total - 1)) * W : W / 2,
      y: H - ((p.score - min) / range) * H,
    }));
  }, [gameHistory]);

  /* Line path */
  const lineD = useMemo(() => {
    if (points.length === 0) return "";
    return "M" + points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L");
  }, [points]);

  /* Empty state */
  if (!gameHistory || gameHistory.length === 0) return null;

  const active = hoveredIndex !== null ? points[hoveredIndex] : null;
  const activePctX = active ? active.x / W : 0;

  /* Hit zone width per point */
  const zoneW = points.length > 1 ? W / points.length : W;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: H, display: "block", overflow: "visible" }}
        preserveAspectRatio="none"
      >
        {/* Evaluation line */}
        <path
          d={lineD}
          fill="none"
          stroke="#f3c53d"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Marker dots for key moments */}
        {points
          .filter((p) => p.status !== "neutral")
          .map((p) => (
            <circle
              key={p.index}
              cx={p.x}
              cy={p.y}
              r={6}
              fill={p.status === "blunder" ? "#e74c3c" : "#4caf50"}
              stroke="#171613"
              strokeWidth={2}
            />
          ))}

        {/* Invisible hit zones for hover/click */}
        {points.map((p) => (
          <rect
            key={`hz-${p.index}`}
            x={p.x - zoneW / 2}
            y={0}
            width={zoneW}
            height={H}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHoveredIndex(p.index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => onPointClick?.(p.index)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {active && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: `${activePctX * 100}%`,
            transform: "translateX(-50%)",
            marginBottom: 8,
            backgroundColor: "#ffffff",
            color: "#000",
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            zIndex: 10,
            pointerEvents: "none",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }}
        >
          <div>
            Move {active.moveNumber}: {active.score >= 0 ? "+" : ""}
            {(active.score / 100).toFixed(2)}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: -6,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid #ffffff",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default EvaluationHistoryGraph;
