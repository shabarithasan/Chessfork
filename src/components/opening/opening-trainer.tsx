"use client";

import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import ChessBoard from "@/components/ChessBoard";
import { Play, RotateCcw, CheckCircle, XCircle } from "lucide-react";

export function OpeningTrainer({
  openingName,
  mainLine,
  trainColor
}: {
  openingName: string;
  mainLine: string[];
  trainColor: "white" | "black";
}) {
  const [game, setGame] = useState(new Chess());
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "playing" | "success" | "wrong">("idle");
  const [wrongMove, setWrongMove] = useState<string | null>(null);
  const [isOpponentTurn, setIsOpponentTurn] = useState(false);

  const reset = () => {
    setGame(new Chess());
    setStep(0);
    setStatus("playing");
    setWrongMove(null);
    setIsOpponentTurn(trainColor === "black"); // If training black, opponent starts
  };

  useEffect(() => {
    if (status !== "playing") return;

    if (isOpponentTurn) {
      if (step >= mainLine.length) {
        setStatus("success");
        return;
      }
      
      const timer = setTimeout(() => {
        const nextMove = mainLine[step];
        const newGame = new Chess(game.fen());
        try {
          newGame.move(nextMove);
          setGame(newGame);
          setStep(s => s + 1);
          setIsOpponentTurn(false);
        } catch (e) {
          console.error("Invalid move in mainline:", nextMove);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [status, isOpponentTurn, step, mainLine, game]);

  const onMove = (from: string, to: string) => {
    if (status !== "playing" || isOpponentTurn) return false;

    const newGame = new Chess(game.fen());
    try {
      const move = newGame.move({ from, to, promotion: "q" });
      if (!move) return false;
      
      const expectedSan = mainLine[step];
      if (move.san === expectedSan) {
        setGame(newGame);
        setStep(s => s + 1);
        setWrongMove(null);
        if (step + 1 >= mainLine.length) {
          setStatus("success");
        } else {
          setIsOpponentTurn(true);
        }
        return true;
      } else {
        setWrongMove(move.san);
        setStatus("wrong");
        return false; // Don't update board state
      }
    } catch {
      return false;
    }
  };

  const handleRetry = () => {
    setStatus("playing");
    setWrongMove(null);
  };

  if (status === "idle") {
    return (
      <div className="rounded-xl border border-white/10 bg-black/40 p-6 flex flex-col items-center justify-center text-center space-y-4">
        <h3 className="text-xl font-bold text-white">Learn the {openingName}</h3>
        <p className="text-sm text-slate-300 max-w-sm">
          Practice the main line of this opening interactively. You will play as {trainColor === "white" ? "White" : "Black"}.
        </p>
        <button onClick={reset} className="flex items-center gap-2 bg-[#00d4aa] text-black px-6 py-2.5 rounded-full font-semibold hover:brightness-110 transition">
          <Play size={18} /> Start Training
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{openingName} Trainer</h3>
          <p className="text-sm text-slate-400">
            Move {Math.floor(step / 2) + 1} &middot; {status === "success" ? "Completed!" : `Playing as ${trainColor}`}
          </p>
        </div>
        <button onClick={reset} className="text-slate-400 hover:text-white transition p-2 bg-white/5 rounded-full">
          <RotateCcw size={18} />
        </button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="w-full max-w-[440px] shrink-0">
          <ChessBoard 
            fen={game.fen()} 
            onMove={onMove} 
            orientation={trainColor}
          />
        </div>
        
        <div className="flex-1 flex flex-col justify-center items-center md:items-start text-center md:text-left space-y-4">
          {status === "playing" && !isOpponentTurn && (
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 px-4 py-3 rounded-lg flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Your turn! Play the next book move.</span>
            </div>
          )}
          
          {status === "playing" && isOpponentTurn && (
            <div className="text-slate-400 flex items-center gap-2">
              <span className="opacity-50">Opponent is thinking...</span>
            </div>
          )}

          {status === "wrong" && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-lg flex flex-col gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <XCircle size={18} /> Incorrect Move
              </div>
              <p className="text-sm">
                You played <strong>{wrongMove}</strong>, which is not the main line.
              </p>
              <button onClick={handleRetry} className="mt-2 bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-md text-sm transition">
                Try again
              </button>
            </div>
          )}

          {status === "success" && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-4 rounded-lg flex flex-col items-center md:items-start gap-2">
              <div className="flex items-center gap-2 font-bold text-lg">
                <CheckCircle size={22} /> Opening Mastered!
              </div>
              <p className="text-sm opacity-90">
                You successfully completed the main line of the {openingName}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}