"use client";

import { Clipboard, Eye, Share2, Swords, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ChessBoard } from "@/components/analysis/chess-board";
import { siteConfig } from "@/lib/site";

export interface PerfectChallengeProfile {
  challengeId: string;
  difficulty: number;
  fen: string;
  from: string;
  moveNumber: number;
  opening: string;
  perfectMove: string;
  playedMove: string;
  playerName: string;
  side: "black" | "white";
  stakes: string;
  to: string;
}

function normalizeMove(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[+#?!\s]/g, "")
    .replace(/0/g, "o");
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

export function PerfectChallengeCard({
  challenge,
  shareHref,
}: {
  challenge: PerfectChallengeProfile | null;
  shareHref: string;
}) {
  const [guess, setGuess] = useState("");
  const [manualText, setManualText] = useState<string | null>(null);
  const [manualTextVisible, setManualTextVisible] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<"close" | "correct" | "empty" | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  if (!challenge) {
    return null;
  }

  const puzzle = challenge;
  const isCorrect = normalizeMove(guess) === normalizeMove(puzzle.perfectMove);

  function getShareUrl() {
    try {
      return new URL(shareHref, window.location.origin).toString();
    } catch {
      return shareHref;
    }
  }

  function buildShareText(shareUrl: string) {
    return [
      `${siteConfig.name} Perfect Challenge`,
      `${puzzle.playerName} played ${puzzle.playedMove} on move ${puzzle.moveNumber}. Can you find the perfect move?`,
      `Opening: ${puzzle.opening}`,
      `Difficulty: ${puzzle.difficulty}%`,
      shareUrl,
    ].join("\n");
  }

  const fallbackShareText = buildShareText(shareHref);

  function checkGuess() {
    if (!guess.trim()) {
      setResult("empty");
      setStatus("Enter a move first.");
      return;
    }

    setResult(isCorrect ? "correct" : "close");
    setStatus(isCorrect ? "Perfect found." : "Not the perfect move yet.");
    setRevealed(isCorrect);
  }

  async function copyChallenge() {
    const shareText = buildShareText(getShareUrl());
    setManualText(shareText);
    const copied = await writeClipboardText(shareText);
    setManualTextVisible(!copied);
    setStatus(copied ? "Challenge copied." : "Challenge text ready.");
  }

  async function shareChallenge() {
    try {
      const shareUrl = getShareUrl();
      const shareText = buildShareText(shareUrl);
      setManualText(shareText);

      if (navigator.share) {
        await navigator.share({
          text: shareText,
          title: `${siteConfig.name} Perfect Challenge`,
          url: shareUrl,
        });
        setStatus("Share sheet opened.");
        return;
      }

      const copied = await writeClipboardText(shareText);
      setManualTextVisible(!copied);
      setStatus(copied ? "Challenge text copied." : "Challenge text ready.");
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        return;
      }

      setManualText(buildShareText(getShareUrl()));
      setManualTextVisible(true);
      setStatus("Challenge text ready.");
    }
  }

  return (
    <section
      id="perfect-challenge"
      className="rounded-[1.7rem] border border-lime-200/15 bg-[linear-gradient(120deg,rgba(190,242,100,0.15),transparent_35%),linear-gradient(135deg,rgba(20,83,45,0.48),rgba(15,23,42,0.88)_46%,rgba(2,6,23,0.96))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
    >
      <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-lime-200/25 bg-lime-200/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-lime-100">
              <Swords className="size-3.5" />
              Perfect Challenge
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              {puzzle.challengeId}
            </span>
          </div>

          <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">Can you find the perfect move?</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {puzzle.playerName} played <span className="font-semibold text-white">{puzzle.playedMove}</span> on move{" "}
            {puzzle.moveNumber}. Your job is to find the engine-approved move before the reveal.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Side</p>
              <p className="mt-2 text-lg font-semibold capitalize text-white">{puzzle.side}</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Difficulty</p>
              <p className="mt-2 text-lg font-semibold text-white">{puzzle.difficulty}%</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Stakes</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white">{puzzle.stakes}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[1rem] border border-white/10 bg-slate-950/55 p-4">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-100" htmlFor={`${puzzle.challengeId}-guess`}>
              Your move
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                id={`${puzzle.challengeId}-guess`}
                value={guess}
                onChange={(event) => {
                  setGuess(event.target.value);
                  setResult(null);
                  setStatus(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    checkGuess();
                  }
                }}
                className="min-h-12 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-lime-200/55"
                placeholder="Example: Qf8#"
                type="text"
              />
              <button
                type="button"
                onClick={checkGuess}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-lime-200 px-5 text-sm font-semibold text-slate-950 transition hover:bg-lime-100"
              >
                <Target className="size-4" />
                Check
              </button>
              <button
                type="button"
                onClick={() => {
                  setRevealed(true);
                  setResult(null);
                  setStatus("Perfect move revealed.");
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                <Eye className="size-4" />
                Reveal
              </button>
            </div>

            {result || revealed ? (
              <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/[0.04] p-4">
                {result === "empty" ? <p className="text-sm font-semibold text-slate-200">Try a move first.</p> : null}
                {result === "close" ? <p className="text-sm font-semibold text-amber-100">Good try. The perfect move is still hidden.</p> : null}
                {result === "correct" ? (
                  <p className="flex items-center gap-2 text-sm font-semibold text-lime-100">
                    <Trophy className="size-4" />
                    Correct: {puzzle.perfectMove}
                  </p>
                ) : null}
                {revealed && result !== "correct" ? <p className="text-sm font-semibold text-lime-100">Perfect: {puzzle.perfectMove}</p> : null}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={copyChallenge}
                className="inline-flex items-center gap-2 rounded-full bg-lime-200 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-lime-100"
              >
                <Clipboard className="size-4" />
                Copy challenge
              </button>
              <button
                type="button"
                onClick={shareChallenge}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                <Share2 className="size-4" />
                Share
              </button>
              <Link
                href="/puzzles#share-studio"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                <Trophy className="size-4" />
                Make card
              </Link>
              {status ? <p className="text-sm text-slate-200">{status}</p> : null}
            </div>

            {manualTextVisible ? (
              <textarea
                readOnly
                value={manualText ?? fallbackShareText}
                className="mt-4 min-h-36 w-full rounded-[1rem] border border-white/10 bg-slate-950/80 p-4 text-sm leading-6 text-slate-100 outline-none focus:border-lime-200/60"
              />
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <ChessBoard
            fen={puzzle.fen}
            arrows={[{ from: puzzle.from, to: puzzle.to, tone: "played" }]}
            className="mx-auto max-w-[30rem]"
            highlights={[
              { square: puzzle.from, tone: "from" },
              { square: puzzle.to, tone: "to" },
            ]}
            orientation={puzzle.side}
            pieceTheme="neo"
            tone="forest"
            variant="simple"
          />
          <p className="mt-3 text-center text-xs uppercase tracking-[0.18em] text-slate-500">{puzzle.opening}</p>
        </div>
      </div>
    </section>
  );
}
