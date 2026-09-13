"use client";

import { Clipboard, Share2, Sparkles, Target, XCircle } from "lucide-react";
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

  function onPieceDrop(args: { sourceSquare: string, targetSquare: string | null, piece: { pieceType: string } }) {
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
    <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9)_32%,rgba(2,6,23,0.96))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.24)] sm:p-8">
      {/* 
        NEW LAYOUT: 
        Board on the left (takes most space), sidebar on the right.
      */}
      <div className="grid gap-8 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_380px]">
        
        {/* LEFT COLUMN: THE BOARD */}
        <div className="flex flex-col items-center justify-center bg-[#1a1b1e] rounded-[1.7rem] border border-white/5 p-4 sm:p-6 shadow-inner">
          <div className="w-full max-w-[800px] mx-auto aspect-square rounded-lg overflow-hidden border-2 border-slate-800 shadow-2xl">
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
        </div>

        {/* RIGHT COLUMN: SIDEBAR */}
        <div className="flex flex-col rounded-[1.7rem] border border-white/10 bg-[#26282d] p-5 shadow-[0_20px_60px_rgba(2,6,23,0.22)] sm:p-6 h-full">
          
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="rounded-xl bg-blue-500/20 p-2 border border-blue-500/30">
              <Target className="size-5 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">Puzzle</h3>
          </div>

          {/* COACH BUBBLE */}
          <div className="relative mt-6 rounded-xl border border-white/10 bg-slate-900/50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 pt-1">
                <div className="size-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/50">
                  <Sparkles className="size-5 text-amber-400" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <span className={`size-3 rounded-sm border border-slate-500 inline-block ${activePuzzle.fen.includes(" w ") ? "bg-white" : "bg-black"}`}></span>
                  {activePuzzle.fen.includes(" w ") ? "White to move" : "Black to move"}
                </p>
                <p className="text-sm leading-relaxed text-slate-300">
                  {activePuzzle.prompt}
                </p>
              </div>
            </div>
          </div>

          {/* RATING & PROGRESS */}
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-white">{activePuzzle.rating}</span>
            <span className="text-sm font-semibold text-emerald-400">+{attemptCount} tries</span>
          </div>
          <div className="mt-2 h-3 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${Math.min((moveIndex / Math.max(1, activePuzzle.solution.length)) * 100, 100)}%` }}
            ></div>
          </div>

          {/* FEEDBACK & MESSAGE */}
          {error && <p className="mt-6 text-sm font-medium text-rose-400 bg-rose-400/10 p-3 rounded-lg border border-rose-400/20">{error}</p>}
          
          {message && (
            <div className={`mt-6 p-4 rounded-xl border ${correct ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
              <p className={`text-sm font-bold ${correct ? 'text-emerald-400' : 'text-amber-400'}`}>
                {correct ? "Puzzle Solved!" : "Problem captured"}
              </p>
              <p className="text-sm mt-1 text-slate-300">{message}</p>
            </div>
          )}

          {/* ACTIONS */}
          <div className="mt-auto pt-6 flex flex-col gap-3">
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
              className="w-full rounded-xl bg-white/5 border border-white/10 px-5 py-3.5 text-sm font-bold text-slate-100 transition hover:bg-white/10 flex items-center justify-center gap-2"
            >
              <XCircle className="size-4" />
              Reset Board
            </button>
            
            {availablePuzzles.length > 1 && (
               <button
                  type="button"
                  onClick={() => selectPuzzle(availablePuzzles.find(p => p.id !== activePuzzle.id)?.id ?? availablePuzzles[0].id)}
                  className="w-full rounded-xl bg-amber-500/20 border border-amber-500/30 px-5 py-3.5 text-sm font-bold text-amber-100 transition hover:bg-amber-500/30 flex items-center justify-center gap-2"
                >
                  Next Puzzle
                </button>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM METADATA: THE PERFECT LOOP (Hidden initially or moved to bottom for context) */}
      <div className="mt-12 pt-8 border-t border-white/5">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">{eyebrow}</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{title}</h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{description}</p>
        
        <div className="mt-8 grid gap-4 sm:grid-cols-3 max-w-4xl">
          {perfectLoop.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-white/5 bg-slate-900/40 p-5">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-amber-200" />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                </div>
                <p className="mt-4 break-words text-lg font-bold text-white">{item.value}</p>
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              </div>
            );
          })}
        </div>
        
        {message && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={sharePerfectRecap}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/12"
            >
              <Share2 className="size-4" />
              Share recap
            </button>
            <button
              type="button"
              onClick={copyPerfectRecap}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/35 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <Clipboard className="size-4" />
              Copy card
            </button>
            {shareStatus ? <p className="text-sm text-amber-200">{shareStatus}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
