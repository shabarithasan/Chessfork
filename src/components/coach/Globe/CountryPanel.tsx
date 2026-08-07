"use client";

import { Calendar, Loader2, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import type { CountryStats } from "./country-data";

interface CountryPanelProps {
  selected: CountryStats | null;
  className?: string;
}

export function CountryPanel({ selected, className }: CountryPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<string[] | null>(null);

  if (!selected) {
    return (
      <div className={cn("flex flex-col rounded-2xl border border-white/10 bg-[#0d101c]/80 p-6 backdrop-blur", className)}>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Chess globe</span>
        <h2 className="mt-2 text-2xl font-bold text-white">Global overview</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Click any country on the globe to explore its chess activity, openings, and AI-powered insights.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <MiniStat icon={Users} label="Countries" value="178 active" />
          <MiniStat icon={TrendingUp} label="Win rate" value="avg 49%" />
          <MiniStat icon={Zap} label="Openings" value="18 popular" />
          <MiniStat icon={Calendar} label="Games today" value="Thousands live" />
        </div>
        <p className="mt-5 text-xs text-slate-600">Powered by Chessfork AI · Mock data from live game population</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col rounded-2xl border border-white/10 bg-[#0d0c1c]/95 p-6 backdrop-blur", className)} >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Supercoach</span>
        <button
          type="button"
          onClick={() => {
            setGenerating(true);
            setInsights(null);
            setTimeout(() => {
              setInsights([...selected.aiInsights]);
              setGenerating(false);
            }, 800);
          }}
          disabled={generating}
          className="flex items-center gap-2 rounded-full border border-[#f3c53d]/30 bg-[#f3c53d]/10 px-3 py-1.5 text-[11px] font-bold text-[#ffd966] transition hover:bg-[#f3c53d]/20 disabled:opacity-50"
        >
          {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          AI Insights
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-2xl">{selected.flag} {selected.name ? ` ${selected.name}` : ""}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatCard icon={<Users className="size-4 text-[#00d4aa]" />} label="Active Games" value={selected.activeGames} />
        <StatCard icon={<Users className="size-4 text-[#00d4aa]" />} label="Players Online" value={selected.playersOnline} />
        <StatCard icon={<Sparkles className="size-4 text-[#f3c53d]" />} label="Avg Rating" value={selected.avgRating} />
        <StatCard icon={<TrendingUp className="size-4 text-[#00d4aa]" />} label="Win Rate Today" value={`${selected.winRateToday}%`} />
        <StatCard icon={<Zap className="size-4 text-[#f3c53d]" />} label="Top Opening" value={selected.mostPlayedOpening} />
        <StatCard icon={<TrendingUp className="size-4 text-[#f3c53d]" />} label="Time Control" value={selected.popularTimeControl} />
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Top Openings</p>
        <div className="flex flex-wrap gap-2">
          {selected.openings.map((o: string) => (
            <span key={o} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-slate-300">
              {o}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Game split</p>
        <div className="flex gap-4 text-xs text-slate-400">
          <span className="font-mono">Blitz: {selected.blitzGames}</span>
          <span className="font-mono">Rapid: {selected.rapidGames}</span>
          <span className="font-mono">Classical: {selected.classicalGames}</span>
        </div>
      </div>

      {insights ?? selected.aiInsights ? (
        <div className="mt-6 rounded-xl border border-[#f3c53d]/20 bg-[#f3c53d]/5 p-4">
          <span className="flex items-center gap-2 text-xs font-bold text-[#ffd966]">
            <Sparkles className="size-4" /> AI Insights
          </span>
          <ul className="mt-2 space-y-1.5 text-xs leading-6 text-slate-300">
            {(insights ?? selected.aiInsights).map((insight: string, i: number) => (
              <li key={i} className="text-xs leading-6 text-slate-300">{insight}</li>
            ))}
          </ul>
          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[11px] font-semibold text-[#ffd966]">AI Recommendation</p>
            <p className="mt-1 text-xs leading-6 text-slate-400">{selected.aiRecommendation || "Study tactics to improve your position in this region."}</p>
          </div>
        </div>
      ) : null}

      {generating ? (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-xs text-slate-400">
          <Loader2 className="size-4 animate-spin text-[#ffd966]" />
          ChessFork AI is analyzing recent games in {selected.name}...
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#f3c53d]/30">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-xl font-black text-white tracking-tight">{value}</div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <Icon className="size-3.5 text-[#00d4aa]" />
      </div>
      <span className="mt-2 block text-lg font-black text-white">{value}</span>
    </div>
  );
}