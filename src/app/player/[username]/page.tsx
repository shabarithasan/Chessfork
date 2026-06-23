import type { Metadata } from "next";
import Link from "next/link";

import { formatOpeningName } from "@/lib/chess/openings";
import {
  bestOpeningForPlayer,
  displayNameFromSlug,
  getPlayerRuns,
  mostCommonBlunderType,
  playerAccuracy,
  seoSlug,
} from "@/lib/seo/chess-stats";
import { createSeoMetadata } from "@/lib/seo/metadata";
import { openingPageSlugFor } from "@/data/openings";
import { listAnalysisResponses } from "@/lib/platform-service";
import type { AnalysisRun } from "@/types/platform";

type PlayerPageProps = {
  params: Promise<{ username: string }>;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function AccuracyLineChart({ runs, username }: { runs: AnalysisRun[]; username: string }) {
  const points = runs
    .slice()
    .sort((left, right) => Date.parse(left.playedAt || left.createdAt) - Date.parse(right.playedAt || right.createdAt))
    .map((run, index) => ({
      accuracy: playerAccuracy(run, username),
      index,
      label: formatDate(run.playedAt || run.createdAt),
    }));

  if (points.length === 0) {
    return (
      <div className="grid h-56 place-items-center rounded-xl border border-white/10 bg-black/20 text-sm text-slate-400">
        No analyzed games yet
      </div>
    );
  }

  const width = 720;
  const height = 240;
  const padding = 28;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const pathPoints = points.map((point, index) => {
    const x = padding + (points.length === 1 ? usableWidth / 2 : (index / (points.length - 1)) * usableWidth);
    const y = padding + (1 - point.accuracy / 100) * usableHeight;
    return { ...point, x, y };
  });
  const polyline = pathPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20 p-3">
      <svg aria-label={`${username} average accuracy over time`} className="h-56 w-full" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
        <line stroke="rgba(148,163,184,0.18)" strokeDasharray="6 8" x1={padding} x2={width - padding} y1={padding} y2={padding} />
        <line stroke="rgba(148,163,184,0.18)" strokeDasharray="6 8" x1={padding} x2={width - padding} y1={height / 2} y2={height / 2} />
        <line stroke="rgba(148,163,184,0.18)" strokeDasharray="6 8" x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
        <polyline fill="none" points={polyline} stroke="#00d4aa" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
        {pathPoints.map((point) => (
          <g key={`${point.label}-${point.index}`}>
            <circle cx={point.x} cy={point.y} fill="#0a0a0f" r="7" stroke="#00d4aa" strokeWidth="4" />
            <text fill="#94a3b8" fontSize="11" textAnchor="middle" x={point.x} y={height - 8}>
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { username } = await params;
  const playerName = displayNameFromSlug(username);

  return createSeoMetadata({
    title: `${playerName} Chess Stats`,
    description: `Public Chessfork chess analysis stats for ${playerName}: accuracy trends, best openings, blunder patterns, and recent analyzed games.`,
    path: `/player/${seoSlug(username)}`,
    type: "profile",
  });
}

export default async function Page({ params }: PlayerPageProps) {
  const { username } = await params;
  const allRuns = await listAnalysisResponses();
  const runs = getPlayerRuns(username, allRuns)
    .slice()
    .sort((left, right) => Date.parse(right.playedAt || right.createdAt) - Date.parse(left.playedAt || left.createdAt));
  const requestedPlayerSlug = seoSlug(username);
  const playerName =
    runs
      .flatMap((run) => [run.subject, run.white, run.black])
      .find((name): name is string => Boolean(name && seoSlug(name) === requestedPlayerSlug)) ?? displayNameFromSlug(username);
  const averageAccuracy = runs.length > 0 ? Math.round(runs.reduce((total, run) => total + playerAccuracy(run, username), 0) / runs.length) : 0;
  const bestOpening = bestOpeningForPlayer(runs, username);
  const commonBlunderType = mostCommonBlunderType(runs, username);

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00d4aa]">Public player stats</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{playerName}</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
            Aggregated Chessfork analysis for public Chess.com and Lichess games linked to this player.
          </p>
        </div>
        <Link
          href={`/games/chesscom?username=${encodeURIComponent(username)}`}
          className="rounded-lg bg-[linear-gradient(135deg,#00d4aa,#00a88a)] px-5 py-3 text-sm font-semibold text-[#0a0a0f] transition hover:scale-[1.02] hover:brightness-110"
        >
          Analyze more games
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {[
          { label: "Total games analyzed", value: runs.length },
          { label: "Average accuracy", value: runs.length > 0 ? `${averageAccuracy}%` : "No data" },
          { label: "Best opening", value: bestOpening ? `${bestOpening.name} (${bestOpening.averageAccuracy}%)` : "No data" },
          { label: "Most common blunder type", value: commonBlunderType },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Average accuracy over time</p>
        <div className="mt-4">
          <AccuracyLineChart runs={runs} username={username} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Best opening</p>
          {bestOpening ? (
            <Link href={`/opening/${openingPageSlugFor(bestOpening.name, bestOpening.eco)}`} className="mt-3 block text-2xl font-semibold text-[#00d4aa] hover:text-[#8fffe7]">
              {bestOpening.eco} · {bestOpening.name}
            </Link>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-300">Analyze a few games to build an opening profile.</p>
          )}
        </div>

        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Recent games</p>
          <div className="mt-4 grid gap-3">
            {runs.length > 0 ? (
              runs.slice(0, 8).map((run) => (
                <Link
                  key={run.id}
                  href={`/analysis/${run.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 transition hover:border-[#00d4aa]/30 hover:bg-[#00d4aa]/10"
                >
                  <span className="font-semibold text-white">
                    {run.white} vs {run.black}
                  </span>
                  <span className="text-sm text-slate-400">
                    {playerAccuracy(run, username)}% · {formatOpeningName(run.opening)}
                  </span>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-4 text-sm leading-6 text-slate-300">
                No public analyzed games are linked to this username yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
