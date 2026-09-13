"use client";

import { useEffect, useRef, useState } from "react";
import { Globe as GlobeIcon, TrendingUp, Zap } from "lucide-react";
import type { GlobeStats } from "./globe-game-types";
import { flagEmoji } from "./globe-geo";

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  const start = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    if (from.current === value) {
      setDisplay(value);
      return;
    }
    const a = from.current;
    from.current = value;
    start.current = performance.now();
    const step = () => {
      const p = Math.min((performance.now() - start.current) / 500, 1);
      setDisplay(Math.round(a + (value - a) * (1 - (1 - p) * (1 - p))));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

function StatCell({
  icon: Icon,
  label,
  value,
  suffix,
  delay,
}: {
  icon: typeof Zap;
  label: string;
  value: number;
  suffix?: string;
  delay: string;
}) {
  return (
    <div className="relative flex items-center gap-1.5 sm:gap-2.5 px-2.5 py-2 sm:px-3.5 sm:py-2.5 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/[0.04] to-transparent pointer-events-none" />
      <span
        className="shrink-0 relative flex"
        style={{ animation: `icon-glow 4s ease-in-out infinite ${delay}` }}
      >
        <Icon className="text-amber-400" size={13} />
      </span>
      <div className="flex flex-col relative min-w-0">
        <span className="hidden sm:block text-[9px] text-zinc-500 leading-none mb-0.5 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-xs sm:text-sm font-semibold text-zinc-100 tabular-nums leading-none">
          <AnimatedNumber value={value} />
          {suffix && (
            <span className="text-zinc-500 font-normal text-[10px] sm:text-xs ml-0.5">
              {suffix}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function TopCountries({ countries }: { countries: { code: string; count: number }[] }) {
  if (countries.length < 3) return null;
  const ordered = [countries[1], countries[0], countries[2]];
  const heights = [18, 26, 12];
  const colors = ["#a8a8a8", "#fbbf24", "#cd7f32"];
  return (
    <div className="relative hidden sm:flex items-end justify-center gap-0.5 px-3 py-1.5 overflow-hidden">
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/[0.04] to-transparent pointer-events-none"
        style={{ animation: "shimmer 6s ease-in-out infinite 3.9s" }}
      />
      {ordered.map((c, i) => (
        <div key={c.code} className="flex flex-col items-center gap-0.5 relative">
          <span className="text-sm leading-none">{flagEmoji(c.code)}</span>
          <div
            className="w-6 rounded-t-sm flex items-end justify-center pb-0.5"
            style={{
              height: heights[i],
              background: `linear-gradient(to top, ${colors[i]}18, ${colors[i]}08)`,
              borderTop: `1.5px solid ${colors[i]}50`,
            }}
          >
            <span className="text-[7px] font-medium text-zinc-500 tabular-nums">
              {c.count}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GlobeStatsBar({ stats }: { stats: GlobeStats }) {
  return (
    <div className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-zinc-900/70 backdrop-blur-md border border-zinc-800/50 rounded-xl overflow-hidden">
        <div className="flex items-stretch divide-x divide-zinc-800/40">
          <StatCell
            icon={Zap}
            label="Games"
            value={stats.total_games}
            suffix="/hr"
            delay="0s"
          />
          <StatCell
            icon={GlobeIcon}
            label="Countries"
            value={stats.active_countries}
            delay="1.3s"
          />
          <StatCell
            icon={TrendingUp}
            label="Avg Elo"
            value={stats.avg_rating}
            delay="2.6s"
          />
          {stats.top_countries.length >= 3 && (
            <TopCountries countries={stats.top_countries} />
          )}
        </div>
      </div>
    </div>
  );
}
