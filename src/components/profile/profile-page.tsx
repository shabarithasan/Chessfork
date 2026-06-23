"use client";

import { Lock, Medal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { badgeCount, badges, rarityLabel, type Badge } from "@/lib/badges";
import {
  hasFreezeAvailable,
  isStreakAtRisk,
  readGamificationStats,
  readUnlockedBadgeIds,
  toLocalDateKey,
  type KnightowlStats,
} from "@/lib/badgeChecker";
import { cn } from "@/lib/utils";

const dayNames = ["M", "T", "W", "T", "F", "S", "S"];
const initialStats: KnightowlStats = {
  accuracyByDate: {},
  analysisIds: [],
  analyses: [],
  coachUses: 0,
  currentStreak: 0,
  freezeWeeks: {},
  gamesByDate: {},
  longestStreak: 0,
  openings: {},
  shareCount: 0,
  totalAccuracy: 0,
  totalGames: 0,
  version: 1,
};

const badgeCardClasses: Record<Badge["rarity"], string> = {
  common: "border-slate-500/30",
  epic: "border-fuchsia-300/50 shadow-[0_0_28px_rgba(192,38,211,0.18)]",
  legendary: "badge-legendary-shimmer border-amber-300/70 shadow-[0_0_34px_rgba(245,158,11,0.24)]",
  rare: "border-sky-300/50 shadow-[0_0_28px_rgba(14,165,233,0.18)]",
};

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

function compactDateLabel(key: string) {
  const [, month, day] = key.split("-");
  return `${month}/${day}`;
}

function lastNDays(count: number) {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => addDays(today, index - count + 1));
}

function weekDateKeys() {
  const today = new Date();
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => toLocalDateKey(addDays(monday, index)));
}

