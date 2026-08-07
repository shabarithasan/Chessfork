"use client";

import { useAI, CONVERSATION_STARTERS } from "@/contexts/AIProvider";
import { Sparkles } from "lucide-react";

export function AIFloatingButton() {
  const { open, openAI } = useAI();

  if (open) return null;

  return (
    <>
      <style>{`
        @keyframes ai-glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.3), 0 0 40px rgba(59,130,246,0.1); }
          50% { box-shadow: 0 0 30px rgba(59,130,246,0.5), 0 0 60px rgba(59,130,246,0.2); }
        }
        @keyframes ai-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes ai-slide-up {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div className="fixed bottom-20 right-5 z-[999] flex flex-col items-end gap-2 md:bottom-6">
        <button
          type="button"
          onClick={openAI}
          className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#3b82f6]/30 text-white transition-all duration-300 hover:border-[#3b82f6]/60 hover:scale-105 active:scale-[0.97]"
          style={{
            animation: "ai-float 3s ease-in-out infinite, ai-glow-pulse 3s ease-in-out infinite",
          }}
          aria-label="Open ChessFork AI"
          title="ChessFork AI (Ctrl+K)"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#3b82f6]/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <Sparkles className="relative z-10 h-6 w-6 text-[#3b82f6] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3b82f6] opacity-40" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#3b82f6]" />
          </span>
        </button>
      </div>
    </>
  );
}
