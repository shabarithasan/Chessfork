"use client";

import { getGlobalStats } from "./country-data";

export function StatsPanel({ className }: { className?: string }) {
  const stats = getGlobalStats();

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl border border-white/10 bg-black/70 px-5 py-3.5 backdrop-blur ${className || ""}`}>
      <Stat label="Games Today" value={stats.gamesToday} />
      <Stat label="Players Online" value={stats.playersOnline} />
      <Stat label="Countries Active" value={stats.countriesActive} />
      <Stat label="Avg Rating" value={stats.avgRating} />
      <Stat label="Top Opening" value={stats.mostPlayedOpening} format="text" />
      <Stat label="Avg Accuracy" value={`${stats.avgAccuracy}%`} format="text" />
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