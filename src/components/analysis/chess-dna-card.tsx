"use client";

import { Activity, Clipboard, Dna, Share2, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { siteConfig } from "@/lib/site";

export interface ChessDnaTrait {
  description: string;
  key: string;
  label: string;
  score: number;
}

export interface ChessDnaProfile {
  archetype: string;
  code: string;
  headline: string;
  nextQuest: string;
  playerName: string;
  proof: string;
  signature: string;
  traits: ChessDnaTrait[];
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

export function ChessDnaCard({
  profile,
  shareHref,
}: {
  profile: ChessDnaProfile | null;
  shareHref: string;
}) {
  const [manualText, setManualText] = useState<string | null>(null);
  const [manualTextVisible, setManualTextVisible] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!profile) {
    return null;
  }

  const dna = profile;
  const leadingTrait = dna.traits[0];

  function getShareUrl() {
    try {
      return new URL(shareHref, window.location.origin).toString();
    } catch {
      return shareHref;
    }
  }

  function buildShareText(shareUrl: string) {
    return [
      `${siteConfig.name} Chess DNA`,
      `${dna.playerName}: ${dna.archetype}`,
      `Code: ${dna.code}`,
      `Signature: ${dna.signature}`,
      `Top trait: ${leadingTrait.label} ${leadingTrait.score}%`,
      dna.headline,
      shareUrl,
    ].join("\n");
  }

  const fallbackShareText = buildShareText(shareHref);

  async function copyDna() {
    const shareText = buildShareText(getShareUrl());
    setManualText(shareText);
    const copied = await writeClipboardText(shareText);
    setManualTextVisible(!copied);
    setStatus(copied ? "DNA card copied." : "DNA text ready.");
  }

  async function shareDna() {
    try {
      const shareUrl = getShareUrl();
      const shareText = buildShareText(shareUrl);
      setManualText(shareText);

      if (navigator.share) {
        await navigator.share({
          text: shareText,
          title: `${siteConfig.name} Chess DNA`,
          url: shareUrl,
        });
        setStatus("Share sheet opened.");
        return;
      }

      const copied = await writeClipboardText(shareText);
      setManualTextVisible(!copied);
      setStatus(copied ? "DNA text copied." : "DNA text ready.");
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        return;
      }

      setManualText(buildShareText(getShareUrl()));
      setManualTextVisible(true);
      setStatus("DNA text ready.");
    }
  }

  return (
    <section
      id="chess-dna"
      className="overflow-hidden rounded-lg border border-cyan-400/15 bg-[linear-gradient(115deg,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(7,46,51,0.68),rgba(15,23,42,0.9)_46%,rgba(2,6,23,0.96))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
    >
      <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              <Dna className="size-3.5" />
              Chess DNA
            </span>
            <span className="rounded-full border border-neutral-800 bg-neutral-800/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300">
              {dna.code}
            </span>
          </div>

          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">{dna.playerName}</p>
          <h3 className="mt-2 text-3xl font-semibold tracking-tight text-white">{dna.archetype}</h3>
          <p className="mt-3 text-sm leading-7 text-neutral-300">{dna.headline}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1rem] border border-neutral-800 bg-neutral-800/30 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                <Target className="size-4" />
                Signature
              </p>
              <p className="mt-2 break-words text-sm font-semibold leading-6 text-white">{dna.signature}</p>
            </div>
            <div className="rounded-[1rem] border border-neutral-800 bg-neutral-800/30 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                <Activity className="size-4" />
                Proof
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white">{dna.proof}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-950/55 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {dna.traits.map((trait) => (
              <div key={trait.key} className="rounded-[1rem] border border-neutral-800 bg-neutral-900/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{trait.label}</p>
                  <p className="text-sm font-semibold text-cyan-100">{trait.score}%</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#a7f3d0,#fde68a)]"
                    style={{ width: `${trait.score}%` }}
                  />
                </div>
                <p className="mt-3 text-xs leading-6 text-neutral-400">{trait.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[1rem] border border-emerald-400/15 bg-emerald-400/8 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
              <Sparkles className="size-4" />
              Next quest
            </p>
            <p className="mt-2 text-sm leading-7 text-neutral-100">{dna.nextQuest}</p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyDna}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-[#0a0a0a] transition hover:bg-cyan-500"
            >
              <Clipboard className="size-4" />
              Copy DNA
            </button>
            <button
              type="button"
              onClick={shareDna}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800/30 px-4 py-2.5 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700/40"
            >
              <Share2 className="size-4" />
              Share
            </button>
            <Link
              href="/wrapped/2025"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800/30 px-4 py-2.5 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700/40"
            >
              <Sparkles className="size-4" />
              Build wrapped
            </Link>
            {status ? <p className="text-sm text-neutral-200">{status}</p> : null}
          </div>

          {manualTextVisible ? (
            <textarea
              readOnly
              value={manualText ?? fallbackShareText}
              className="mt-4 min-h-36 w-full rounded-[1rem] border border-neutral-800 bg-neutral-950/80 p-4 text-sm leading-6 text-neutral-100 outline-none focus:border-cyan-400/60"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
