"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, BrainCircuit, Check, ChevronDown, CircleAlert, Loader2, Swords, Target } from "lucide-react";

import type { AiCoachGameInput, AiCoachReport, AiCoachSeverity } from "@/lib/ai-coach";
import { recordCoachUseAndCheckBadges } from "@/lib/badgeChecker";
import { cn } from "@/lib/utils";

const gameCountOptions = [10, 25, 50] as const;
const cacheTtlMs = 24 * 60 * 60 * 1000;
const coachPreviewCards = [
  {
    icon: BrainCircuit,
    label: "Pattern map",
    title: "Recurring mistakes rise above single-game noise.",
    detail: "The coach desk groups weak moves by theme so the next session has one clear job.",
  },
  {
    icon: Target,
    label: "Weekly focus",
    title: "One training target stays attached to the evidence.",
    detail: "A short plan works better when the proof, drill, and opening context sit together.",
  },
  {
    icon: Swords,
    label: "Opening pressure",
    title: "The first phase gets treated like a living repertoire.",
    detail: "Opening drift, tactical misses, and conversion habits become visible as a pattern.",
  },
];

type GameCountOption = (typeof gameCountOptions)[number];

interface CachedCoachReport {
  createdAt: number;
  report: AiCoachReport;
}

interface AiCoachWorkspaceProps {
  initialGames: AiCoachGameInput[];
  playerColor: "black" | "white";
  playerName: string;
}

function cacheKey(playerName: string, playerColor: "black" | "white", gameCount: number, games: AiCoachGameInput[]) {
  const gameSignature = games
    .map((game) => `${game.result}:${game.opening}:${game.pgn.slice(0, 80)}`)
    .join("|")
    .slice(0, 1200);

  return `knightowl:ai-coach:${playerName}:${playerColor}:${gameCount}:${gameSignature}`;
}

function weeklyGoalKey(playerName: string, goal: string) {
  return `knightowl:ai-coach-weekly-goal:${playerName}:${goal}`;
}

function readCachedReport(key: string) {
  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as CachedCoachReport;

    if (!cached.createdAt || Date.now() - cached.createdAt > cacheTtlMs) {
      window.localStorage.removeItem(key);
      return null;
    }

    return cached.report;
  } catch {
    return null;
  }
}

function writeCachedReport(key: string, report: AiCoachReport) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ createdAt: Date.now(), report } satisfies CachedCoachReport));
  } catch {
    // Ignore storage pressure; the report still renders for this session.
  }
}

function severityClasses(severity: AiCoachSeverity) {
  if (severity === "critical") {
    return "border-l-rose-500";
  }

  if (severity === "moderate") {
    return "border-l-orange-400";
  }

  return "border-l-yellow-300";
}

function LoadingState() {
  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-6 shadow-[0_0_20px_rgba(0,212,170,0.08)]">
      <div className="flex items-center gap-4">
        {[Swords, BrainCircuit, Target].map((Icon, index) => (
          <span
            key={index}
            className="grid size-11 animate-bounce place-items-center rounded-lg border border-[#00d4aa]/25 bg-[#00d4aa]/10 text-[#00d4aa]"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            <Icon className="size-5" />
          </span>
        ))}
      </div>
      <p className="mt-5 text-lg font-semibold text-white">Studying your games...</p>
      <div className="mt-5 grid gap-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  );
}

