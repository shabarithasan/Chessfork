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
    <section id="roast-card" className="py-8">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/70">
              <Flame className="size-3.5" />
              Roast My Game
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              {moment.grade}
            </span>
          </div>

          <p className="mt-4 text-2xl font-semibold tracking-tight text-white">This is the shareable turning point.</p>
          <p className="mt-3 text-sm leading-7 text-neutral-400">{roast}</p>

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
                className={`rounded-lg px-4 py-2 text-sm font-medium transition active:scale-[0.97] ${
                  tone === key
                    ? "bg-amber-400 text-[#0a0a0a]"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                {toneLabels[key]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Problem</p>
              <p className="mt-2 break-words text-lg font-semibold text-white">{moment.problemMove}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-400/70">Perfect</p>
              <p className="mt-2 break-words text-lg font-semibold text-white">{moment.perfectMove}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Heat</p>
              <p className="mt-2 text-lg font-semibold text-white">{heat}%</p>
            </div>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#fbbf24,#fb7185)]" style={{ width: `${heat}%` }} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyRoast}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-[#0a0a0a] transition hover:bg-amber-500 active:scale-[0.98]"
            >
              <Clipboard className="size-4" />
              Copy roast
            </button>
            <button
              type="button"
              onClick={shareRoast}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700/50 hover:text-white active:scale-[0.98]"
            >
              <Share2 className="size-4" />
              Share
            </button>
            <Link
              href="/puzzles#share-studio"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700/50 hover:text-white active:scale-[0.98]"
            >
              <Sparkles className="size-4" />
              Make Perfect
            </Link>
            {status ? <p className="text-sm text-neutral-400">{status}</p> : null}
          </div>
          {manualTextVisible ? (
            <textarea
              readOnly
              value={shareText}
              className="mt-4 min-h-36 w-full rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4 text-sm leading-6 text-neutral-100 outline-none transition focus:border-amber-400/70"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
