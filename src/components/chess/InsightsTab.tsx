"use client";

import { useState } from "react";
import { Gauge, BookOpen, Swords, Crown, TriangleAlert, Clock, Target } from "lucide-react";
import { PandaMascotNew } from "@/components/mascot/PandaMascotNew";

const PANDA = {
  gold: "#BDB73C",
  cream: "#ECDBBE",
  ember: "#F59F1D",
  slate: "#2E3A52",
  milk: "#F8F3E9",
  ink: "#020202",
} as const;

export interface InsightsSection {
  label: string;
  icon: string;
  value: string;
  textColor: string;
  progressFill: string;
  progressPercent: number;
}

export interface AccuracyPoint {
  move: number;
  p1: number;
  p2: number;
  blunder: boolean;
}

export interface TimePoint {
  move: number;
  p1_seconds: number;
  p2_seconds: number;
}

export interface InsightsData {
  sections: InsightsSection[];
  accuracyData: AccuracyPoint[];
  timeData: TimePoint[];
}

interface InsightsTabProps {
  insightsData: InsightsData;
  player1Name?: string;
  player2Name?: string;
  vsLabel?: string;
  onSelectMove?: (ply: number) => void;
}

function sectionIcon(label: string, className: string) {
  const props = { className, size: 15 };
  switch (label) {
    case "Accuracy": return <Target {...props} />;
    case "Opening": return <BookOpen {...props} />;
    case "Middlegame": return <Swords {...props} />;
    case "Endgame": return <Crown {...props} />;
    case "Blunders": return <TriangleAlert {...props} />;
    default: return <Gauge {...props} />;
  }
}

function AccuracyLineChart({ data, player1Name, player2Name, onMoveSelect }: { data: AccuracyPoint[]; player1Name: string; player2Name: string; onMoveSelect?: (ply: number) => void }) {
  const W = 376;
  const H = 104;
  const midY = H / 2;

  if (data.length === 0) {
    return <div className="flex h-[104px] items-center justify-center text-xs" style={{ color: PANDA.gold }}>No accuracy data</div>;
  }

  function x(i: number) {
    return data.length > 1 ? (i / (data.length - 1)) * W : W / 2;
  }

  function y(val: number) {
    const clamped = Math.max(0, Math.min(100, val));
    return midY - ((clamped - 50) / 50) * (midY - 12);
  }

  const lineP1 = data.map((d, i) => `${x(i)},${y(d.p1)}`).join(" ");
  const lineP2 = data.map((d, i) => `${x(i)},${y(d.p2)}`).join(" ");

  const [hoveredMove, setHoveredMove] = useState<number | null>(null);
  const hovered = hoveredMove !== null ? data.find((d) => d.move === hoveredMove) : null;

  return (
    <div className="relative">
      {hovered && (
        <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full" style={{ marginTop: 4 }}>
          <div className="flex items-center gap-3 rounded-lg border px-2.5 py-1.5 shadow-lg" style={{ borderColor: `${PANDA.gold}40`, backgroundColor: PANDA.slate }}>
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: PANDA.gold }} />
              <span className="font-semibold tabular-nums" style={{ color: PANDA.gold }}>{hovered.p1}%</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#a3a3a3" }}>
              <span className="h-2 w-2 rounded-[2px] bg-neutral-500" />
              <span className="font-semibold tabular-nums">{hovered.p2}%</span>
            </span>
          </div>
        </div>
      )}
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center">
        <span className="flex min-w-0 items-center gap-[7px] text-[11.5px] font-medium" style={{ color: "#d4d4d4" }}>
          <span className="h-[9px] w-[9px] flex-none rounded-[2px]" style={{ backgroundColor: PANDA.gold }} />
          <span className="truncate" style={{ maxWidth: 130 }}>{player1Name}</span>
        </span>
        <span className="flex items-baseline gap-4">
          <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: PANDA.gold }}>
            {data.length > 0 ? Math.round(data[data.length - 1]?.p1 ?? 0) : 0}
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-neutral-400">
            {data.length > 0 ? Math.round(data[data.length - 1]?.p2 ?? 0) : 0}
          </span>
        </span>
        <span className="flex min-w-0 items-center justify-end gap-[7px] text-[11.5px] font-medium" style={{ color: "#d4d4d4" }}>
          <span className="truncate" style={{ maxWidth: 130 }}>{player2Name}</span>
          <span className="h-[9px] w-[9px] flex-none rounded-[2px] bg-neutral-500" />
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", touchAction: "none" }}>
        <line x1="0" y1={midY} x2={W} y2={midY} stroke="#3a3a3a" strokeWidth="1" strokeDasharray="2 4" />
        <polyline points={lineP2} fill="none" stroke="#6b6b6b" strokeWidth="1.5" strokeOpacity="0.85" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={lineP1} fill="none" stroke={PANDA.gold} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d) => {
          const cx = x(data.indexOf(d));
          const cy = y(d.p1);
          return (
            <g key={d.move} role="button" tabIndex={0} className="cursor-pointer" onClick={() => onMoveSelect?.(d.move)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onMoveSelect?.(d.move); } }} style={{ outline: "none" }}
               onMouseEnter={() => setHoveredMove(d.move)} onMouseLeave={() => setHoveredMove(null)}>
              <rect x={cx - 8} y={0} width={16} height={H} fill="transparent" />
              {d.blunder && (
                <>
                  <circle cx={cx} cy={cy} r="5.5" fill="none" stroke="#ef4444" strokeWidth="1.3" strokeOpacity="0.45" />
                  <circle cx={cx} cy={cy} r="3" fill="#ef4444" />
                </>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1.5 flex items-center justify-end">
        <span className="flex items-center gap-[6px] text-[10px]" style={{ color: "#737373" }}>
          <span className="h-[7px] w-[7px] rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]" />
          blunders
        </span>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }
  return `${Math.round(seconds)}s`;
}

