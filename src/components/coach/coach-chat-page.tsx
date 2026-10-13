"use client";

import { useAI, CONVERSATION_STARTERS } from "@/contexts/AIProvider";
import { AIMessage } from "@/components/ai/AIMessage";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { AILoadingState } from "@/components/ai/AILoadingState";
import { Sparkles, Trash2, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function CoachChatPage({ recentGames = [], playerName }: { recentGames?: unknown[], playerName?: string | null }) {
  const {
    messages,
    streaming,
    sendMessage,
    clearConversation,
    setPageContext,
    setCoachAvatar,
  } = useAI();

  const [persona, setPersona] = useState<"coach" | "hikaru" | "magnus" | "vishy" | "levy">("hikaru");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Inject persona and game history into AI context
  useEffect(() => {
    setPageContext({
      type: "coach_chat",
      label: "AI Coach Session",
      data: {
        persona,
        playerName,
        recentGames,
      }
    });
  }, [persona, recentGames, playerName, setPageContext]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto w-full px-4 sm:px-6 relative">
       
       {/* PERSONA SELECTOR */}
       <div className="flex justify-center pt-6 pb-2">
         <div className="bg-black/30 p-1.5 rounded-2xl border border-white/5 flex gap-2 backdrop-blur-md">
           {[
             { id: "hikaru", label: "Hikaru Nakamura", url: "https://assets-coaches.chess.com/image/coachhikaru.png?v=28d7093b" },
             { id: "magnus", label: "Magnus Carlsen", url: "https://assets-coaches.chess.com/image/coachmagnus.png?v=819d9dba" },
             { id: "vishy", label: "Vishy Anand", url: "https://assets-coaches.chess.com/image/coachvishy.png?v=ea3d532d" },
             { id: "levy", label: "GothamChess", url: "https://assets-coaches.chess.com/image/coachlevy.png?v=9f98615d" },
             { id: "coach", label: "Elite Coach", url: "/images/pawn-light.png" },
           ].map((p) => (
             <button
               key={p.id}
               onClick={() => { setPersona(p.id as any); setCoachAvatar(p.url); }}
               className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                 persona === p.id 
                   ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" 
                   : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
               }`}
             >
               {p.label}
             </button>
           ))}
         </div>
       </div>

       <div className="flex-1 overflow-y-auto py-8 hide-scrollbar">
          {messages.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto pb-20">
                <div className="size-24 rounded-3xl overflow-hidden bg-neutral-800/50 flex items-center justify-center border border-neutral-700/50 mb-8 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                  <img src={
                    persona === "magnus" ? "https://assets-coaches.chess.com/image/coachmagnus.png?v=819d9dba" :
                    persona === "vishy" ? "https://assets-coaches.chess.com/image/coachvishy.png?v=ea3d532d" :
                    persona === "hikaru" ? "https://assets-coaches.chess.com/image/coachhikaru.png?v=28d7093b" :
                    persona === "levy" ? "https://assets-coaches.chess.com/image/coachlevy.png?v=9f98615d" :
                    "/images/pawn-light.png"
                  } alt="AI Coach" className={persona === "coach" ? "w-[120%] h-[120%] object-cover object-center translate-y-[10%]" : "w-full h-full object-cover"} />
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-6">
                  {persona === "hikaru" ? "Hikaru Nakamura" : persona === "magnus" ? "Magnus Carlsen" : persona === "vishy" ? "Vishy Anand" : persona === "levy" ? "GothamChess" : "Master of Chess"}
                </h1>
                <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-xl mx-auto">
                   {persona === "hikaru" ? "Grandmaster & 5x US Champion. Let's analyze your games, calculate lines, and find the juice! What position are we looking at today?" : persona === "magnus" ? "Former World Champion. Let's look at your intuition, endgame technique, and practical chess decisions." : persona === "vishy" ? "5-time World Champion. Let's study classical strategy, sharp tactics, and principled opening preparation." : persona === "levy" ? "Internet's chess teacher. Let's fix those terrible blunders, understand danger levels, and find THE ROOOK!" : "I am an elite chess assistant. I can analyze your games, explain grandmaster concepts, and guide your training regimen. What would you like to discuss today?"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                   {CONVERSATION_STARTERS.map((s) => (
                      <button key={s} onClick={() => sendMessage(s)} className="text-left p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium text-slate-300">
                         {s}
                      </button>
                   ))}
                </div>
             </div>
          ) : (
             <div className="space-y-6 pb-48">
                {messages.map((m) => (
                   <AIMessage key={m.id} message={m} />
                ))}
                {streaming && <AILoadingState />}
                <div ref={chatEndRef} />
             </div>
          )}
       </div>

       {/* INPUT AREA */}
       <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent pointer-events-none">
          <div className="max-w-4xl mx-auto w-full pointer-events-auto mt-16">
            {messages.length > 0 && (
              <div className="flex justify-between items-center mb-4 px-2">
                 <button onClick={clearConversation} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition">
                    <Trash2 className="size-4" />
                    Clear Chat
                 </button>
                 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-500">
                   <CheckCircle2 className="size-4" />
                   AI Ready
                 </div>
              </div>
            )}
            <PromptInputBox 
              onSend={(msg) => sendMessage(msg)}
              isLoading={streaming}
              placeholder="Ask about chess strategy, openings, or grandmaster games..."
            />
          </div>
       </div>
       <style jsx>{`
         .hide-scrollbar::-webkit-scrollbar {
           display: none;
         }
         .hide-scrollbar {
           -ms-overflow-style: none;
           scrollbar-width: none;
         }
       `}</style>
    </div>
  );
}
