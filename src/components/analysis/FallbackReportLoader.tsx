"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GameAnalysisPage } from "@/components/analysis/game-analysis-page";
import type { AnalysisRun } from "@/types/platform";

export function FallbackReportLoader({ analysisId }: { analysisId: string }) {
  const [report, setReport] = useState<AnalysisRun | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`chessfork_fallback_${analysisId}`);
      if (saved) {
        setReport(JSON.parse(saved));
      } else {
        setError(true);
      }
    } catch (e) {
      setError(true);
    }
  }, [analysisId]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center text-white">
        <h2 className="mb-4 text-2xl font-bold text-red-500">Analysis Not Found</h2>
        <p className="text-slate-300">
          The analysis could not be found in the database or your local browser storage.
          This usually happens if the Vercel database is not configured.
        </p>
        <Link href="/" className="mt-6 rounded-lg bg-amber-500 px-6 py-2 font-bold text-black hover:bg-amber-400">
          Return Home
        </Link>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        <div className="text-center">
          <div className="mb-4 size-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto" />
          <p>Loading local analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1540px] overflow-hidden py-2 sm:py-3">
      <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,23,22,0.92),rgba(17,16,15,0.98))] px-3 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:rounded-[1.55rem] sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-3">
              <p className="min-w-0 break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {report.white} report vs {report.black} (Local Fallback)
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Link
              href="/analyze"
              className="flex-1 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-center text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08] sm:flex-none"
            >
              Analyze another game
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <GameAnalysisPage analysis={report} />
      </div>
    </div>
  );
}

