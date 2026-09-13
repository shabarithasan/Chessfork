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
  } = useAI();

  const [persona, setPersona] = useState<"coach" | "hikaru" | "magnus">("coach");
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
             { id: "coach", label: "Elite Coach" },
             { id: "hikaru", label: "Hikaru Nakamura" },
             { id: "magnus", label: "Magnus Carlsen" },
           ].map((p) => (
             <button
               key={p.id}
               onClick={() => setPersona(p.id as "coach" | "hikaru" | "magnus")}
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
                <div className="size-20 rounded-3xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 mb-8 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
                   <Sparkles className="size-10 text-amber-400" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-6">
                  Master of Chess
                </h1>
                <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-xl mx-auto">
                   I am an elite chess assistant. I can analyze your games, explain grandmaster concepts, and guide your training regimen. What would you like to discuss today?
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
