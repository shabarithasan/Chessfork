"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type { MoveAnalysis } from "@/lib/game-analyzer";

interface Props {
  moves: { san: string; fenBefore: string }[];
  currentPly?: number;
  onMoveClick?: (ply: number) => void;
  gameResult?: string;
  analysisMoves?: MoveAnalysis[];
}

const SVG_W = 1000;
const SVG_H = 200;

const COLORS = {
  bg: "#262421",
  marker: "#ffb300",
  upper: "#ffffff",
  lower: "#2b2925",
  line: "#797775",
  eqLine: "#3d3a35",
  bubbleBg: "#ffffff",
  bubbleText: "#21201d",
};

function evalToY(evaluation: number) {
  const clamped = Math.max(-10, Math.min(10, evaluation));
  return 100 - clamped * 8.5;
}

export default function EvaluationGraph({
  moves,
  currentPly = -1,
  onMoveClick,
  analysisMoves,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hoveredPly, setHoveredPly] = useState<number | null>(null);

  const points = useMemo(() => {
    if (!moves || moves.length === 0) return [];

    return moves.map((move, i) => {
      const ply = i + 1;
      const ma = analysisMoves?.[i];
      const ev = ma?.evalBefore ?? 0;
      const x = moves.length > 1 ? (i / (moves.length - 1)) * SVG_W : SVG_W / 2;
      const y = evalToY(ev);
      return { x, y, eval: ev, ply, san: move.san };
    });
  }, [moves, analysisMoves]);

  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    return "M " + points.map((p) => `${p.x} ${p.y}`).join(" L ");
  }, [points]);

  const activePly = hoveredPly ?? currentPly;
  const activePoint = points.find((p) => p.ply === activePly) ?? points[points.length - 1];

  const markerPct = activePoint && points.length > 1 ? activePoint.x / SVG_W : 0;
  const markerPctY = activePoint && SVG_H > 0 ? activePoint.y / SVG_H : 0;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!wrapperRef.current || points.length === 0) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const mouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const pct = mouseX / rect.width;
      const idx = Math.round(pct * (points.length - 1));
      setHoveredPly(points[Math.min(idx, points.length - 1)]?.ply ?? null);
    },
    [points],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredPly(null);
  }, []);

  const handleClick = useCallback(() => {
    if (hoveredPly != null && onMoveClick) {
      onMoveClick(hoveredPly);
    }
  }, [hoveredPly, onMoveClick]);

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ width: "100%", height: SVG_H, backgroundColor: COLORS.bg }}
      >
        <span className="text-xs text-slate-500">No evaluation data</span>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        position: "relative",
        width: "100%",
        height: SVG_H,
        backgroundColor: COLORS.bg,
        borderRadius: 8,
        marginBottom: 16,
        userSelect: "none",
        overflow: "visible",
        cursor: "pointer",
      }}
    >
      <svg
        style={{ width: "100%", height: "100%", display: "block" }}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <clipPath id="upper-clip">
            <rect x="0" y="0" width={SVG_W} height={SVG_H / 2} />
          </clipPath>
          <clipPath id="lower-clip">
            <rect x="0" y={SVG_H / 2} width={SVG_W} height={SVG_H / 2} />
          </clipPath>
        </defs>

        <line x1="0" y1={SVG_H / 2} x2={SVG_W} y2={SVG_H / 2} stroke={COLORS.eqLine} strokeWidth="1" />

        <path
          d={`M 0 ${SVG_H / 2} ${linePath.substring(2)} L ${SVG_W} ${SVG_H / 2} Z`}
          fill={COLORS.upper}
          clipPath="url(#upper-clip)"
        />

        <path
          d={`M 0 ${SVG_H / 2} ${linePath.substring(2)} L ${SVG_W} ${SVG_H / 2} Z`}
          fill={COLORS.lower}
          clipPath="url(#lower-clip)"
        />

        <path d={linePath} fill="none" stroke={COLORS.line} strokeWidth="2" />
      </svg>

      <div
        className="graph-overlay-layer"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 1.5,
            backgroundColor: COLORS.marker,
            transform: "translateX(-50%)",
            left: `${markerPct * 100}%`,
            zIndex: 3,
          }}
        />

        <div
          style={{
            position: "absolute",
            width: 6,
            height: 6,
            backgroundColor: "#ffffff",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            left: `${markerPct * 100}%`,
            top: `${markerPctY * 100}%`,
            zIndex: 3,
          }}
        />

        {activePoint && (
          <div
            style={{
              position: "absolute",
              backgroundColor: COLORS.bubbleBg,
              color: COLORS.bubbleText,
              padding: "4px 8px",
              borderRadius: 4,
              fontFamily: "sans-serif",
              fontSize: 12,
              fontWeight: 700,
              transform: "translate(-50%, -100%)",
              marginTop: -10,
              whiteSpace: "nowrap",
              zIndex: 10,
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              left: `${markerPct * 100}%`,
              top: `${markerPctY * 100}%`,
            }}
          >
            <span>
              {activePoint.eval >= 0 ? "+" : ""}
              {(activePoint.eval / 100).toFixed(1)}
            </span>
            <div
              style={{
                position: "absolute",
                bottom: -4,
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop: "4px solid #ffffff",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
