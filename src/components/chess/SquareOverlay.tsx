"use client";

import { cn } from "@/lib/utils";

export interface CornerBracketEntry {
  square: string;
  type: "selected" | "legal-target";
}

export interface CenterDotEntry {
  square: string;
  type: "last-move" | "selected" | "hover";
}

interface SquareOverlayProps {
  cornerBrackets?: CornerBracketEntry[];
  centerDots?: CenterDotEntry[];
  orientation?: "white" | "black";
  className?: string;
}

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

function squareToPercent(square: string, orientation: "white" | "black"): { x: number; y: number } {
  const fileIdx = files.indexOf(square[0]);
  const rankIdx = parseInt(square[1], 10) - 1;
  if (orientation === "white") {
    return { x: fileIdx / 8, y: (7 - rankIdx) / 8 };
  }
  return { x: (7 - fileIdx) / 8, y: rankIdx / 8 };
}

function isDarkSquare(square: string): boolean {
  const fileIdx = files.indexOf(square[0]);
  const rankIdx = parseInt(square[1], 10) - 1;
  return (fileIdx + rankIdx) % 2 !== 0;
}

function bracketColor(square: string, type: "selected" | "legal-target"): string {
  const dark = isDarkSquare(square);
  if (type === "selected") return dark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.2)";
  return dark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.12)";
}

function dotColor(square: string, type: "last-move" | "selected" | "hover"): string {
  const dark = isDarkSquare(square);
  if (type === "selected") return dark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.2)";
  if (type === "hover") return dark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.1)";
  return dark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)";
}

const BRACKET_PATH = "M 22 0 L 0 0 L 0 22";
const BRACKET_STROKE_WIDTH = 4.5;
const BRACKET_VIEWBOX = 100;

export function SquareOverlay({
  cornerBrackets = [],
  centerDots = [],
  orientation = "white",
  className,
}: SquareOverlayProps) {
  const allSquares = new Set([
    ...cornerBrackets.map((e) => e.square),
    ...centerDots.map((e) => e.square),
  ]);

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-20", className)}>
      <svg className="h-full w-full overflow-visible" viewBox="0 0 800 800">
        {cornerBrackets.map((entry) => {
          const pos = squareToPercent(entry.square, orientation);
          const color = bracketColor(entry.square, entry.type);
          const x = pos.x * 800;
          const y = pos.y * 800;
          return (
            <g key={`bracket-${entry.square}`}>
              <path d={`M ${x + 18} ${y} L ${x} ${y} L ${x} ${y + 18}`} fill="none" stroke={color} strokeWidth={BRACKET_STROKE_WIDTH} strokeLinecap="round" />
              <path d={`M ${x + 800 - 18} ${y} L ${x + 800} ${y} L ${x + 800} ${y + 18}`} fill="none" stroke={color} strokeWidth={BRACKET_STROKE_WIDTH} strokeLinecap="round" />
              <path d={`M ${x + 18} ${y + 800} L ${x} ${y + 800} L ${x} ${y + 800 - 18}`} fill="none" stroke={color} strokeWidth={BRACKET_STROKE_WIDTH} strokeLinecap="round" />
              <path d={`M ${x + 800 - 18} ${y + 800} L ${x + 800} ${y + 800} L ${x + 800} ${y + 800 - 18}`} fill="none" stroke={color} strokeWidth={BRACKET_STROKE_WIDTH} strokeLinecap="round" />
            </g>
          );
        })}
      </svg>

      {centerDots.map((entry) => {
        const pos = squareToPercent(entry.square, orientation);
        const color = dotColor(entry.square, entry.type);
        return (
          <div
            key={`dot-${entry.square}`}
            className="absolute rounded-full"
            style={{
              left: `${(pos.x + 0.4) * 100}%`,
              top: `${(pos.y + 0.4) * 100}%`,
              width: "20%",
              height: "20%",
              backgroundColor: color,
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Per-square overlay for custom board rendering ── */
export function SquareOverlayInline({
  showBrackets = false,
  showCenterDot = false,
  bracketType = "legal-target",
  dotType = "last-move",
  square,
}: {
  showBrackets?: boolean;
  showCenterDot?: boolean;
  bracketType?: "selected" | "legal-target";
  dotType?: "last-move" | "selected" | "hover";
  square: string;
}) {
  const color = isDarkSquare(square) ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.15)";
  const bracketC = bracketColor(square, bracketType);

  return (
    <>
      {showCenterDot && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "22%",
            height: "22%",
            backgroundColor: dotColor(square, dotType),
          }}
        />
      )}
      {showBrackets && (
        <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full" viewBox="0 0 100 100">
          <path d="M 20 0 L 0 0 L 0 20" fill="none" stroke={bracketC} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 80 0 L 100 0 L 100 20" fill="none" stroke={bracketC} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 20 100 L 0 100 L 0 80" fill="none" stroke={bracketC} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 80 100 L 100 100 L 100 80" fill="none" stroke={bracketC} strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      )}
    </>
  );
}
