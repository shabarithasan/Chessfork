import type { Metadata } from "next";

import { createSeoMetadata } from "@/lib/seo/metadata";

export function generateMetadata(): Metadata {
  return createSeoMetadata({
    title: "About Chessfork",
    description: "Chessfork is a free chess analysis platform powered by Stockfish 18, with move grades, AI coaching, and puzzles.",
    path: "/about",
  });
}

export default function AboutPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-[18px] border bg-[var(--bg-card)] p-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">About Chessfork</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Chessfork is a free chess analysis platform powered by Stockfish 18 — move-by-move
          grades, AI coaching, perfect-move drills, and puzzles. More about the project is
          on its way.
        </p>
      </div>
    </div>
  );
}
