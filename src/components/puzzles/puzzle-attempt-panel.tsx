"use client";

import { Clipboard, Share2, Sparkles, Target, XCircle, Heart, RefreshCcw, CheckCircle, MessageSquare, Lightbulb, User } from "lucide-react";
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

  // New state for immersive chess.com style feedback
  const [lives, setLives] = useState(5);
  const [lastMoveState, setLastMoveState] = useState<"correct" | "incorrect" | "solved" | null>(null);
  const [lastMoveSan, setLastMoveSan] = useState<string | null>(null);
  const [wrongFen, setWrongFen] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLives(5);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastMoveState(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastMoveSan(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWrongFen(null);
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
    ].join("\\n");
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
    if (correct !== null || pending || lastMoveState === "incorrect" || lastMoveState === "solved") return false;

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
      setLastMoveSan(move.san);
      setGame(gameCopy);
      setError(null);
      
      if (moveIndex === 0) {
        setGuess(move.san);
      }

      const nextIndex = moveIndex + 1;
      
      if (nextIndex >= activePuzzle.solution.length) {
        // Puzzle fully solved!
        setLastMoveState("solved");
        setMoveIndex(nextIndex);
        setCorrect(true);
        void submitAttempt(moveIndex === 0 ? move.san : guess); 
      } else {
        // Computer replies
        setLastMoveState("correct");
        setMoveIndex(nextIndex + 1);
        setTimeout(() => {
          const compGame = new Chess(gameCopy.fen());
          compGame.move(activePuzzle.solution[nextIndex]);
          setGame(compGame);
          setLastMoveState(null);
        }, 800);
      }
      return true;
    } else {
      // Incorrect move
      setLastMoveSan(move.san);
      setLastMoveState("incorrect");
      setWrongFen(gameCopy.fen()); // Keep the board showing the wrong move until they hit retry
      setLives((l) => Math.max(0, l - 1));

      if (moveIndex === 0) {
        setGuess(move.san);
        setCorrect(false);
        void submitAttempt(move.san);
      }
      return true; // Let the piece stay on the board to show them their mistake
    }
  }

  function handleRetry() {
    setLastMoveState(null);
    setLastMoveSan(null);
    setWrongFen(null);
    // Board will snap back to 'game' state since wrongFen is cleared.
  }

  function selectPuzzle(puzzleId: string) {
    setSelectedId(puzzleId);
  }

  const darkSquareStyle = { backgroundColor: "#739552" };
  const lightSquareStyle = { backgroundColor: "#ebecd0" };
  const dropSquareStyle = { boxShadow: "inset 0 0 1px 4px rgba(255,255,255,0.3)" };

  const isWhiteToMove = activePuzzle.fen.includes(" w ");
  const currentBoardFen = lastMoveState === "incorrect" && wrongFen ? wrongFen : game.fen();

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9)_32%,rgba(2,6,23,0.96))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.24)] sm:p-8">
      {/* NEW LAYOUT: Board on the left (takes most space), sidebar on the right. */}
      <div className="grid gap-8 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_380px]">
        
        {/* LEFT COLUMN: THE BOARD */}
        <div className="flex flex-col items-center justify-center bg-[#1a1b1e] rounded-[1.7rem] border border-white/5 p-4 sm:p-6 shadow-inner relative">
          <div className="w-full max-w-[800px] mx-auto aspect-square rounded-lg overflow-hidden border-2 border-[#2a2d33] shadow-2xl relative">
            <Chessboard
              options={{
                position: currentBoardFen,
                onPieceDrop,
                darkSquareStyle,
                lightSquareStyle,
                dropSquareStyle,
                animationDurationInMs: 200,
                boardOrientation: isWhiteToMove ? "white" : "black",
              }}
            />
            {/* Show an overlay red X on incorrect move square - we'd need square info for this ideally, but a general lock is fine */}
          </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR */}
        <div className="flex flex-col rounded-[1.7rem] border border-white/5 bg-[#262421] p-5 shadow-[0_20px_60px_rgba(2,6,23,0.22)] sm:p-6 h-full">
          
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-2 border border-emerald-500/20">
                <Target className="size-5 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white">Daily Puzzle</h3>
            </div>
            {/* Mock pagination/date */}
            <div className="flex items-center gap-2 text-sm text-slate-400 bg-black/20 rounded-lg px-3 py-1.5">
               <span>{"<"}</span>
               <span className="font-medium text-slate-300">Today</span>
               <span>{">"}</span>
            </div>
          </div>

          {/* COACH BUBBLE */}
          <div className="mt-6 flex items-start gap-4">
             {/* Avatar */}
             <div className="flex-shrink-0 pt-3">
               <div className="size-12 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center">
                  <User className="size-6 text-slate-400" />
               </div>
             </div>
             {/* Bubble */}
             <div className="relative bg-white text-slate-900 rounded-xl p-4 shadow-lg w-full flex-1">
                {/* Triangle pointing left */}
                <div className="absolute top-6 -left-2 w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-r-white border-b-[8px] border-b-transparent"></div>
                
                {/* States */}
                {lastMoveState === null && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                       <span className={`size-3.5 rounded-sm border border-slate-300 inline-block ${isWhiteToMove ? "bg-white" : "bg-black"}`}></span>
                       <span className="font-extrabold text-[15px]">
                         {isWhiteToMove ? "White to move" : "Black to move"}
                       </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-snug">
                      {activePuzzle.prompt}
                    </p>
                  </>
                )}

                {lastMoveState === "incorrect" && (
                  <>
                    <div className="flex items-center gap-2 mb-2 text-[#e54133]">
                       <XCircle className="size-5 fill-[#e54133] text-white" />
                       <span className="font-extrabold text-[15px]">{lastMoveSan} is incorrect</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-snug">
                      There&apos;s a better move on the board. You still have {lives} more attempt{lives !== 1 ? 's' : ''}.
                    </p>
                  </>
                )}

                {lastMoveState === "correct" && (
                  <>
                    <div className="flex items-center gap-2 mb-2 text-[#7fa650]">
                       <CheckCircle className="size-5 fill-[#7fa650] text-white" />
                       <span className="font-extrabold text-[15px]">{lastMoveSan} is correct</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-snug">
                      That was the best move on the board.
                    </p>
                  </>
                )}

                {lastMoveState === "solved" && (
                  <>
                    <div className="flex items-center gap-2 mb-2 text-[#7fa650]">
                       <CheckCircle className="size-5 fill-[#7fa650] text-white" />
                       <span className="font-extrabold text-[15px]">Solved</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-snug">
                      Nice! Check out the recap below to learn more about this puzzle.
                    </p>
                  </>
                )}
             </div>
          </div>

          {/* HEARTS */}
          <div className="mt-4 flex items-center gap-1.5 ml-[4.5rem]">
             {Array.from({ length: 5 }).map((_, i) => (
                <Heart 
                  key={i} 
                  className={`size-6 transition-colors duration-300 ${i < lives ? 'fill-[#7fa650] text-[#7fa650]' : 'fill-[#312e2b] text-[#312e2b]'}`} 
                />
             ))}
          </div>

          {/* RATING & PROGRESS */}
          {lastMoveState === null && attemptCount === 0 && (
             <div className="mt-8 flex items-baseline gap-3 ml-[4.5rem]">
               <span className="text-5xl font-extrabold text-white">{activePuzzle.rating}</span>
             </div>
          )}

          {/* ACTIONS AT BOTTOM */}
          <div className="mt-auto pt-6 flex flex-col gap-3">
            <p className="text-center text-xs font-semibold text-slate-500 mb-2">
              Solved by 200,288
            </p>

            {lastMoveState === "incorrect" && (
              <button
                type="button"
                onClick={handleRetry}
                className="w-full rounded-xl bg-[#fa412d] hover:bg-[#ff5544] px-5 py-4 text-[17px] font-extrabold text-white transition flex items-center justify-center gap-2 shadow-[0_4px_0_rgba(186,39,24,1)] active:translate-y-1 active:shadow-none"
              >
                <RefreshCcw className="size-5" />
                Retry
              </button>
            )}

            {lastMoveState === "solved" && (
               <div className="flex gap-3">
                 <button
                   type="button"
                   onClick={copyPerfectRecap}
                   className="flex-1 rounded-xl bg-[#312e2b] hover:bg-[#3c3935] px-5 py-4 flex items-center justify-center transition shadow-[0_4px_0_rgba(30,28,26,1)] active:translate-y-1 active:shadow-none text-[#c3c2c1]"
                 >
                   <MessageSquare className="size-5" />
                 </button>
                 <button
                   type="button"
                   onClick={sharePerfectRecap}
                   className="flex-[2] rounded-xl bg-[#81b64c] hover:bg-[#95c95e] px-5 py-4 text-[17px] font-extrabold text-white transition flex items-center justify-center gap-2 shadow-[0_4px_0_rgba(97,143,51,1)] active:translate-y-1 active:shadow-none"
                 >
                   <Share2 className="size-5" />
                   Share
                 </button>
               </div>
            )}

            {lastMoveState !== "incorrect" && lastMoveState !== "solved" && (
              <button
                type="button"
                className="w-full rounded-xl bg-[#312e2b] hover:bg-[#3c3935] px-5 py-4 text-[17px] font-extrabold text-[#c3c2c1] transition flex items-center justify-center gap-2 shadow-[0_4px_0_rgba(30,28,26,1)] active:translate-y-1 active:shadow-none"
              >
                <Lightbulb className="size-5" />
                Hint
              </button>
            )}
            
            {availablePuzzles.length > 1 && lastMoveState === "solved" && (
               <button
                  type="button"
                  onClick={() => selectPuzzle(availablePuzzles.find(p => p.id !== activePuzzle.id)?.id ?? availablePuzzles[0].id)}
                  className="w-full rounded-xl bg-amber-500/20 border border-amber-500/30 px-5 py-3.5 text-sm font-bold text-amber-100 transition hover:bg-amber-500/30 flex items-center justify-center gap-2 mt-2"
                >
                  Next Puzzle
                </button>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM METADATA: THE PERFECT LOOP */}
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
      </div>
    </div>
  );
}
