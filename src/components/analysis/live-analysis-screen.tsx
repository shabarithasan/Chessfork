"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Loader2 } from "lucide-react";
import { Chessboard } from "react-chessboard";

import type { AnalysisSessionState } from "@/hooks/useLiveAnalysisSession";
import { cn } from "@/lib/utils";
import type { MoveGrade } from "@/types/platform";

export function LiveAnalysisScreen({
  session,
  whitePlayer = "White",
  blackPlayer = "Black",
}: {
  session: AnalysisSessionState;
  whitePlayer?: string;
  blackPlayer?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll move list
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session.moveList]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-[rgba(9,9,11,0.92)] text-white backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "url('/images/chess-login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />

      <div className="relative z-10 flex w-full max-w-6xl flex-col gap-8 px-6 lg:flex-row lg:items-start lg:justify-between">
        
        {/* Left Column: Board */}
        <div className="flex w-full flex-col items-center lg:w-1/2">
          <div className="flex w-full max-w-[500px] flex-col gap-4">
            
            {/* Black Player Banner */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 shadow-lg backdrop-blur-md">
              <span className="font-semibold text-slate-200">{blackPlayer}</span>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-400">Est. Rating: <span className="font-bold text-white">{session.estimatedRatingBlack}</span></span>
                <span className="font-bold text-emerald-400">{session.blackAccuracy.toFixed(1)}%</span>
              </div>
            </div>

            {/* Board */}
            <div className="relative aspect-square w-full overflow-hidden rounded-md border border-white/10 shadow-2xl">
              <Chessboard 
                options={{
                  position: session.replayBoardFen,
                  boardOrientation: "white",
                  darkSquareStyle: { backgroundColor: "#5f7f95" },
                  lightSquareStyle: { backgroundColor: "#dbe3e8" },
                  animationDurationInMs: 200,
                  allowDragging: false,
                }}
              />
            </div>

            {/* White Player Banner */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 shadow-lg backdrop-blur-md">
              <span className="font-semibold text-slate-200">{whitePlayer}</span>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-400">Est. Rating: <span className="font-bold text-white">{session.estimatedRatingWhite}</span></span>
                <span className="font-bold text-emerald-400">{session.whiteAccuracy.toFixed(1)}%</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Stats & Progress */}
        <div className="flex w-full flex-col gap-6 lg:w-1/2 lg:pt-16">
          
          {/* Status & Progress */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {session.isAnalyzing ? <Loader2 className="size-5 animate-spin text-amber-400" /> : <BrainCircuit className="size-5 text-emerald-400" />}
                <h2 className="text-xl font-bold tracking-tight text-white">{session.engineStatus}</h2>
              </div>
              <span className="font-mono text-lg font-bold text-amber-400">{session.analysisProgress}%</span>
            </div>
            
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div 
                className="h-full bg-amber-400" 
                initial={{ width: 0 }} 
                animate={{ width: `${session.analysisProgress}%` }} 
                transition={{ ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Move List */}
          <div className="flex h-[200px] flex-col rounded-xl border border-white/10 bg-black/40 p-4 shadow-inner backdrop-blur-md">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Live Move Analysis</h3>
            <div ref={scrollRef} className="flex flex-col gap-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
              {session.moveList.length === 0 && <p className="text-sm text-slate-500 italic">Waiting for moves...</p>}
              {session.moveList.map((move, i) => (
                <div key={i} className="flex items-center justify-between rounded bg-white/5 px-3 py-1.5 text-sm">
                  <span className="font-mono text-slate-300">
                    {move.moveNumber}{move.side === "white" ? "." : "..."} {move.san}
                  </span>
                  <div className="flex gap-4 text-xs font-medium">
                    <span className={cn(
                      move.grade === "Brilliant" ? "text-rose-400" :
                      move.grade === "Great" ? "text-emerald-400" :
                      move.grade === "Best" ? "text-amber-400" :
                      move.grade === "Blunder" ? "text-red-500" :
                      move.grade === "Mistake" ? "text-orange-400" : "text-slate-400"
                    )}>{move.grade}</span>
                    <span className="w-12 text-right text-slate-500">{move.cpLoss > 0 ? `-${(move.cpLoss/100).toFixed(2)}` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quality Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <QualityCard title="White Quality" counts={session.moveQualityCounts.white} />
            <QualityCard title="Black Quality" counts={session.moveQualityCounts.black} />
          </div>

        </div>
      </div>
    </div>
  );
}

function QualityCard({ title, counts }: { title: string; counts: Record<MoveGrade, number> }) {
  const items = [
    { label: "Brilliant", count: counts.Brilliant, color: "text-rose-400" },
    { label: "Great", count: counts.Great, color: "text-emerald-400" },
    { label: "Best", count: counts.Best, color: "text-amber-400" },
    { label: "Good", count: counts.Good + counts.Excellent, color: "text-emerald-500" },
    { label: "Mistake", count: counts.Mistake + counts.Inaccuracy, color: "text-orange-400" },
    { label: "Blunder", count: counts.Blunder, color: "text-red-500" },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between text-sm">
            <span className="text-slate-300">{it.label}</span>
            <span className={cn("font-semibold", it.count > 0 ? it.color : "text-slate-600")}>{it.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
