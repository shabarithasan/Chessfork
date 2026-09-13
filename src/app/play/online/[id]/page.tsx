"use client";
import { use } from "react";
import { useEffect, useState, useRef } from "react";
import { Chess } from "chess.js";
import ChessBoard from "@/components/ChessBoard";
import { Copy, Check, Users } from "lucide-react";

export default function OnlineGamePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [game, setGame] = useState(new Chess());
  const [status, setStatus] = useState("connecting");
  const [shortCode, setShortCode] = useState("");
  const [playerColor, setPlayerColor] = useState<"white" | "black" | "spectator">("spectator");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  
  const lastMoveFenRef = useRef<string>(game.fen());

  useEffect(() => {
    let isMounted = true;
    
    const fetchState = async () => {
      try {
        const res = await fetch(`/api/play/online/${params.id}/state`);
        if (!res.ok) throw new Error("Failed to fetch match state");
        const data = await res.json();
        
        if (!isMounted) return;

        setStatus(data.status);
        if (data.shortCode) setShortCode(data.shortCode);
        
        if (data.fen !== lastMoveFenRef.current) {
          setGame(new Chess(data.fen));
          lastMoveFenRef.current = data.fen;
        }

        const storedColor = localStorage.getItem(`match_${params.id}_color`);
        if (storedColor) {
          setPlayerColor(storedColor as "white" | "black");
          if (data.status === "waiting" && storedColor === "black") {
            setStatus("playing");
          }
        } else {
          if (data.status === "waiting") {
             localStorage.setItem(`match_${params.id}_color`, "white");
             setPlayerColor("white");
          } else if (data.status === "playing" || data.fen !== "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") {
             localStorage.setItem(`match_${params.id}_color`, "black");
             setPlayerColor("black");
             setStatus("playing");
          }
        }
      } catch (err) {
        if (isMounted) setError("Lost connection to match.");
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [params.id]);

  const onMove = (from: string, to: string) => {
    if (status !== "playing") return false;
    
    const turn = game.turn() === "w" ? "white" : "black";
    if (turn !== playerColor) return false;

    try {
      const move = game.move({ from, to, promotion: "q" });
      if (move) {
        const newFen = game.fen();
        setGame(new Chess(newFen));
        lastMoveFenRef.current = newFen;

        fetch(`/api/play/online/${params.id}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fen: newFen,
            move: move.san,
            playerColor,
          }),
        }).catch(err => {
          console.error("Failed to broadcast move", err);
        });

        if (game.isGameOver()) {
          setStatus("finished");
        }

        return true;
      }
    } catch {
      return false;
    }
    return false;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:flex-row sm:p-6 lg:p-8 mt-14">
      {/* LEFT: BOARD */}
      <div className="flex-1 w-full max-w-[700px] mx-auto sm:mx-0 shrink-0">
         <div className="mb-3 flex items-center justify-between">
           <div className="flex items-center gap-3 text-slate-400">
             Opponent ({playerColor === "white" ? "Black" : "White"})
           </div>
         </div>
         
         <div className="overflow-hidden rounded-md border-4 border-[#2A2926] bg-[#2A2926] shadow-2xl">
           <ChessBoard 
             fen={game.fen()} 
             orientation={playerColor === "black" ? "black" : "white"} 
             onMove={onMove} 
           />
         </div>

         <div className="mt-3 flex items-center justify-between">
           <div className="flex items-center gap-3 text-white font-bold">
             You ({playerColor})
           </div>
         </div>
      </div>

      {/* RIGHT: SIDEBAR */}
      <div className="flex w-full flex-col gap-4 sm:w-[400px] shrink-0">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1A1918] shadow-xl flex flex-col h-full">
           <div className="border-b border-white/5 bg-[#21201D] p-4 text-center">
             <h2 className="font-bold text-lg text-white">Live Match</h2>
           </div>

           <div className="p-6 flex flex-col flex-1 items-center justify-center text-center space-y-6">
             {error ? (
               <p className="text-red-400">{error}</p>
             ) : status === "connecting" ? (
               <p className="text-slate-400 animate-pulse">Connecting to server...</p>
             ) : status === "waiting" ? (
               <div className="space-y-4">
                 <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-500">
                   <Users size={24} />
                 </div>
                 <p className="font-bold text-white">Waiting for opponent</p>
                 <p className="text-sm text-slate-400">Share this code with a friend to start playing:</p>
                 
                 <div className="flex flex-col gap-3">
                   <div className="bg-black/50 border border-amber-500/30 rounded-xl p-4 text-center">
                     <span className="text-3xl font-mono font-bold tracking-[0.2em] text-amber-500">
                       {shortCode || "..."}
                     </span>
                   </div>
                   
                   <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-2">or send link</p>
                   
                   <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/10">
                     <input 
                       readOnly 
                       value={typeof window !== "undefined" ? window.location.href : ""} 
                       className="bg-transparent flex-1 text-xs text-slate-300 outline-none w-full"
                     />
                     <button 
                       onClick={copyLink}
                       className="p-2 rounded bg-white/10 hover:bg-white/20 transition text-white shrink-0"
                     >
                       {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                     </button>
                   </div>
                 </div>
               </div>
             ) : status === "playing" ? (
               <div className="space-y-2">
                 <p className="text-2xl font-bold text-white">Game On!</p>
                 <p className="text-slate-400">
                   {game.turn() === (playerColor === "white" ? "w" : "b") ? "It's your turn." : "Waiting for opponent..."}
                 </p>
               </div>
             ) : (
               <div className="space-y-2">
                 <p className="text-2xl font-bold text-white">Game Over</p>
                 <p className="text-slate-400">
                   {game.isCheckmate() ? "Checkmate!" : "Draw"}
                 </p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
