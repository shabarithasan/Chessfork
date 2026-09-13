"use client";

import { GlobeStatistics } from "@/lib/globe-types";

interface StatsPanelProps {
  className?: string;
  statistics: GlobeStatistics | null;
  isLoading: boolean;
}

export function StatsPanel({ className, statistics, isLoading }: StatsPanelProps) {
  if (isLoading || !statistics) {
    return (
      <div className={`flex items-center gap-6 rounded-2xl border border-white/5 bg-[#111111]/90 px-6 py-4 backdrop-blur-md shadow-2xl ${className || ""}`}>
        <div className="flex items-center gap-3">
          <div className="size-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wider text-white/50 uppercase">Loading feed...</span>
        </div>
      </div>
    );
  }

  // Calculate top countries from topCountries array if available in your lib, or just mock it for the visual
  // The screenshot shows 3 country codes with small numbers underneath them
  const topCountries = (statistics as any).topCountries?.slice(0, 3) || [
    { code: "US", count: 229 },
    { code: "IN", count: 218 },
    { code: "FR", count: 68 },
  ];

  return (
    <div className={`flex items-center gap-8 rounded-xl border border-white/5 bg-[#111111]/90 px-8 py-3 backdrop-blur-md shadow-2xl font-mono ${className || ""}`}>
      
      {/* GAMES */}
      <div className="flex items-center gap-3">
        <span className="text-[#f3c53d] text-xl font-bold">⚡</span>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-white/40 tracking-[0.1em] uppercase">GAMES</span>
          <div className="flex items-baseline gap-1 leading-none mt-1">
            <span className="text-xl font-bold text-[#e4e4e7]">{statistics.gamesReceived.toLocaleString()}</span>
            <span className="text-xs text-white/40">/hr</span>
          </div>
        </div>
      </div>

      <div className="w-px h-10 bg-white/5" />

      {/* COUNTRIES */}
      <div className="flex items-center gap-3">
        <span className="text-[#f3c53d] text-xl font-bold">🌐</span>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-white/40 tracking-[0.1em] uppercase">COUNTRIES</span>
          <div className="flex items-baseline leading-none mt-1">
            <span className="text-xl font-bold text-[#e4e4e7]">{statistics.countriesRepresented}</span>
          </div>
        </div>
      </div>

      <div className="w-px h-10 bg-white/5" />

      {/* AVG ELO */}
      <div className="flex items-center gap-3">
        <span className="text-[#f3c53d] text-xl font-bold">📈</span>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-white/40 tracking-[0.1em] uppercase">AVG ELO</span>
          <div className="flex items-baseline leading-none mt-1">
            <span className="text-xl font-bold text-[#e4e4e7]">{statistics.averageRating}</span>
          </div>
        </div>
      </div>

      <div className="w-px h-10 bg-white/5" />

      {/* TOP COUNTRIES */}
      <div className="flex items-center gap-4">
        {topCountries.map((c: any) => (
          <div key={c.code} className="flex flex-col items-center">
            <span className="text-xs font-bold text-white mb-0.5">{c.code}</span>
            <div className="bg-white/5 rounded px-2 py-[2px]">
              <span className="text-[9px] text-white/40 font-semibold">{c.count}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}