function heatmapClass(count: number) {
  if (count >= 4) return "bg-[#00d4aa]";
  if (count >= 2) return "bg-[#00d4aa]/70";
  if (count >= 1) return "bg-[#00d4aa]/36";
  return "bg-white/[0.045]";
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function ChartPlaceholder() {
  return <div className="h-full rounded-lg border border-white/10 bg-white/[0.025]" />;
}

export function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<KnightowlStats>(initialStats);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(() => new Set());
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    function refresh() {
      setStats(readGamificationStats());
      setUnlockedIds(new Set(readUnlockedBadgeIds()));
      setMounted(true);
    }

    window.queueMicrotask(refresh);
    window.addEventListener("knightowl:stats-updated", refresh);
    window.addEventListener("knightowl:badges-unlocked", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("knightowl:stats-updated", refresh);
      window.removeEventListener("knightowl:badges-unlocked", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const averageAccuracy = stats.totalGames > 0 ? Math.round(stats.totalAccuracy / stats.totalGames) : 0;
  const earnedCount = unlockedIds.size;

  const accuracySeries = useMemo(
    () => {
      if (!mounted) {
        return [];
      }

      return lastNDays(30).map((date) => {
        const key = toLocalDateKey(date);
        const day = stats.accuracyByDate[key];
        return {
          accuracy: day ? Math.round(day.total / day.count) : null,
          date: compactDateLabel(key),
          games: stats.gamesByDate[key] ?? 0,
        };
      });
    },
    [mounted, stats.accuracyByDate, stats.gamesByDate],
  );

  const openingRows = useMemo(
    () =>
      Object.values(stats.openings)
        .sort((left, right) => right.count - left.count)
        .slice(0, 5)
        .map((opening) => ({
          accuracy: Math.round(opening.totalAccuracy / opening.count),
          games: opening.count,
          name: opening.name.length > 22 ? `${opening.name.slice(0, 21)}...` : opening.name,
        })),
    [stats.openings],
  );

  const heatmapDays = useMemo(
    () => {
      if (!mounted) {
        return [];
      }

      return lastNDays(84).map((date) => {
        const key = toLocalDateKey(date);
        return {
          count: stats.gamesByDate[key] ?? 0,
          key,
        };
      });
    },
    [mounted, stats.gamesByDate],
  );

  const currentWeekKeys = useMemo(() => (mounted ? weekDateKeys() : []), [mounted]);

  return (
    <section className="mx-auto w-full max-w-7xl px-3 py-5 text-slate-100 sm:px-5 lg:px-8">
      <header className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#00d4aa]">Chessfork profile</p>
            <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">Your chess progress vault</h1>
          </div>
          <div className="rounded-full border border-[#00d4aa]/25 bg-[#00d4aa]/10 px-4 py-2 text-sm font-black text-[#9fffea]">
            Badges {earnedCount} / {badgeCount}
          </div>
        </div>
      </header>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <StatCard label="Total games analyzed" value={stats.totalGames.toString()} />
        <StatCard label="Average accuracy" value={`${averageAccuracy}%`} />
        <StatCard label="Current streak" value={`${stats.currentStreak}d`} />
        <StatCard label="Badges earned" value={`${earnedCount} / ${badgeCount}`} />
      </div>

      <section className="mt-5 rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-black text-white">Streak tracking</h2>
            <p className="mt-2 text-sm text-slate-400">
              Longest streak: {stats.longestStreak} days / Freeze this week: {mounted && !hasFreezeAvailable(stats) ? "used" : "available"}
            </p>
          </div>
          {mounted && isStreakAtRisk(stats) ? (
            <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100">
              Streak at risk tonight
            </span>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {(mounted ? currentWeekKeys : dayNames).map((key, index) => (
            <div key={mounted ? key : `${key}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-center">
              <p className="text-xs font-bold text-slate-500">{dayNames[index]}</p>
              <div className={cn("mx-auto mt-2 size-5 rounded-md border border-white/10", mounted ? heatmapClass(stats.gamesByDate[key] ?? 0) : "bg-white/[0.045]")} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
        <h2 className="text-sm font-black text-white">Badges</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {badges.map((badge) => {
            const earned = unlockedIds.has(badge.id);

            return (
              <button
                key={badge.id}
                type="button"
                aria-label={`${earned ? badge.name : "Locked"} badge`}
                disabled={!earned}
                onClick={() => setSelectedBadge(badge)}
                className={cn(
                  "min-h-36 rounded-xl border bg-white/[0.035] p-4 text-left transition",
                  earned ? badgeCardClasses[badge.rarity] : "border-white/10 grayscale",
                  earned ? "hover:-translate-y-0.5 hover:bg-white/[0.06]" : "cursor-not-allowed opacity-45",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-4xl">{earned ? badge.icon : "??"}</span>
                  {!earned ? <Lock className="size-4 text-slate-500" /> : <Medal className="size-4 text-[#00d4aa]" />}
                </div>
                <p className="mt-4 text-lg font-black text-white">{earned ? badge.name : "???"}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{earned ? badge.desc : "Unlock this achievement to reveal it."}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
          <h2 className="text-sm font-black text-white">Accuracy over time</h2>
          <div className="mt-4 h-72 min-w-0 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accuracySeries}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="accuracy" stroke="#00d4aa" strokeWidth={3} connectNulls dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ChartPlaceholder />
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
          <h2 className="text-sm font-black text-white">Opening breakdown</h2>
          <div className="mt-4 h-72 min-w-0 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={openingRows}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12 }} />
                  <Bar dataKey="games" fill="#00d4aa" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="accuracy" fill="#00c2ff" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartPlaceholder />
            )}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
        <h2 className="text-sm font-black text-white">Heatmap</h2>
        <p className="mt-2 text-sm text-slate-400">Last 12 weeks of analysis activity.</p>
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
            {mounted
              ? heatmapDays.map((day) => (
                  <span key={day.key} title={`${day.count} games on ${day.key}`} className={cn("size-3 rounded-[0.2rem]", heatmapClass(day.count))} />
                ))
              : Array.from({ length: 84 }, (_, index) => <span key={index} className="size-3 rounded-[0.2rem] bg-white/[0.045]" />)}
          </div>
        </div>
      </section>

      {selectedBadge ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/70 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className={cn("w-full max-w-md rounded-xl border bg-[#111118] p-5 text-white shadow-[0_24px_90px_rgba(0,0,0,0.5)]", badgeCardClasses[selectedBadge.rarity])}>
            <div className="flex items-start justify-between gap-4">
              <span className="text-6xl">{selectedBadge.icon}</span>
              <button type="button" onClick={() => setSelectedBadge(null)} className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/[0.06]">
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#00d4aa]">{rarityLabel(selectedBadge.rarity)}</p>
            <h2 className="mt-2 text-3xl font-black">{selectedBadge.name}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{selectedBadge.desc}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
