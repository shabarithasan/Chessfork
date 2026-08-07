"use client";

import { Clipboard, Share2, ShieldAlert, Sparkles, Sword } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { siteConfig } from "@/lib/site";

export interface ChessVillainProfile {
  antidote: string;
  heat: number;
  name: string;
  perfectMove: string;
  problemMove: string;
  proof: string;
  weakness: string;
}

async function writeClipboardText(text: string) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Try the textarea fallback below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

export function ChessVillainCard({
  profile,
  shareHref,
}: {
  profile: ChessVillainProfile | null;
  shareHref: string;
}) {
  const [manualText, setManualText] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [manualTextVisible, setManualTextVisible] = useState(false);

  if (!profile) {
    return null;
  }

  const villain = profile;

  function getShareUrl() {
    try {
      return new URL(shareHref, window.location.origin).toString();
    } catch {
      return shareHref;
    }
  }

  function buildShareText(shareUrl: string) {
    return [
      `${siteConfig.name} Chess Villain`,
      `Villain: ${villain.name}`,
      `Weakness: ${villain.weakness}`,
      `Problem: ${villain.problemMove}`,
      `Perfect: ${villain.perfectMove}`,
      `Antidote: ${villain.antidote}`,
      shareUrl,
    ].join("\n");
  }

  const fallbackShareText = buildShareText(shareHref);

  async function copyVillain() {
    const shareText = buildShareText(getShareUrl());
    setManualText(shareText);
    const copied = await writeClipboardText(shareText);
    setManualTextVisible(!copied);
    setStatus(copied ? "Villain card copied." : "Villain text ready.");
  }

  async function shareVillain() {
    try {
      const shareUrl = getShareUrl();
      const shareText = buildShareText(shareUrl);
      setManualText(shareText);

      if (navigator.share) {
        await navigator.share({
          text: shareText,
          title: `${siteConfig.name} Chess Villain`,
          url: shareUrl,
        });
        setStatus("Share sheet opened.");
        return;
      }

      const copied = await writeClipboardText(shareText);
      setManualTextVisible(!copied);
      setStatus(copied ? "Share text copied." : "Villain text ready.");
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        return;
      }

      setManualText(buildShareText(getShareUrl()));
      setManualTextVisible(true);
      setStatus("Villain text ready.");
    }
  }

  return (
    <section
      id="chess-villain"
      className="rounded-lg border border-rose-400/16 bg-[linear-gradient(135deg,rgba(76,5,25,0.48),rgba(15,23,42,0.84)_42%,rgba(2,6,23,0.94))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-300/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
              <ShieldAlert className="size-3.5" />
              Chess Villain
            </span>
            <span className="rounded-full border border-neutral-800 bg-neutral-800/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300">
              {profile.heat}% heat
            </span>
          </div>

          <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">{profile.name}</h3>
          <p className="mt-3 text-sm leading-7 text-neutral-300">{profile.weakness}</p>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#fbbf24,#fb7185,#a78bfa)]" style={{ width: `${profile.heat}%` }} />
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-950/55 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-neutral-800 bg-neutral-900/30 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Problem</p>
              <p className="mt-2 break-words text-lg font-semibold text-white">{profile.problemMove}</p>
            </div>
            <div className="rounded-[1rem] border border-emerald-400/15 bg-emerald-400/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-400">Perfect</p>
              <p className="mt-2 break-words text-lg font-semibold text-white">{profile.perfectMove}</p>
            </div>
            <div className="rounded-[1rem] border border-neutral-800 bg-neutral-900/30 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Proof</p>
              <p className="mt-2 break-words text-sm font-semibold leading-6 text-white">{profile.proof}</p>
            </div>
          </div>

          <div className="mt-4 rounded-[1rem] border border-amber-400/15 bg-amber-400/8 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">
              <Sword className="size-4" />
              Antidote
            </p>
            <p className="mt-2 text-sm leading-7 text-neutral-100">{profile.antidote}</p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyVillain}
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2.5 text-sm font-semibold text-[#0a0a0a] transition hover:bg-amber-500"
            >
              <Clipboard className="size-4" />
              Copy villain
            </button>
            <button
              type="button"
              onClick={shareVillain}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800/30 px-4 py-2.5 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700/40"
            >
              <Share2 className="size-4" />
              Share
            </button>
            <Link
              href="/puzzles#share-studio"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800/30 px-4 py-2.5 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700/40"
            >
              <Sparkles className="size-4" />
              Train antidote
            </Link>
            {status ? <p className="text-sm text-neutral-200">{status}</p> : null}
          </div>

          {manualTextVisible ? (
            <textarea
              readOnly
              value={manualText ?? fallbackShareText}
              className="mt-4 min-h-36 w-full rounded-[1rem] border border-neutral-800 bg-neutral-950/80 p-4 text-sm leading-6 text-neutral-100 outline-none focus:border-amber-400/60"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
