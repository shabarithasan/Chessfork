"use client";

import { Clipboard, Flame, Share2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { siteConfig } from "@/lib/site";
import type { MoveGrade } from "@/types/platform";

type RoastTone = "friendly" | "spicy" | "coach";

export interface RoastCardMoment {
  cpLoss: number;
  grade: MoveGrade;
  moveNumber: number;
  perfectMove: string;
  problemMove: string;
  side: "white" | "black";
}

const toneLabels: Record<RoastTone, string> = {
  coach: "Coach",
  friendly: "Friendly",
  spicy: "Spicy",
};

function roastForTone(moment: RoastCardMoment, tone: RoastTone) {
  if (tone === "coach") {
    return `${moment.problemMove} was the problem move. ${moment.perfectMove} kept the position cleaner and belongs in your next Perfects session.`;
  }

  if (tone === "spicy") {
    if (moment.grade === "Blunder") {
      return `${moment.problemMove} entered with confidence and left the eval bar looking for medical attention. ${moment.perfectMove} was the perfect move.`;
    }

    if (moment.grade === "Mistake") {
      return `${moment.problemMove} had ambition, just not evidence. ${moment.perfectMove} was the move with receipts.`;
    }

    return `${moment.problemMove} was playable in the same way cold pizza is breakfast. ${moment.perfectMove} was cleaner.`;
  }

  if (moment.grade === "Blunder") {
    return `${moment.problemMove} was the moment the game got dramatic. ${moment.perfectMove} turns it into a lesson you can actually repeat.`;
  }

  if (moment.grade === "Mistake") {
    return `${moment.problemMove} made life harder than it needed to be. ${moment.perfectMove} was the calm fix.`;
  }

  return `${moment.problemMove} drifted a little. ${moment.perfectMove} is the cleaner habit to train.`;
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

export function RoastCard({
  href,
  moment,
  opening,
  players,
}: {
  href: string;
  moment: RoastCardMoment | null;
  opening: string;
  players: string;
}) {
  const [tone, setTone] = useState<RoastTone>("friendly");
  const [status, setStatus] = useState<string | null>(null);
  const [manualTextVisible, setManualTextVisible] = useState(false);

  if (!moment) {
    return null;
  }

  const roast = roastForTone(moment, tone);
  const shareText = [
    `${siteConfig.name} Roast My Game`,
    roast,
    `Game: ${players}`,
    `Move ${moment.moveNumber}: ${moment.problemMove} -> ${moment.perfectMove}`,
    `Opening: ${opening}`,
    href,
  ].join("\n");
  const heat = Math.min(100, Math.max(18, Math.round(moment.cpLoss / 3)));

  async function copyRoast() {
    const copied = await writeClipboardText(shareText);
    setManualTextVisible(!copied);
    setStatus(copied ? "Roast copied." : "Roast text ready.");
  }

  async function shareRoast() {
    try {
      if (navigator.share) {
        await navigator.share({
          text: shareText,
          title: `${siteConfig.name} Roast My Game`,
          url: href,
        });
        setStatus("Share sheet opened.");
        return;
      }

      const copied = await writeClipboardText(shareText);
      setManualTextVisible(!copied);
      setStatus(copied ? "Share text copied." : "Roast text ready.");
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        return;
      }

      setManualTextVisible(true);
      setStatus("Roast text ready.");
    }
  }

  return (
    <section
      id="roast-card"
      className="rounded-[1.55rem] border border-amber-300/16 bg-[linear-gradient(135deg,rgba(69,26,3,0.56),rgba(15,23,42,0.82)_44%,rgba(2,6,23,0.92))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-5"
    >
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
              <Flame className="size-3.5" />
              Roast My Game
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              {moment.grade}
            </span>
          </div>

          <p className="mt-4 text-2xl font-semibold tracking-tight text-white">This is the shareable turning point.</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">{roast}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {(Object.keys(toneLabels) as RoastTone[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTone(key);
                  setStatus(null);
                  setManualTextVisible(false);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tone === key
                    ? "bg-amber-300 text-slate-950"
                    : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {toneLabels[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/55 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Problem</p>
              <p className="mt-2 break-words text-lg font-semibold text-white">{moment.problemMove}</p>
            </div>
            <div className="rounded-[1rem] border border-emerald-300/15 bg-emerald-300/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-200">Perfect</p>
              <p className="mt-2 break-words text-lg font-semibold text-white">{moment.perfectMove}</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Heat</p>
              <p className="mt-2 text-lg font-semibold text-white">{heat}%</p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#fbbf24,#fb7185)]" style={{ width: `${heat}%` }} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyRoast}
              className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              <Clipboard className="size-4" />
              Copy roast
            </button>
            <button
              type="button"
              onClick={shareRoast}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <Share2 className="size-4" />
              Share
            </button>
            <Link
              href="/puzzles#share-studio"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <Sparkles className="size-4" />
              Make Perfect
            </Link>
            {status ? <p className="text-sm text-slate-200">{status}</p> : null}
          </div>
          {manualTextVisible ? (
            <textarea
              readOnly
              value={shareText}
              className="mt-4 min-h-36 w-full rounded-[1rem] border border-white/10 bg-slate-950/80 p-4 text-sm leading-6 text-slate-100 outline-none focus:border-amber-300/60"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
