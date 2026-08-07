import type { Metadata } from "next";

import { ChessGlobePage } from "@/components/coach/chess-globe";
import { createSeoMetadata } from "@/lib/seo/metadata";

export function generateMetadata(): Metadata {
  return createSeoMetadata({
    title: "Chess Globe",
    description: "Watch live chess games stream around the world on a 3D globe, with live games, countries, and openings.",
    path: "/coach/globe",
  });
}

export default function Page() {
  return (
    <div>
      <div className="mx-auto flex w-full max-w-none flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Supercoach</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Chess Globe</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Live chess games streaming from around the world. Click a marker to inspect a game, or open any row in the
            live feed.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ChessGlobePage />
      </div>
    </div>
  );
}
