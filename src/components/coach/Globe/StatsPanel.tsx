"use client";

import { useEffect, useState } from "react";
import { GlobeStatistics } from "@/lib/globe-types";

interface StatsPanelProps {
  className?: string;
  statistics: GlobeStatistics | null;
  isLoading: boolean;
}

export function StatsPanel({ className, statistics, isLoading }: StatsPanelProps) {
  if (isLoading) {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl border border-white/10 bg-black/70 px-5 py-3.5 backdrop-blur ${className || ""}`}>
        <div className="flex items-center gap-2 text-slate-400">
          <div className="size-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (!statistics || statistics.gamesReceived === 0) {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl border border-white/10 bg-black/70 px-5 py-3.5 backdrop-blur ${className || ""}`}>
        <span className="text-sm text-slate-500">No live game data available</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl border border-white/10 bg-black/70 px-5 py-3.5 backdrop-blur ${className || ""}`}>
      <Stat label="Games Received" value={statistics.gamesReceived} />
      <Stat label="Unique Players" value={statistics.uniquePlayers} />
      <Stat label="Countries" value={statistics.countriesRepresented} />
      <Stat label="Avg Rating" value={statistics.averageRating} />
      <Stat 
        label="Top Time Control" 
        value={statistics.timeControlDistribution[0]?.category || "—"} 
        format="text" 
      />
      <Stat 
        label="Top Opening" 
        value={statistics.openings[0]?.name || "—"} 
        format="text" 
      />
    </div>
  );
}

function Stat({ label, value, format: fmt }: { label: string; value: string | number; format?: "number" | "text" }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={typeof value === "string" && fmt === "text" ? "text-sm font-bold text-emerald-300" : "text-lg font-bold text-white"}>
        {value}
      </span>
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
    </div>
  );
}