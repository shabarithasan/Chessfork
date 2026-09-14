"use client";
import { use, useEffect, useState, useRef } from "react";
import { Chess } from "chess.js";
import ChessBoard from "@/components/ChessBoard";
import { Copy, Check, Users, Send } from "lucide-react";

type ChatMessage = {
  sender: string;
  text: string;
  timestamp: string;
};

export default function OnlineGamePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [game, setGame] = useState(new Chess());
  const [status, setStatus] = useState("connecting");
  const [shortCode, setShortCode] = useState("");
  const [playerColor, setPlayerColor] = useState<"white" | "black" | "spectator">("spectator");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const lastPgnRef = useRef<string>(game.pgn());
  const lastMoveFenRef = useRef<string>(game.fen());

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

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
        if (data.chat) setChat(data.chat);
        
        if (data.pgn && data.pgn !== lastPgnRef.current) {
          const newGame = new Chess();
          newGame.loadPgn(data.pgn);
          setGame(newGame);
          lastPgnRef.current = data.pgn;
          lastMoveFenRef.current = newGame.fen();
        } else if (!data.pgn && data.fen !== lastMoveFenRef.current) {
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
          // If we reach here, we did not create the game (since host gets color injected on creation).
          // We must be the guest joining via direct URL.
          localStorage.setItem(`match_${params.id}_color`, "black");
          setPlayerColor("black");
          if (data.status === "waiting") {
             // Let the server know someone joined
             if (data.shortCode) {
                fetch(`/api/play/online/join?code=${data.shortCode}`).catch(() => {});
             }
             setStatus("playing");
          } else {
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
        const newPgn = game.pgn();
        
        // clone the game to force re-render with new history
        const newGame = new Chess();
        newGame.loadPgn(newPgn);
        setGame(newGame);
        
        lastPgnRef.current = newPgn;
        lastMoveFenRef.current = newFen;

        fetch(`/api/play/online/${params.id}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fen: newFen,
            pgn: newPgn,
            move: move.san,
            playerColor,
          }),
        }).catch(err => {
          console.error("Failed to broadcast move", err);
        });

        if (newGame.isGameOver()) {
          setStatus("finished");
        }

        return true;
      }
    } catch {
      return false;
    }
    return false;
  };

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput.trim();
    setChatInput("");
    
    // Optimistic UI
    setChat(prev => [...prev, { sender: playerColor, text, timestamp: new Date().toISOString() }]);

    try {
      await fetch(`/api/play/online/${params.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, playerColor }),
      });
    } catch (err) {
      console.error("Failed to send chat", err);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:flex-row sm:p-6 lg:p-8 mt-14 h-[calc(100vh-4rem)]">
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

      {/* RIGHT: SIDEBAR (HISTORY & CHAT) */}
      <div className="flex w-full flex-col gap-4 sm:w-[400px] shrink-0 h-[min(700px,calc(100vh-8rem))]">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1A1918] shadow-xl flex flex-col h-full">
           
           {/* Top Header */}
           <div className="border-b border-white/5 bg-[#21201D] p-4 text-center shrink-0">
             <h2 className="font-bold text-lg text-white">
               {status === "finished" ? "Game Over" : "Live Match"}
             </h2>
             {status === "finished" && (
                <p className="text-sm text-slate-400">
                  {game.isCheckmate() ? "Checkmate!" : "Draw"}
                </p>
             )}
           </div>

           {/* Waiting Screen Overlay OR Move History */}
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/20">
             {status === "waiting" ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
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
                </div>
             ) : (
                <div className="space-y-1">
                  {/* Render Move History */}
                  {game.history().reduce((acc: any[], move: string, i: number) => {
                    if (i % 2 === 0) {
                      acc.push({ moveNumber: i / 2 + 1, white: move, black: "" });
                    } else {
                      acc[acc.length - 1].black = move;
                    }
                    return acc;
                  }, []).map((row) => (
                    <div key={row.moveNumber} className="flex text-sm py-1 px-2 even:bg-white/5 rounded">
                      <span className="w-10 text-slate-500 font-mono">{row.moveNumber}.</span>
                      <span className="flex-1 text-slate-200 font-mono">{row.white}</span>
                      <span className="flex-1 text-slate-200 font-mono">{row.black}</span>
                    </div>
                  ))}
                  {game.history().length === 0 && (
                    <div className="text-center text-slate-500 text-sm py-8 italic">No moves yet.</div>
                  )}
                </div>
             )}
           </div>

           {/* Chat Section */}
           <div className="h-1/3 flex flex-col border-t border-white/10 bg-[#1A1918] shrink-0">
             <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
               {chat.map((msg, i) => {
                 const isMe = msg.sender === playerColor;
                 return (
                   <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[80%] rounded-xl px-3 py-1.5 text-sm ${isMe ? 'bg-amber-500/20 text-amber-100 rounded-br-none' : 'bg-white/10 text-slate-200 rounded-bl-none'}`}>
                       <div className="text-[10px] opacity-50 mb-0.5 font-bold uppercase">{msg.sender}</div>
                       <div>{msg.text}</div>
                     </div>
                   </div>
                 );
               })}
               <div ref={chatEndRef} />
             </div>
             
             <form onSubmit={sendChat} className="p-3 border-t border-white/5 bg-[#21201D] flex gap-2">
               <input
                 type="text"
                 value={chatInput}
                 onChange={e => setChatInput(e.target.value)}
                 placeholder="Type a message..."
                 className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                 disabled={status === "connecting"}
               />
               <button 
                 type="submit"
                 disabled={!chatInput.trim()}
                 className="bg-amber-500 text-black p-2 rounded-lg disabled:opacity-50 hover:bg-amber-400 transition"
               >
                 <Send size={16} />
               </button>
             </form>
           </div>

        </div>
      </div>
    </div>
  );
}
