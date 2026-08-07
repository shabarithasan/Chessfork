import type { Metadata } from "next";

import { createSeoMetadata } from "@/lib/seo/metadata";

export function generateMetadata(): Metadata {
  return createSeoMetadata({
    title: "Chessfork Benchmark",
    description: "Engine speed and accuracy benchmarks for Chessfork's Stockfish analysis pipeline.",
    path: "/benchmark",
  });
}

export default function BenchmarkPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-[18px] border bg-[var(--bg-card)] p-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Benchmark</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Engine speed and accuracy benchmarks for Chessfork&apos;s Stockfish analysis pipeline are
          on their way. Check back soon for nodes-per-second and accuracy test results.
        </p>
      </div>
    </div>
  );
}
