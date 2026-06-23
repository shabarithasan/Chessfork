"use client";

import { Download, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const dismissedKey = "knightowl-install-dismissed";
const visitCountKey = "knightowl-install-visit-count";

export function InstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    window.queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (localStorage.getItem(dismissedKey) === "true") {
      return;
    }

    const nextVisitCount = Number(localStorage.getItem(visitCountKey) ?? "0") + 1;
    localStorage.setItem(visitCountKey, String(nextVisitCount));

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      const deferredEvent = event as BeforeInstallPromptEvent;
      setInstallEvent(deferredEvent);
      setShowPrompt(nextVisitCount >= 3);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(dismissedKey, "true");
    setShowPrompt(false);
    setInstallEvent(null);
  }, []);

  const install = useCallback(() => {
    if (!installEvent) {
      return;
    }

    void installEvent.prompt();
    void installEvent.userChoice.then((choice) => {
      if (choice.outcome === "accepted") {
        localStorage.setItem(dismissedKey, "true");
      }

      setShowPrompt(false);
      setInstallEvent(null);
    });
  }, [installEvent]);

  if (!mounted) {
    return null;
  }

  if (!showPrompt || !installEvent) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-md rounded-xl border border-[#00d4aa]/30 bg-[#111118] p-3 text-white shadow-[0_18px_60px_rgba(0,0,0,0.46),0_0_24px_rgba(0,212,170,0.16)] md:bottom-5">
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#00d4aa] text-slate-950">
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Install Chessfork for faster access</p>
          <p className="text-xs text-slate-400">Open game review from your home screen.</p>
        </div>
        <button type="button" onClick={dismiss} className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/[0.06] hover:text-white" aria-label="Dismiss install prompt">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={install} className="min-h-11 rounded-lg bg-[#00d4aa] px-4 text-sm font-black text-slate-950 hover:bg-[#26e8c1]">
          Install App
        </button>
        <button type="button" onClick={dismiss} className="min-h-11 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-100 hover:bg-white/[0.08]">
          Not now
        </button>
      </div>
    </div>
  );
}