export function AiCoachWorkspace({ initialGames, playerColor, playerName }: AiCoachWorkspaceProps) {
  const [gameCount, setGameCount] = useState<GameCountOption>(10);
  const selectedGames = useMemo(() => initialGames.slice(0, gameCount), [gameCount, initialGames]);
  const selectedCacheKey = useMemo(() => cacheKey(playerName, playerColor, gameCount, selectedGames), [gameCount, playerColor, playerName, selectedGames]);

  const [report, setReport] = useState<AiCoachReport | null>(null);
  const [openCards, setOpenCards] = useState<number[]>([0, 1, 2]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const [weeklyGoalDone, setWeeklyGoalDone] = useState(false);

  useEffect(() => {
    window.queueMicrotask(() => {
      const cached = readCachedReport(selectedCacheKey);
      setReport(cached);
      setCacheStatus(cached ? "Using cached report from the last 24 hours." : null);
      setError(null);
    });
  }, [selectedCacheKey]);

  useEffect(() => {
    window.queueMicrotask(() => {
      if (!report?.weeklyGoal) {
        setWeeklyGoalDone(false);
        return;
      }

      setWeeklyGoalDone(window.localStorage.getItem(weeklyGoalKey(playerName, report.weeklyGoal)) === "done");
    });
  }, [playerName, report?.weeklyGoal]);

  async function generateReport() {
    const cached = readCachedReport(selectedCacheKey);

    if (cached) {
      setReport(cached);
      setCacheStatus("Using cached report from the last 24 hours.");
      return;
    }

    setLoading(true);
    setError(null);
    setCacheStatus(null);

    try {
      const response = await fetch("/api/ai-coach", {
        body: JSON.stringify({
          games: selectedGames,
          playerColor,
          playerName,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as AiCoachReport | { detail?: string; error?: string; message?: string };

      if ("error" in data && data.error === "Claude unavailable") {
        throw new Error(data.detail ?? "Claude unavailable.");
      }

      if (!response.ok) {
        throw new Error("message" in data ? data.message : "AI coaching request failed.");
      }

      const nextReport = data as AiCoachReport;
      setReport(nextReport);
      writeCachedReport(selectedCacheKey, nextReport);
      setCacheStatus("Report cached locally for 24 hours.");
      recordCoachUseAndCheckBadges();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "AI coaching request failed.");
    } finally {
      setLoading(false);
    }
  }

  function toggleWeeklyGoal(checked: boolean) {
    setWeeklyGoalDone(checked);

    if (!report?.weeklyGoal) {
      return;
    }

    const key = weeklyGoalKey(playerName, report.weeklyGoal);

    if (checked) {
      window.localStorage.setItem(key, "done");
    } else {
      window.localStorage.removeItem(key);
    }
  }

  function toggleCard(index: number) {
    setOpenCards((cards) => (cards.includes(index) ? cards.filter((card) => card !== index) : [...cards, index]));
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-[#00d4aa]">
            <span className="grid size-12 place-items-center rounded-xl border border-[#00d4aa]/30 bg-[#00d4aa]/10">
              <Bot className="size-6" />
            </span>
            <p className="text-sm font-semibold uppercase tracking-[0.24em]">Chessfork Coach</p>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Your AI Chess Coach</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Pattern analysis across saved reports for {playerName}. The coach looks for recurring errors, not one-off noise.
          </p>
        </div>

        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4">
          <label htmlFor="ai-coach-game-count" className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Analyze my last
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              id="ai-coach-game-count"
              value={gameCount}
              onChange={(event) => setGameCount(Number(event.target.value) as GameCountOption)}
              className="h-11 rounded-lg border border-[#2a2a4e] bg-[#1a1a2e] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-[#00d4aa]"
            >
              {gameCountOptions.map((option) => (
                <option key={option} value={option}>
                  {option} games
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">{selectedGames.length} available</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generateReport}
          disabled={loading || selectedGames.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-[linear-gradient(135deg,#00d4aa,#00a88a)] px-5 py-3 text-sm font-semibold text-[#0a0a0f] transition hover:scale-[1.02] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}
          Generate Coaching Report
        </button>
        {cacheStatus ? <span className="text-sm text-[#8fffe7]">{cacheStatus}</span> : null}
      </div>

      {error ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="mt-8">{loading ? <LoadingState /> : null}</div>

      {!report && !loading ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.06fr_0.94fr]">
          <div className="premium-surface relative overflow-hidden rounded-lg border p-5 sm:p-6">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-emerald-300/10 blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Coach desk</p>
                  <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Turn the last {selectedGames.length || 1} game{(selectedGames.length || 1) === 1 ? "" : "s"} into a clean training signal.
                  </h2>
                </div>
                <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                  Ready
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Review window", value: `${selectedGames.length || 1}` },
                  { label: "Player", value: playerName },
                  { label: "Perspective", value: playerColor },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-white/10 bg-black/18 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                    <p className="mt-2 truncate text-xl font-semibold capitalize text-white">{metric.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3">
                {coachPreviewCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div key={card.label} className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-[auto_minmax(0,1fr)]">
                      <span className="grid size-11 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">{card.label}</p>
                        <p className="mt-2 text-base font-semibold text-white">{card.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{card.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="premium-surface relative overflow-hidden rounded-lg border p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-16 top-0 size-48 rounded-full bg-amber-300/10 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">Daily rhythm</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">A famous workday needs a short chess loop.</h2>
              <div className="mt-6 space-y-3">
                {[
                  ["Import", "Bring in the games worth remembering."],
                  ["Diagnose", "Let the coach find the repeating theme."],
                  ["Train", "Carry one drill into the next session."],
                ].map(([label, copy], index) => (
                  <div key={label} className="flex gap-3 rounded-lg border border-white/10 bg-black/16 p-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-sm font-semibold text-amber-100">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-white">{label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-lg border border-emerald-300/16 bg-emerald-300/10 p-4">
                <p className="text-sm font-semibold text-emerald-100">Premium habit</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Generate a report after a meaningful batch, then keep the weekly target visible until it is solved.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {report && !loading ? (
        <div className="mt-8 grid gap-6">
          <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5 shadow-[0_0_20px_rgba(0,212,170,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Overall assessment</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{report.summary}</h2>
              </div>
              <span className="rounded-full border border-[#00d4aa]/30 bg-[#00d4aa]/10 px-4 py-2 text-sm font-semibold text-[#8fffe7]">
                {report.overallRating}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {report.strengths.map((strength) => (
                <span key={strength} className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-sm text-emerald-100">
                  <Check className="size-4" />
                  {strength}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {report.weaknesses.slice(0, 3).map((weakness, index) => {
              const open = openCards.includes(index);

              return (
                <article key={`${weakness.title}-${index}`} className={cn("rounded-xl border border-[#1e1e2e] border-l-4 bg-[#111118] p-5", severityClasses(weakness.severity))}>
                  <button type="button" onClick={() => toggleCard(index)} className="flex w-full items-start justify-between gap-3 text-left">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{weakness.severity}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{weakness.title}</h3>
                    </div>
                    <ChevronDown className={cn("mt-1 size-5 shrink-0 text-slate-500 transition", open ? "rotate-180" : "")} />
                  </button>
                  {open ? (
                    <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
                      <p>{weakness.description}</p>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence</p>
                        <p className="mt-2 text-slate-200">{weakness.evidence}</p>
                      </div>
                      <div className="rounded-lg border border-[#00d4aa]/20 bg-[#00d4aa]/10 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fffe7]">Practice This</p>
                        <p className="mt-2 text-slate-100">{weakness.drill}</p>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="rounded-xl border border-[#00d4aa]/30 bg-[#00d4aa]/12 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8fffe7]">This Week&apos;s Focus:</p>
                <p className="mt-3 text-xl font-semibold text-white">{report.weeklyGoal}</p>
              </div>
              <label className="inline-flex items-center gap-2 rounded-full border border-[#00d4aa]/30 bg-[#0a0a0f]/40 px-4 py-2 text-sm font-semibold text-[#d8fff6]">
                <input
                  type="checkbox"
                  checked={weeklyGoalDone}
                  onChange={(event) => toggleWeeklyGoal(event.target.checked)}
                  className="size-4 accent-[#00d4aa]"
                />
                Done
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Opening recommendation</p>
            <p className="mt-3 text-lg text-slate-200">
              Based on your style, try playing: <span className="font-semibold text-[#00d4aa]">{report.openingRecommendation}</span>
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
