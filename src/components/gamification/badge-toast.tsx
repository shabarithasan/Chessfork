"use client";

import { useEffect, useState } from "react";

import { rarityLabel, type Badge } from "@/lib/badges";
import { cn } from "@/lib/utils";

type BadgeUnlockEvent = CustomEvent<{ badges: Badge[] }>;

const rarityToastClasses: Record<Badge["rarity"], string> = {
  common: "border-slate-400/30 bg-slate-950/95 shadow-[0_18px_60px_rgba(15,23,42,0.4)]",
  epic: "border-fuchsia-300/55 bg-[#151020]/95 shadow-[0_18px_70px_rgba(192,38,211,0.28)]",
  legendary: "badge-legendary-shimmer border-amber-300/70 bg-[#191104]/95 shadow-[0_18px_80px_rgba(245,158,11,0.34)]",
  rare: "border-sky-300/55 bg-[#07131f]/95 shadow-[0_18px_70px_rgba(14,165,233,0.28)]",
};

function playChime() {
  try {
    const AudioContext = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
    gain.connect(context.destination);

    for (const [index, frequency] of [659, 880].entries()) {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.08);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.08);
      oscillator.stop(context.currentTime + 0.44);
    }

    window.setTimeout(() => void context.close(), 650);
  } catch {
    // Browsers can block audio without a recent user gesture.
  }
}

export function BadgeToast() {
  const [queue, setQueue] = useState<Badge[]>([]);

  useEffect(() => {
    function handleUnlock(event: Event) {
      const badges = (event as BadgeUnlockEvent).detail?.badges ?? [];

      if (badges.length === 0) {
        return;
      }

      playChime();
      setQueue((currentQueue) => [...currentQueue, ...badges]);
    }

    window.addEventListener("knightowl:badges-unlocked", handleUnlock);
    return () => window.removeEventListener("knightowl:badges-unlocked", handleUnlock);
  }, []);

  useEffect(() => {
    if (queue.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setQueue((currentQueue) => currentQueue.slice(1));
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [queue]);

  const badge = queue[0];

  if (!badge) {
    return null;
  }

  return (
    <div className="badge-toast-slide fixed right-3 top-3 z-[90] w-[min(24rem,calc(100vw-1.5rem))]">
      <div className={cn("rounded-xl border p-4 text-white backdrop-blur-xl", rarityToastClasses[badge.rarity])}>
        <div className="flex items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-white/[0.08] text-4xl">{badge.icon}</span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00d4aa]">Badge Unlocked!</p>
            <p className="mt-1 truncate text-lg font-black text-white">{badge.name}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{rarityLabel(badge.rarity)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