function TimeBarChart({ data, player1Name, player2Name, onMoveSelect }: { data: TimePoint[]; player1Name: string; player2Name: string; onMoveSelect?: (ply: number) => void }) {
  const H = 134;
  const W = 376;

  if (data.length === 0) {
    return <div className="flex h-[134px] items-center justify-center text-xs" style={{ color: PANDA.gold }}>No time data</div>;
  }

  const maxSec = Math.max(...data.flatMap((d) => [d.p1_seconds, d.p2_seconds]), 1);
  const maxH = H - 20;
  const barW = Math.max(W / data.length * 0.6, 4);

  const [hoveredMove, setHoveredMove] = useState<number | null>(null);
  const hovered = hoveredMove !== null ? data.find((d) => d.move === hoveredMove) : null;

  return (
    <div className="relative">
      {hovered && (
        <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full" style={{ marginTop: 4 }}>
          <div className="flex items-center gap-3 rounded-lg border px-2.5 py-1.5 shadow-lg" style={{ borderColor: `${PANDA.gold}40`, backgroundColor: PANDA.slate }}>
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: PANDA.gold }} />
              <span className="font-semibold tabular-nums" style={{ color: PANDA.gold }}>{formatTime(hovered.p1_seconds)}</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#a3a3a3" }}>
              <span className="h-2 w-2 rounded-[2px] bg-neutral-500" />
              <span className="font-semibold tabular-nums">{formatTime(hovered.p2_seconds)}</span>
            </span>
          </div>
        </div>
      )}
      <div className="mb-3.5 flex items-center gap-2.5 text-[11.5px] font-medium" style={{ color: "#a3a3a3" }}>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: PANDA.gold }} />
          <span className="max-w-[96px] truncate" style={{ color: "#d4d4d4" }}>{player1Name}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="max-w-[96px] truncate">{player2Name}</span>
          <span className="h-2 w-2 shrink-0 rounded-[2px] bg-neutral-500" />
        </span>
      </div>
      <div className="relative" style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block" style={{ touchAction: "none" }}>
          <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(115,115,115,.45)" strokeWidth="1" />
          {data.map((d, i) => {
            const xPos = (i / data.length) * W + (W / data.length - barW) / 2;
            const h1 = Math.max((d.p1_seconds / maxSec) * maxH, 2);
            const h2 = Math.max((d.p2_seconds / maxSec) * maxH, 2);
            const y1 = H / 2 - h1;
            const y2 = H / 2;
            const colW = W / data.length;
            return (
              <g key={d.move} role="button" tabIndex={0} className="cursor-pointer" onClick={() => onMoveSelect?.(d.move)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onMoveSelect?.(d.move); } }} style={{ outline: "none" }}
                 onMouseEnter={() => setHoveredMove(d.move)} onMouseLeave={() => setHoveredMove(null)}>
                <rect x={i * colW} y={0} width={colW} height={H} fill="transparent" />
                <rect
                  x={xPos} y={y1} width={barW} height={h1} rx="1"
                  fill={PANDA.gold} fillOpacity="0.85"
                  pointerEvents="none"
                />
                <rect
                  x={xPos} y={y2} width={barW} height={h2} rx="1"
                  fill="#6b6b6b" fillOpacity="0.85"
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function InsightsTab({ insightsData, player1Name = "Player 1", player2Name = "Player 2", vsLabel = "600–799", onSelectMove }: InsightsTabProps) {
  const { sections, accuracyData, timeData } = insightsData;

  return (
    <div className="min-h-0 flex-1">
      <div className="relative flex h-full w-full flex-col overflow-y-auto px-[22px] pb-5 pt-4 [scrollbar-width:thin]">

        <img
          src="/images/panda-illustration.svg"
          alt=""
          className="pointer-events-none absolute bottom-0 right-0 h-3/5 w-full object-contain object-right-bottom opacity-[0.06]"
        />

        {/* Panda Coach */}
        <div className="flex shrink-0 items-start gap-3">
          <div className="shrink-0 drop-shadow-[0_5px_12px_rgba(0,0,0,.45)]">
            <PandaMascotNew size={96} />
          </div>
          <div className="relative self-center rounded-xl px-3.5 py-[11px] text-[13.5px] font-medium leading-[1.42] transition-opacity duration-[220ms]"
               style={{ backgroundColor: PANDA.cream, color: "#171717" }}>
            <span className="absolute -left-[5px] top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 rounded-[2px]" style={{ backgroundColor: PANDA.cream }} />
            Watch the accuracy. It dragged well below your level this game.
          </div>
        </div>

        {/* Report Card */}
        <section className="mt-5 pt-5" style={{ borderTop: `1px solid ${PANDA.gold}20` }}>
          <div className="mb-3.5 flex min-h-[22px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Gauge className="h-[18px] w-[18px] shrink-0" style={{ color: PANDA.gold }} />
              <h3 className="truncate text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: PANDA.gold }}>Report card</h3>
            </div>
            <span className="text-[12px] font-medium" style={{ color: "#737373" }}>vs <span className="font-mono tabular-nums" style={{ color: "#a3a3a3" }}>{vsLabel}</span></span>
          </div>
          <div className="flex flex-col gap-y-1">
            {sections.map((s) => (
              <div key={s.label} className="grid h-[34px] grid-cols-[104px_1fr_64px] items-center gap-x-3">
                <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium" style={{ color: "#d4d4d4" }}>
                  <span className="shrink-0" style={{ color: PANDA.gold }}>{sectionIcon(s.label, "h-[15px] w-[15px] shrink-0")}</span>
                  <span className="truncate">{s.label}</span>
                </span>
                <div className="relative h-1.5 rounded-md" style={{ backgroundColor: `${PANDA.slate}80` }}>
                  <span className="absolute -bottom-[3px] -top-[3px] left-1/2 w-px -translate-x-px" style={{ backgroundColor: PANDA.cream, opacity: 0.3 }} />
                  <span className="absolute inset-y-0 rounded-md" style={{ left: `${Math.min(50, s.progressPercent)}%`, width: `${Math.abs(50 - s.progressPercent)}%`, background: s.progressPercent >= 50 ? `linear-gradient(90deg, ${PANDA.ember}, ${PANDA.gold})` : `linear-gradient(90deg, ${PANDA.gold}, ${PANDA.ember})` }} />
                  <span className="absolute top-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${s.progressPercent}%`, backgroundColor: PANDA.gold, boxShadow: "rgb(23,23,23) 0 0 0 3px" }} />
                </div>
                <span className="whitespace-nowrap text-right text-xs font-semibold" style={{ color: s.textColor }}>{s.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Accuracy per move */}
        <section className="mt-5 pt-5" style={{ borderTop: `1px solid ${PANDA.gold}20` }}>
          <div className="mb-3.5 flex min-h-[22px] items-center gap-2">
            <Target className="h-[18px] w-[18px] shrink-0" style={{ color: PANDA.gold }} />
            <h3 className="truncate text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: PANDA.gold }}>Accuracy per move</h3>
          </div>
          <AccuracyLineChart data={accuracyData} player1Name={player1Name} player2Name={player2Name} onMoveSelect={onSelectMove} />
        </section>

        {/* Time per move */}
        <section className="mt-5 pt-5" style={{ borderTop: `1px solid ${PANDA.gold}20` }}>
          <div className="mb-3.5 flex min-h-[22px] items-center gap-2">
            <Clock className="h-[18px] w-[18px] shrink-0" style={{ color: PANDA.gold }} />
            <h3 className="truncate text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: PANDA.gold }}>Time per move</h3>
          </div>
          <TimeBarChart data={timeData} player1Name={player1Name} player2Name={player2Name} onMoveSelect={onSelectMove} />
        </section>
      </div>
    </div>
  );
}