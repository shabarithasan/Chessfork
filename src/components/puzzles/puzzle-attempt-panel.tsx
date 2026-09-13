"use client";

import { Clipboard, Share2, Sparkles, Target, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

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
  const activePuzzle = availablePuzzles.find((puzzle) => puzzle.id === selectedId) ?? availablePuzzles[0];

  const [game, setGame] = useState(new Chess(activePuzzle.fen));
  const [moveIndex, setMoveIndex] = useState(0);

  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  // When puzzle changes, reset everything
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGame(new Chess(activePuzzle.fen));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMoveIndex(0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuess("");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRating(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCorrect(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShareStatus(null);
  }, [activePuzzle.fen]);

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

  async function submitAttempt(finalGuess: string) {
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
          move: finalGuess,
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

  function onPieceDrop(args: { sourceSquare: string, targetSquare: string | null, piece: any }) {
    if (correct !== null || pending) return false;

    const { sourceSquare, targetSquare, piece } = args;
    if (!targetSquare) return false;

    const gameCopy = new Chess(game.fen());
    let move;
    try {
      move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: typeof piece === "object" && piece.pieceType && piece.pieceType.length === 2 ? piece.pieceType[1].toLowerCase() : "q",
      });
    } catch {
      return false;
    }

    if (!move) return false;

    const expectedSan = activePuzzle.solution[moveIndex];
    if (move.san === expectedSan) {
      // Correct move
      setGame(gameCopy);
      setError(null);
      
      if (moveIndex === 0) {
        setGuess(move.san);
      }

      const nextIndex = moveIndex + 1;
      
      if (nextIndex >= activePuzzle.solution.length) {
        // Puzzle fully solved!
        setMoveIndex(nextIndex);
        setCorrect(true);
        void submitAttempt(moveIndex === 0 ? move.san : guess); 
      } else {
        // Computer replies
        setMoveIndex(nextIndex + 1);
        setTimeout(() => {
          const compGame = new Chess(gameCopy.fen());
          compGame.move(activePuzzle.solution[nextIndex]);
          setGame(compGame);
        }, 300);
      }
      return true;
    } else {
      // Incorrect move
      setError(`Incorrect move. Try again!`);
      if (moveIndex === 0) {
        setGuess(move.san);
        setCorrect(false);
        void submitAttempt(move.san);
      }
      return false; // Piece snaps back
    }
  }

  function selectPuzzle(puzzleId: string) {
    setSelectedId(puzzleId);
  }

  const darkSquareStyle = { backgroundColor: "#769656" };
  const lightSquareStyle = { backgroundColor: "#eeeed2" };
  const dropSquareStyle = { boxShadow: "inset 0 0 1px 4px rgba(255,255,255,0.3)" };

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
              Playable Tactics
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

        <div className="rounded-[1.7rem] border border-white/10 bg-slate-950/78 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.22)] sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Active position</p>
                <p className="mt-3 text-xl font-semibold text-white">{activePuzzle.prompt}</p>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-400 animate-pulse">
                Your Turn
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-300">
              Drag and drop the pieces on the board to solve the puzzle. Find the best move for the current position!
            </p>
          </div>

          <div className="mt-6 rounded-lg overflow-hidden border-2 border-[#2a2f3a] shadow-2xl mx-auto w-full max-w-[400px] aspect-square">
            <Chessboard
              options={{
                position: game.fen(),
                onPieceDrop,
                darkSquareStyle,
                lightSquareStyle,
                dropSquareStyle,
                animationDurationInMs: 200,
                boardOrientation: activePuzzle.fen.includes(" w ") ? "white" : "black",
              }}
            />
          </div>

          {error && <p className="mt-4 text-center font-medium text-rose-400">{error}</p>}

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                setGame(new Chess(activePuzzle.fen));
                setMoveIndex(0);
                setGuess("");
                setMessage(null);
                setRating(null);
                setCorrect(null);
                setError(null);
                setShareStatus(null);
              }}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 w-full sm:w-auto"
            >
              Reset Puzzle
            </button>
          </div>

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

        </div>
      </div>
    </div>
  );
}
