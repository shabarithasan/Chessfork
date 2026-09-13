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
  const [persona, setPersona] = useState<"coach" | "hikaru" | "magnus">("magnus");
  const [gameState, setGameState] = useState<"setup" | "playing" | "blunder_review" | "game_over">("setup");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const chatLogRef = useRef<ChatMessage[]>([]);
  
  const [isTyping, setIsTyping] = useState(false);
  
  const { analysis, startAnalysis, stopAnalysis } = useEngine();
  const lastEvalRef = useRef<number>(0);
  const [blunderData, setBlunderData] = useState<{ fen: string; userMove: string; comment: string; bestReply?: string } | null>(null);
  
  const addChat = (text: string, role: "coach" | "system" = "coach") => {
    const newMsg: ChatMessage = { id: Math.random().toString(36).slice(2), role, text };
    setChatLog(prev => {
      const next = [...prev, newMsg];
      chatLogRef.current = next;
      return next;
    });
  };

  const generateCoachResponse = async (contextMsg: string) => {
    setIsTyping(true);
    try {
      const response = await fetch("/api/ai-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...chatLogRef.current.filter(m => m.role === "coach").map(m => ({ role: "assistant", content: m.text })),
            { role: "user", content: contextMsg }
          ],
          pageContext: { type: "coach_chat", data: { persona } }
        }),
      });
      
      if (!response.ok) throw new Error("Failed to fetch");
      
      const reader = response.body?.getReader();
      if (!reader) return;
      
      const decoder = new TextDecoder();
      let fullText = "";
      
      const msgId = Math.random().toString(36).slice(2);
      setChatLog(prev => {
         const next = [...prev, { id: msgId, role: "coach", text: "" } as ChatMessage];
         chatLogRef.current = next;
         return next;
      });
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        const lines = chunk.split('\n');
        for (const line of lines) {
           if (line.startsWith('data: ')) {
               const data = line.slice(6);
               if (data === '[DONE]') continue;
               try {
                  const parsed = JSON.parse(data);
                  const text = parsed.choices[0]?.delta?.content || "";
                  fullText += text;
                  setChatLog(prev => {
                     const next = prev.map(m => m.id === msgId ? { ...m, text: fullText } : m);
                     chatLogRef.current = next;
                     return next;
                  });
               } catch (e) {}
           }
        }
      }
    } catch (err) {
      console.error(err);
      addChat("I seem to have lost my connection. Anyway, let's keep playing.", "coach");
    } finally {
      setIsTyping(false);
    }
  };

  const startGame = () => {
    setGame(new Chess());
    setGameState("playing");
    setChatLog([]);
    chatLogRef.current = [];
    lastEvalRef.current = 0;
    generateCoachResponse(`The game has started. We are playing a ${difficulty} game. I am playing White. Give me a 1-sentence opening greeting.`);
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
             const currentEval = evalToNumber(analysis.evaluation);
             
             if (lastEvalRef.current !== 0 && currentEval - lastEvalRef.current > 1.5) {
                 stopAnalysis();
                 setGameState("blunder_review");
                 const hist = game.history();
                 const lastMove = hist[hist.length - 1];
                 generateCoachResponse(`I just played ${lastMove}. According to the engine, this was a blunder (evaluation dropped by ${((currentEval - lastEvalRef.current) * 100).toFixed(0)} centipawns). Your best reply is ${analysis.bestMove}. Give me a 1-2 sentence roast or comment pointing out my mistake, and ask if I want to take it back.`);
                 
                 setBlunderData({
                    fen: game.fen(),
                    userMove: lastMove,
                    comment: "",
                    bestReply: analysis.bestMove
                 });
                 lastEvalRef.current = currentEval;
                 return;
             }

             lastEvalRef.current = currentEval;
             const m = game.move(analysis.bestMove);
             if (m) {
                 // eslint-disable-next-line react-hooks/set-state-in-effect
                 setGame(new Chess(game.fen()));
             }
         }
      }
    }
  }, [game, gameState, userColor, analysis, difficulty, startAnalysis, stopAnalysis, persona]);

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
    generateCoachResponse("I decided to take back my move and try something else. Acknowledge this quickly and tell me to play a better move.");
  };

  const handleContinue = () => {
    setGameState("playing");
    setBlunderData(null);
    generateCoachResponse("I decided to continue playing anyway. Tell me 'Alright then, let's see how this plays out' or similar.");
    
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
               <span className="text-xl">{persona === "hikaru" ? "🇺🇸" : persona === "magnus" ? "🇳🇴" : "🤖"}</span>
             </div>
             <div>
                <p className="text-sm font-bold text-white">
                   {persona === "coach" ? "Elite Coach" : persona === "hikaru" ? "Hikaru Nakamura" : "Magnus Carlsen"} 
                   <span className="text-slate-400 font-normal ml-1">
                      ({difficulty === "casual" ? 1200 : difficulty === "balanced" ? 1800 : 2882})
                   </span>
                </p>
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
                        <span className="text-sm">{persona === "hikaru" ? "🇺🇸" : persona === "magnus" ? "🇳🇴" : "🤖"}</span>
                     </div>
                   )}
                   <div className={`p-3 rounded-2xl text-sm ${msg.role === "coach" ? "bg-white text-black rounded-tl-sm shadow-md" : "bg-white/10 text-white rounded-tr-sm mx-auto italic"}`}>
                      {msg.text}
                   </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3">
                   <div className="size-8 rounded-full overflow-hidden bg-amber-500/20 shrink-0 border border-amber-500/30 flex items-center justify-center">
                      <span className="text-sm">{persona === "hikaru" ? "🇺🇸" : persona === "magnus" ? "🇳🇴" : "🤖"}</span>
                   </div>
                   <div className="p-3 rounded-2xl text-sm bg-white text-black rounded-tl-sm shadow-md flex items-center gap-1">
                      <span className="size-1.5 bg-black/40 rounded-full animate-bounce" />
                      <span className="size-1.5 bg-black/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="size-1.5 bg-black/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                   </div>
                </div>
              )}

              {gameState === "blunder_review" && !isTyping && (
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
             <div className="p-4 bg-[#21201D] border-t border-white/5 space-y-6">
                <div className="space-y-3">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Coach</p>
                   <div className="grid grid-cols-3 gap-2">
                     {(["coach", "hikaru", "magnus"] as const).map((p) => (
                       <button
                         key={p}
                         onClick={() => setPersona(p)}
                         className={`p-2 rounded-lg text-sm font-bold transition-all border ${
                           persona === p 
                             ? "border-amber-500 bg-amber-500/20 text-white" 
                             : "border-white/5 bg-black/20 text-slate-400 hover:border-white/20"
                         }`}
                       >
                         {p === "coach" ? "Elite Coach" : p === "hikaru" ? "Hikaru" : "Magnus"}
                       </button>
                     ))}
                   </div>
                </div>

                <div className="space-y-3">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Difficulty</p>
                   <div className="space-y-2">
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
                </div>

                <button onClick={startGame} className="w-full py-4 rounded-xl bg-[#81B64C] hover:bg-[#81B64C]/90 text-white font-bold text-lg shadow-lg transition">
                  Play against {persona === "coach" ? "Elite Coach" : persona === "hikaru" ? "Hikaru" : "Magnus"}
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
