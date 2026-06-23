"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";

import { isStreakAtRisk, readGamificationStats, toLocalDateKey } from "@/lib/badgeChecker";

function dismissedKey() {
  return `knightowl_streak_warning_dismissed_${toLocalDateKey()}`;
}

export function StreakRiskBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    window.queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    function refresh() {
      const dismissed = window.localStorage.getItem(dismissedKey()) === "true";
      setVisible(!dismissed && isStreakAtRisk(readGamificationStats()));
    }

    window.queueMicrotask(refresh);
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("knightowl:stats-updated", refresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("knightowl:stats-updated", refresh);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed left-3 right-3 top-[4.4rem] z-[75] mx-auto max-w-xl rounded-xl border border-amber-300/35 bg-[#111118] p-3 text-amber-50 shadow-[0_18px_60px_rgba(0,0,0,0.42)] md:left-auto md:right-5 md:top-5 md:w-96">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-300/15 text-amber-200">
          <AlertTriangle className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">Streak at risk!</p>
          <p className="text-xs leading-5 text-amber-100/80">Analyze one game tonight to keep your streak alive.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem(dismissedKey(), "true");
            setVisible(false);
          }}
          className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-white/10 text-amber-100 hover:bg-white/[0.06]"
          aria-label="Dismiss streak warning"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
