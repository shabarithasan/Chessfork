"use client";

import { CheckCircle2, Clipboard, Share2, Sparkles, Target, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ChessBoard } from "@/components/analysis/chess-board";
import { samplePuzzles } from "@/data/sample-data";
import { siteConfig } from "@/lib/site";
import type { Puzzle } from "@/types/platform";

interface PuzzleAttemptPanelProps {
  puzzles: Puzzle[];
  eyebrow?: string;
  title?: string;
  description?: string;
}

interface PuzzleAttemptResponse {
  correct?: boolean;
  newRating?: number;
  message?: string;
}

export function PuzzleAttemptPanel({
  puzzles,
  eyebrow = "Training board",
  title = "Turn the problem move into the perfect move.",
  description = "Every attempt becomes a compact lesson: what you tried, what the position wanted, and which pattern should come back tomorrow.",
}: PuzzleAttemptPanelProps) {
  const availablePuzzles = puzzles.length > 0 ? puzzles : samplePuzzles;
  const [selectedId, setSelectedId] = useState(availablePuzzles[0]?.id ?? samplePuzzles[0].id);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const activePuzzle = availablePuzzles.find((puzzle) => puzzle.id === selectedId) ?? availablePuzzles[0];

  if (!activePuzzle) {
    return null;
  }

  const guessedMove = guess.trim();
  const perfectMove = activePuzzle.solution[0] ?? "the engine move";
  const themeSummary = activePuzzle.themes.join(" / ");
  const showPerfectMove = correct !== null || message !== null;
  const perfectLoop = [
    {
      detail: "Candidate",
      icon: XCircle,
      label: "Problem",
      value: guessedMove || "Awaiting move",
    },
    {
      detail: "Engine line",
      icon: Sparkles,
      label: "Perfect",
      value: showPerfectMove ? perfectMove : "Locked",
    },
    {
      detail: "Repeatable pattern",
      icon: Target,
      label: "Proof",
      value: themeSummary || "Tactics",
    },
  ];

  function buildShareText(url: string) {
    const status =
      correct === null
        ? "I am training this position."
        : correct
          ? "I found the perfect move."
          : "I found the problem move and queued the perfect one.";

    return [
      `${siteConfig.name} Problem to Perfect`,
      status,
      `Position: ${activePuzzle.prompt}`,
      `Problem: ${guessedMove || "Candidate move"}`,
      `Perfect: ${perfectMove}`,
      `Pattern: ${themeSummary || "Tactics"}`,
      url,
    ].join("\n");
  }

  async function sharePerfectRecap() {
    const url = `${window.location.origin}/puzzles`;
    const text = buildShareText(url);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${siteConfig.name} Problem to Perfect`,
          text,
          url,
        });
        setShareStatus("Share sheet opened.");
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setShareStatus("Share recap copied.");
        return;
      }

      setShareStatus("Copy the recap text from this card.");
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        return;
      }

      setShareStatus("Sharing did not open. Try copying again.");
    }
  }

  async function copyPerfectRecap() {
    const text = buildShareText(`${window.location.origin}/puzzles`);

    try {
      await navigator.clipboard.writeText(text);
      setShareStatus("Share recap copied.");
    } catch {
      setShareStatus("Copy is unavailable in this browser.");
    }
  }

  async function submitAttempt() {
    if (!guess.trim()) {
      setError("Enter a move before submitting the position.");
      return;
    }

    setPending(true);
    setError(null);
    setShareStatus(null);

    try {
      const response = await fetch("/api/puzzles/attempt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          puzzleId: activePuzzle.id,
          move: guess.trim(),
          elapsedMs: 42000,
        }),
      });

      const data = (await response.json()) as PuzzleAttemptResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Puzzle attempt failed.");
      }

      setMessage(data.message ?? null);
      setRating(data.newRating ?? null);
      setCorrect(data.correct ?? null);
      setAttemptCount((current) => current + 1);
    } catch (caughtError) {
      setMessage(null);
      setRating(null);
      setCorrect(null);
      setError(caughtError instanceof Error ? caughtError.message : "Puzzle attempt failed.");
      setShareStatus(null);
    } finally {
      setPending(false);
    }
  }

  function selectPuzzle(puzzleId: string) {
    setSelectedId(puzzleId);
    setGuess("");
    setMessage(null);
    setRating(null);
    setCorrect(null);
    setError(null);
    setShareStatus(null);
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(245,158,11,0.1),rgba(15,23,42,0.9)_32%,rgba(2,6,23,0.96))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.24)] sm:p-8">
      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">{eyebrow}</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h3>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{description}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
              <Sparkles className="size-3.5" />
              Problem to Perfect
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              {activePuzzle.rating} rating
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              {activePuzzle.themes.length} themes
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              {attemptCount.toString().padStart(2, "0")} tries this session
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {perfectLoop.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-[1.15rem] border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-amber-200" />
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                  </div>
                  <p className="mt-3 break-words text-lg font-semibold text-white">{item.value}</p>
                  <p className="mt-2 text-xs text-slate-500">{item.detail}</p>
                </div>
              );
            })}
          </div>

          {availablePuzzles.length > 1 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {availablePuzzles.map((puzzle) => (
                <button
                  key={puzzle.id}
                  type="button"
                  onClick={() => selectPuzzle(puzzle.id)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    selectedId === puzzle.id
                      ? "bg-amber-300 text-slate-950"
                      : "border border-white/10 bg-slate-950/65 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {puzzle.themes[0]} / {puzzle.rating}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-6 rounded-[1.8rem] border border-white/10 bg-slate-950/55 p-4">
            <ChessBoard fen={activePuzzle.fen} className="max-w-none" />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.3rem] border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Difficulty</p>
              <p className="mt-2 text-2xl font-semibold text-white">{activePuzzle.rating}</p>
              <p className="mt-2 text-sm text-slate-400">Rated from the same loop that powers your puzzle ladder.</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Theme cluster</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activePuzzle.themes.map((theme) => (
                  <span
                    key={theme}
                    className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.7rem] border border-white/10 bg-slate-950/78 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.22)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Active position</p>
              <p className="mt-3 text-xl font-semibold text-white">{activePuzzle.prompt}</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200">
              SAN move
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-slate-300">
            Enter the best move in SAN notation, for example <span className="font-semibold text-white">Qf8#</span> or{" "}
            <span className="font-semibold text-white">Bxf7+</span>.
          </p>

          <input
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void submitAttempt();
              }
            }}
            placeholder="Type your move"
            className="mt-6 h-14 w-full rounded-[1.4rem] border border-white/10 bg-slate-900/90 px-4 text-sm text-slate-100 outline-none transition focus:border-amber-300/70"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={submitAttempt}
              disabled={pending}
              className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Checking..." : "Submit attempt"}
            </button>
            <button
              type="button"
              onClick={() => {
                setGuess("");
                setMessage(null);
                setRating(null);
                setCorrect(null);
                setError(null);
                setShareStatus(null);
              }}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Reset board notes
            </button>
          </div>

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

          {message ? (
            <div
              className={`mt-6 rounded-[1.5rem] border p-5 ${
                correct
                  ? "border-emerald-300/20 bg-emerald-300/10"
                  : "border-amber-300/20 bg-amber-300/10"
              }`}
            >
              <p className={`text-sm font-semibold ${correct ? "text-emerald-100" : "text-amber-100"}`}>
                {correct ? "Perfect logged" : "Problem captured"}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-100">{message}</p>
              {rating !== null ? (
                <p className="mt-4 text-sm font-medium text-white">Projected puzzle rating after sync: {rating}</p>
              ) : null}
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.1rem] border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Problem</p>
                  <p className="mt-2 break-words text-sm font-semibold text-white">{guessedMove || "Candidate move"}</p>
                </div>
                <div className="rounded-[1.1rem] border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Perfect</p>
                  <p className="mt-2 break-words text-sm font-semibold text-white">{perfectMove}</p>
                </div>
                <div className="rounded-[1.1rem] border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pattern</p>
                  <p className="mt-2 break-words text-sm font-semibold text-white">{themeSummary}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={sharePerfectRecap}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/12"
                >
                  <Share2 className="size-4" />
                  Share recap
                </button>
                <button
                  type="button"
                  onClick={copyPerfectRecap}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/35 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  <Clipboard className="size-4" />
                  Copy card
                </button>
                {shareStatus ? <p className="text-sm text-slate-100">{shareStatus}</p> : null}
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Session attempts</p>
              <p className="mt-2 text-2xl font-semibold text-white">{attemptCount.toString().padStart(2, "0")}</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Source lesson</p>
              {activePuzzle.sourceGameId ? (
                <Link
                  href={`/analysis/${activePuzzle.sourceGameId}`}
                  className="mt-2 inline-flex text-sm font-semibold text-amber-300 transition hover:text-amber-200"
                >
                  Open source report
                </Link>
              ) : (
                <p className="mt-2 text-sm text-slate-300">Standalone tactical pack</p>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300">
            <span className="inline-flex items-center gap-2 font-semibold text-white">
              <CheckCircle2 className="size-4 text-emerald-300" />
              Every solve becomes a portable proof card.
            </span>{" "}
            The board, result, and source lesson stay connected so one missed tactic can become tomorrow&apos;s perfect recall.
          </div>
        </div>
      </div>
    </div>
  );
}
