"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import { useEngine } from "@/hooks/useEngine";
import ChessBoard from "@/components/ChessBoard";
import { RefreshCcw, ArrowRight, X, Play, BrainCog, Swords } from "lucide-react";
import Image from "next/image";

type Difficulty = "casual" | "balanced" | "challenging";
type ChatMessage = { id: string; role: "coach" | "system"; text: string };

function evalToNumber(ev: { type: "cp" | "mate"; value: number } | null) {
  if (!ev) return 0;
  if (ev.type === "mate") {
    return ev.value > 0 ? 1000 - ev.value : -1000 - ev.value;
  }
  return ev.value;
}

export function CoachGamePage() {
  const [game, setGame] = useState(new Chess());
  const [userColor, setUserColor] = useState<"white" | "black">("white");
  const [difficulty, setDifficulty] = useState<Difficulty>("challenging");
  const [gameState, setGameState] = useState<"setup" | "playing" | "blunder_review" | "game_over">("setup");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  
  const { analysis, startAnalysis, stopAnalysis } = useEngine();
  const lastEvalRef = useRef<number>(0);
  const [blunderData, setBlunderData] = useState<{ fen: string; userMove: string; comment: string; bestReply?: string } | null>(null);
  
  const addChat = (text: string, role: "coach" | "system" = "coach") => {
    setChatLog(prev => [...prev, { id: Math.random().toString(36).slice(2), role, text }]);
  };

  const startGame = () => {
    setGame(new Chess());
    setGameState("playing");
    setChatLog([]);
    lastEvalRef.current = 0;
    addChat(`Welcome back. Let's play a ${difficulty} game when you're ready.`);
  };

  // AI Turn Logic
  useEffect(() => {
    if (gameState !== "playing") return;

    const turn = game.turn() === "w" ? "white" : "black";
    if (turn !== userColor && !game.isGameOver()) {
      // It's AI's turn
      const targetDepth = difficulty === "casual" ? 5 : difficulty === "balanced" ? 10 : 15;
      
      if (analysis.fen !== game.fen() || analysis.status === "idle") {
         if (analysis.fen !== game.fen()) {
             startAnalysis(game.fen(), { depth: targetDepth, multiPV: 1 });
         } else if (analysis.status === "idle" && analysis.bestMove) {
             // Engine finished searching
             const currentEval = evalToNumber(analysis.evaluation);
             
             // Check if user blundered
             // The evaluation is from the AI's perspective.
             // If AI's eval jumps by > 1.5 pawns since its last eval, user blundered!
             if (lastEvalRef.current !== 0 && currentEval - lastEvalRef.current > 1.5) {
                 // Blunder detected!
                 stopAnalysis();
                 setGameState("blunder_review");
                 const comment = "Looks like you made a mistake. Do you want to take back that move and try something else?";
                 addChat(comment);
                 setBlunderData({
                    fen: game.fen(),
                    userMove: "Mistake", // We could extract the last move
                    comment,
                    bestReply: analysis.bestMove
                 });
                 // Store the new eval so if they continue, we don't re-trigger
                 lastEvalRef.current = currentEval;
                 return;
             }

             // Normal move
             lastEvalRef.current = currentEval;
             const m = game.move(analysis.bestMove);
             if (m) {
                 // eslint-disable-next-line react-hooks/set-state-in-effect
                 setGame(new Chess(game.fen()));
             }
         }
      }
    }
  }, [game, gameState, userColor, analysis, difficulty, startAnalysis, stopAnalysis]);

  const onMove = (from: string, to: string) => {
    if (gameState !== "playing") return false;
    const turn = game.turn() === "w" ? "white" : "black";
    if (turn !== userColor) return false;

    try {
      const move = game.move({ from, to, promotion: "q" });
      if (move) {
        setGame(new Chess(game.fen()));
        if (game.isGameOver()) {
          setGameState("game_over");
          addChat("Good game! That's a wrap.");
        }
        return true;
      }
    } catch {
      return false;
    }
    return false;
  };

  const handleRetry = () => {
    game.undo();
    setGame(new Chess(game.fen()));
    setGameState("playing");
    setBlunderData(null);
    addChat("Good choice. Try to find a better move.", "system");
  };

  const handleContinue = () => {
    setGameState("playing");
    setBlunderData(null);
    addChat("All right. Let's continue.");
    // AI makes its move
    if (blunderData?.bestReply) {
       game.move(blunderData.bestReply);
       setGame(new Chess(game.fen()));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:flex-row sm:p-6 lg:p-8 mt-14">
      {/* LEFT: BOARD */}
      <div className="flex-1 w-full max-w-[700px] mx-auto sm:mx-0 shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="size-10 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center border border-white/20">
               <span className="text-xl">🇳🇴</span>
             </div>
             <div>
                <p className="text-sm font-bold text-white">Coach Magnus <span className="text-slate-400 font-normal">(1062)</span></p>
             </div>
          </div>
        </div>

        <ChessBoard 
           fen={game.fen()} 
           onMove={onMove} 
           orientation={userColor} 
           bestMove={gameState === "blunder_review" ? blunderData?.bestReply : null}
        />

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="size-10 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center border border-white/20">
               <UserAvatar />
             </div>
             <div>
                <p className="text-sm font-bold text-white">You</p>
             </div>
          </div>
        </div>
      </div>

      {/* RIGHT: SIDEBAR */}
      <div className="flex w-full flex-col gap-4 sm:w-[400px] shrink-0">
        <div className="flex flex-col rounded-xl border border-white/10 bg-[#161512] overflow-hidden flex-1 max-h-[800px]">
           {/* HEADER */}
           <div className="bg-[#21201D] border-b border-white/5 p-4 text-center">
             <h2 className="text-lg font-bold text-white">Play Coach</h2>
           </div>

           {/* CHAT AREA */}
           <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {chatLog.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                   {msg.role === "coach" && (
                     <div className="size-8 rounded-full overflow-hidden bg-amber-500/20 shrink-0 border border-amber-500/30 flex items-center justify-center">
                        <span className="text-sm">🇳🇴</span>
                     </div>
                   )}
                   <div className={`p-3 rounded-2xl text-sm ${msg.role === "coach" ? "bg-white text-black rounded-tl-sm shadow-md" : "bg-white/10 text-white rounded-tr-sm mx-auto italic"}`}>
                      {msg.text}
                   </div>
                </div>
              ))}
              
              {gameState === "blunder_review" && (
                 <div className="mt-4 flex gap-2">
                    <button onClick={handleContinue} className="flex-1 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-md">
                       <ArrowRight className="size-4" /> Continue
                    </button>
                    <button onClick={handleRetry} className="flex-1 py-2.5 rounded-lg bg-[#81B64C] hover:bg-[#81B64C]/90 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-md">
                       <RefreshCcw className="size-4" /> Retry
                    </button>
                 </div>
              )}
           </div>

           {/* SETUP / PLAY CONTROLS */}
           {gameState === "setup" ? (
             <div className="p-4 bg-[#21201D] border-t border-white/5">
                <div className="mb-4 space-y-2">
                   {(["casual", "balanced", "challenging"] as Difficulty[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${difficulty === level ? "border-[#81B64C] bg-[#81B64C]/10" : "border-white/5 bg-black/20 hover:border-white/10"}`}
                      >
                         <p className="font-bold text-white capitalize">{level}</p>
                         <p className="text-xs text-slate-400 mt-1">
                            {level === "casual" ? "An easier game so you can focus on learning." : level === "balanced" ? "An even match to play while you learn." : "A hard game that pushes you to compete and learn."}
                         </p>
                      </button>
                   ))}
                </div>
                <button onClick={startGame} className="w-full py-4 rounded-xl bg-[#81B64C] hover:bg-[#81B64C]/90 text-white font-bold text-lg shadow-lg transition">
                  Play
                </button>
             </div>
           ) : (
             <div className="flex-1 bg-[#21201D] border-t border-white/5 flex flex-col min-h-[200px]">
                <div className="p-3 border-b border-white/5 text-xs font-semibold text-slate-400 flex justify-between items-center bg-[#1B1A17]">
                   <span>Game Moves</span>
                   <div className="flex gap-2 text-slate-500">
                     <BrainCog className="size-4" />
                     <Swords className="size-4" />
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                   <div className="grid grid-cols-[30px_1fr_1fr] gap-x-2 gap-y-1 text-sm">
                     {Array.from({ length: Math.ceil(game.history().length / 2) }).map((_, i) => {
                        const w = game.history()[i * 2];
                        const b = game.history()[i * 2 + 1];
                        return (
                          <div key={i} className="contents group hover:bg-white/5 rounded">
                            <div className="text-slate-500 text-right pr-2 py-1 select-none">{i + 1}.</div>
                            <div className="text-slate-200 py-1 px-2 font-medium">{w}</div>
                            <div className="text-slate-200 py-1 px-2 font-medium">{b || ""}</div>
                          </div>
                        );
                     })}
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function UserAvatar() {
  return (
    <svg className="size-6 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
    </svg>
  );
}
