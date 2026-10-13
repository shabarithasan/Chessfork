"use client";

import { useAI } from "@/contexts/AIProvider";

export function AIFloatingButton() {
  const { open, openAI, coachAvatar } = useAI();

  if (open) return null;

  return (
    <>
      <style>{`
        @keyframes ai-glow-pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,0.08), 0 0 0 0 rgba(255,255,255,0); }
          50% { box-shadow: 0 8px 25px rgba(0,0,0,0.12), 0 0 0 4px rgba(255,255,255,0.4); }
        }
        @keyframes ai-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes badge-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
      <div className="fixed bottom-20 right-5 z-[999] flex flex-col items-end gap-2 md:bottom-6">
        <button
          type="button"
          onClick={openAI}
          className="group relative flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[#e6d5c3] border-[3px] border-white transition-all duration-300 hover:scale-105 active:scale-[0.97]"
          style={{
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            animation: "ai-float 3s ease-in-out infinite, ai-glow-pulse 3s ease-in-out infinite",
          }}
          aria-label={coachAvatar?.includes('coachhikaru') ? "Open Hikaru AI" : "Open ChessFork AI"}
          title={coachAvatar?.includes('coachhikaru') ? "Hikaru AI (Ctrl+K)" : "ChessFork AI (Ctrl+K)"}
        >
          <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <img 
            src={coachAvatar} 
            alt="AI Coach" 
            className={`relative z-10 ${coachAvatar?.includes('pawn') ? 'w-[85%] h-[85%] object-contain drop-shadow-md' : 'w-full h-full object-cover rounded-full'} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`} 
          />
        </button>
      </div>
    </>
  );
}
