"use client";

import { BadgeCheck, Clock3, Database, LogIn } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { readGuestAnalyses, type GuestAnalysisSummary } from "@/lib/guestSession";
import { cn } from "@/lib/utils";

function averageAccuracy(game: Pick<GuestAnalysisSummary, "accuracyBlack" | "accuracyWhite">) {
  return Math.round((game.accuracyWhite + game.accuracyBlack) / 2);
}

function formatDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function resultTone(result: string) {
  if (result === "1-0") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  if (result === "0-1") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  return "border-white/10 bg-white/[0.04] text-slate-200";
}

export function GuestGamesPage() {
  const [games, setGames] = useState<GuestAnalysisSummary[]>([]);

  useEffect(() => {
    function refresh() {
      setGames(readGuestAnalyses());
    }

    window.queueMicrotask(refresh);
    window.addEventListener("knightowl:guest-updated", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("knightowl:guest-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const stats = useMemo(() => {
    const uniqueOpenings = new Set(games.map((game) => game.openingName)).size;
    const average = games.length > 0 ? Math.round(games.reduce((total, game) => total + averageAccuracy(game), 0) / games.length) : 0;
    return {
      average,
      games: games.length,
      openings: uniqueOpenings,
    };
  }, [games]);

  return (
    <section className="mx-auto w-full max-w-[1300px] py-4 lg:py-6">
      <div className="rounded-[1.5rem] border border-[#00d4aa]/25 bg-[#00d4aa]/10 p-4 text-[#d8fff6] shadow-[0_20px_70px_rgba(0,0,0,0.24)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-[#00d4aa]/15">
              <BadgeCheck className="size-5 text-[#00d4aa]" />
            </span>
            <div>
              <p className="text-sm font-black">Guest history is on this device</p>
              <p className="mt-1 text-xs leading-5 text-[#b9fff1]/80">Guests keep the last 10 analyzed games. Sign in for unlimited history across devices.</p>
            </div>
          </div>
          <Link href="/auth?next=%2Fgames" className="rounded-lg bg-[#00d4aa] px-4 py-2 text-sm font-black text-slate-950 hover:bg-[#26e8c1]">
            Sign in to sync
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Database, label: "Guest games", value: `${stats.games} / 10` },
          { icon: BadgeCheck, label: "Average accuracy", value: `${stats.average}%` },
          { icon: Clock3, label: "Openings", value: stats.openings.toString() },
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <div key={metric.label} className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4">
              <Icon className="size-5 text-[#00d4aa]" />
              <p className="mt-3 text-3xl font-black text-white">{metric.value}</p>
              <p className="mt-1 text-sm text-slate-400">{metric.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-[#1e1e2e] bg-[#111118] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Your guest game history</h1>
            <p className="mt-2 text-sm text-slate-400">Saved locally in this browser. No account needed to analyze.</p>
          </div>
          <Link href="/analyze" className="rounded-lg bg-[#00d4aa] px-4 py-2 text-sm font-black text-slate-950 hover:bg-[#26e8c1]">
            Analyze more
          </Link>
        </div>

        {games.length > 0 ? (
          <div className="grid gap-3 p-4">
            {games.map((game) => (
              <Link
                key={game.id}
                href={game.shareUrl}
                className="rounded-xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-[#00d4aa]/35 hover:bg-[#00d4aa]/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-white">
                      {game.white} vs {game.black}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      {game.openingEco} / {game.openingName}
                    </p>
                  </div>
                  <span className={cn("rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em]", resultTone(game.result))}>
                    {game.result}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-slate-300">
                    {formatDate(game.playedAt)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-slate-300">
                    {averageAccuracy(game)}% accuracy
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-slate-300">
                    {game.depth === "deep" ? "Deep" : "Quick"} review
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid place-items-center px-5 py-14 text-center">
            <LogIn className="size-10 text-slate-600" />
            <p className="mt-4 text-lg font-black text-white">No guest games yet</p>
            <p className="mt-2 max-w-md text-sm leading-7 text-slate-400">
              Analyze from Chess.com, Lichess, or PGN and your last 10 reports will appear here automatically.
            </p>
            <Link href="/analyze" className="mt-5 rounded-lg bg-[#00d4aa] px-4 py-2 text-sm font-black text-slate-950 hover:bg-[#26e8c1]">
              Start analyzing
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
