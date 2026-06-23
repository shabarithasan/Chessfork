"use client";

import { useEffect } from "react";

import { recordAnalysisAndCheckBadges } from "@/lib/badgeChecker";
import { saveGuestAnalysis } from "@/lib/guestSession";
import type { AnalysisRun } from "@/types/platform";

export function GuestAnalysisRecorder({ analysis }: { analysis: AnalysisRun }) {
  useEffect(() => {
    recordAnalysisAndCheckBadges(analysis);
    saveGuestAnalysis(analysis);
  }, [analysis]);

  return null;
}
