"use client";

import { useEffect, useState } from "react";
import { AnalysisReport } from "@/components/analysis/AnalysisReport";
import type { GameReport } from "@/lib/report-generator";

export function FallbackReportLoader({ analysisId }: { analysisId: string }) {
  const [report, setReport] = useState<any | null>(null);
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
        <a href="/" className="mt-6 rounded-lg bg-amber-500 px-6 py-2 font-bold text-black hover:bg-amber-400">
          Return Home
        </a>
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
    <div className="mx-auto max-w-7xl pt-4">
      <AnalysisReport report={report} onJumpToMove={() => {}} onViewInteractive={() => {}} />
    </div>
  );
}
