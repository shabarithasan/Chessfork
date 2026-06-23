import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getOpeningBySlug, topChessOpenings } from "@/data/openings";
import { getOpeningRuns, averageAccuracyForRuns } from "@/lib/seo/chess-stats";
import { createSeoMetadata } from "@/lib/seo/metadata";
import { listAnalysisResponses } from "@/lib/platform-service";

type OpeningPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return topChessOpenings.map((opening) => ({ slug: opening.slug }));
}

export async function generateMetadata({ params }: OpeningPageProps): Promise<Metadata> {
  const { slug } = await params;
  const opening = getOpeningBySlug(slug);

  if (!opening) {
    return createSeoMetadata({
      title: "Chess Opening Guide",
      description: "Explore chess opening analysis, accuracy stats, and recent Chessfork game reviews.",
      path: `/opening/${slug}`,
    });
  }

  return createSeoMetadata({
    title: `${opening.name} Chess Opening Guide`,
    description: `${opening.name} (${opening.eco}) plans, common variations, Chessfork accuracy stats, and recent analyzed games.`,
    path: `/opening/${opening.slug}`,
  });
}

export default async function Page({ params }: OpeningPageProps) {
  const { slug } = await params;
  const opening = getOpeningBySlug(slug);

  if (!opening) {
    notFound();
  }

  const allRuns = await listAnalysisResponses();
  const openingRuns = getOpeningRuns(opening, allRuns);
  const averageAccuracy = averageAccuracyForRuns(openingRuns);
  const recentGames = openingRuns
    .slice()
    .sort((left, right) => Date.parse(right.playedAt || right.createdAt) - Date.parse(left.playedAt || left.createdAt))
    .slice(0, 6);

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00d4aa]">Opening guide</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{opening.name}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">{opening.description}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full border border-[#00d4aa]/25 bg-[#00d4aa]/10 px-4 py-2 text-sm font-semibold text-[#9fffea]">
              ECO {opening.eco}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200">
              {openingRuns.length} games analyzed on Chessfork used this opening
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200">
              Average accuracy: {averageAccuracy > 0 ? `${averageAccuracy}%` : "Not enough data yet"}
            </span>
          </div>

          <Link
            href={`/analyze?opening=${encodeURIComponent(opening.name)}`}
            className="mt-8 inline-flex rounded-lg bg-[linear-gradient(135deg,#00d4aa,#00a88a)] px-5 py-3 text-sm font-semibold text-[#0a0a0f] transition hover:scale-[1.02] hover:brightness-110"
          >
            Analyze your {opening.name} games →
          </Link>
        </div>

        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5 shadow-[0_0_20px_rgba(0,212,170,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Common variations</p>
          <div className="mt-5 grid gap-3">
            {opening.variations.map((variation) => (
              <div key={variation} className="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-slate-100">
                {variation}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Recent analyzed games</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Games using {opening.name}</h2>
          </div>
          <Link href="/games" className="text-sm font-semibold text-[#00d4aa] hover:text-[#8fffe7]">
            View all games
          </Link>
        </div>

        <div className="mt-5 grid gap-3">
          {recentGames.length > 0 ? (
            recentGames.map((run) => (
              <Link
                key={run.id}
                href={`/analysis/${run.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 transition hover:border-[#00d4aa]/30 hover:bg-[#00d4aa]/10"
              >
                <span className="font-semibold text-white">
                  {run.white} vs {run.black}
                </span>
                <span className="text-sm text-slate-400">{Math.round((run.accuracyWhite + run.accuracyBlack) / 2)}% avg accuracy</span>
              </Link>
            ))
          ) : (
            <p className="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-4 text-sm leading-6 text-slate-300">
              No public Chessfork analysis has used this opening yet. Analyze a game to create the first linked report.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
