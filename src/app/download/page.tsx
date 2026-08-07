"use client";

import { Check, Download, Info, MonitorSmartphone, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ChessforkLogo } from "@/components/brand/chessfork-logo";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function DownloadPage() {
  const [mounted, setMounted] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    window.queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  function install() {
    if (!installEvent) {
      return;
    }

    void installEvent.prompt();
    void installEvent.userChoice.then((choice) => {
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setInstallEvent(null);
    });
  }

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-[18px] border bg-[var(--bg-card)] shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="relative border-b p-6">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(200px_100px_at_50%_0%,rgba(251,191,36,0.12),transparent_70%)]"
          />
          <div className="relative flex flex-col items-center gap-3 text-center">
            <span className="grid size-14 place-items-center rounded-2xl border bg-[var(--bg-secondary)]">
              <ChessforkLogo alt="" className="size-7 shrink-0" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">Download Chessfork</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Install the app for one-tap access to game review, coach and puzzles.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-6">
          {installed ? (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--green)]/15 text-[var(--green)]">
                <Check className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">Chessfork is installed</p>
                <p className="text-xs text-[var(--text-muted)]">Launch it from your home screen or app list.</p>
              </div>
            </div>
          ) : installEvent ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={install}
                className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[var(--accent)] text-sm font-bold text-black shadow-md transition hover:brightness-110"
              >
                <Download className="size-4" />
                Install App
              </button>
              <p className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <MonitorSmartphone className="size-3.5 shrink-0" />
                Follow the browser prompt to finish installing.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <Info className="size-3.5" />
                  How to install
                </p>
                <ul className="flex flex-col gap-2 text-[13px] text-[var(--text-secondary)]">
                  <li className="flex items-center gap-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--accent-dim)] text-[10px] font-bold text-[var(--accent)]">
                      1
                    </span>
                    Desktop (Chrome / Edge): open the browser menu and choose &quot;Install Chessfork&quot;.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--accent-dim)] text-[10px] font-bold text-[var(--accent)]">
                      2
                    </span>
                    iPhone / iPad (Safari): tap Share, then &quot;Add to Home Screen&quot;.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--accent-dim)] text-[10px] font-bold text-[var(--accent)]">
                      3
                    </span>
                    Android (Chrome): tap the install icon in the address bar.
                  </li>
                </ul>
              </div>
              <p className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Smartphone className="size-3.5 shrink-0" />
                Or just keep browsing — Chessfork will offer to install after a few visits.
              </p>
            </div>
          )}

          <Link
            href="/"
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-[14px] border border-[var(--border)]",
              "text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-card-hover)]",
            )}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
