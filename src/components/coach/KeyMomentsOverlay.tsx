"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, ChevronRight, ChevronLeft, Volume2, VolumeX, X, RotateCcw, Eye, Play } from "lucide-react";
import { CoachSnapAvatar, CoachPersona } from "@/components/coach/CoachSnapAvatar";
import type { KeyMoment } from "@/hooks/useKeyMoments";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

interface KeyMomentsOverlayProps {
  moment: KeyMoment | null;
  totalMoments: number;
  currentIndex: number;
  persona: CoachPersona;
  onPersonaChange: (newPersona: CoachPersona) => void;
  onFixMove: (moment: KeyMoment) => void;
  onShowBestMove: () => void;
  onNextMoment: () => void;
  onPrevMoment: () => void;
  onDismiss: () => void;
  bestMoveSan?: string;
  isBestMoveRevealed?: boolean;
}

export function KeyMomentsOverlay({
  moment,
  totalMoments,
  currentIndex,
  persona,
  onPersonaChange,
  onFixMove,
  onShowBestMove,
  onNextMoment,
  onPrevMoment,
  onDismiss,
  bestMoveSan,
  isBestMoveRevealed = false,
}: KeyMomentsOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const quote = moment
    ? persona === "hikaru"
      ? moment.hikaruQuote
      : moment.magnusQuote
    : "";

  // Play audio sound stinger & browser TTS when key moment changes
  useEffect(() => {
    if (!moment || isMinimized) return;

    // 1. Play UI sound effect
    if (moment.type === "brilliant") {
      playSound("achievement");
    } else if (moment.type === "blunder") {
      playSound("incorrect");
    } else {
      playSound("notify");
    }

    // 2. Optional Web Speech Synthesis (Speech Bubble Voice)
    if (!isMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(quote);
      if (persona === "hikaru") {
        utterance.rate = 1.25; // Hikaru talks very fast
        utterance.pitch = 1.15;
      } else {
        utterance.rate = 0.95; // Magnus is calm and relaxed
        utterance.pitch = 0.95;
      }

      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [moment?.id, persona, isMuted, isMinimized]);

  if (!moment) return null;

  // Render Minimized Floating Coach Pill
  if (isMinimized) {
    return (
      <div className="absolute bottom-4 right-4 z-40 animate-bounce-subtle">
        <button
          onClick={() => setIsMinimized(false)}
          className="group flex items-center gap-2.5 rounded-full border-2 border-[#fffc00] bg-[#121624]/95 p-1.5 pr-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all hover:scale-105"
        >
          <div className="relative size-10 overflow-hidden rounded-full border border-[#fffc00]/50 bg-neutral-900">
            <CoachSnapAvatar
              persona={persona}
              emotion={moment.emotion}
              size="sm"
              showStickerBadge={false}
              className="w-full h-full scale-125"
            />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#fffc00] animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-[#fffc00]">
                Key Moment ({currentIndex + 1}/{totalMoments})
              </span>
            </div>
            <p className="text-[11px] font-semibold text-white/90">
              {persona === "hikaru" ? "Hikaru's reaction" : "Magnus's take"}
            </p>
          </div>
        </button>
      </div>
    );
  }

  const evalSwingText = (() => {
    const before = (moment.scoreBefore / 100).toFixed(1);
    const after = (moment.scoreAfter / 100).toFixed(1);
    const beforeFmt = moment.scoreBefore > 0 ? `+${before}` : before;
    const afterFmt = moment.scoreAfter > 0 ? `+${after}` : after;
    return `${beforeFmt} ➔ ${afterFmt}`;
  })();

  return (
    <div className="absolute inset-x-2 bottom-3 z-40 mx-auto max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#fffc00]/70 bg-[#0e111c]/95 p-3.5 sm:p-4 shadow-[0_15px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        {/* Top Header Row with Snapchat-style tags */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Snapchat Yellow Badge */}
            <span className="flex items-center gap-1 rounded-full bg-[#fffc00] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-sm">
              <Sparkles className="size-3" />
              {moment.badgeText}
            </span>

            {/* Move Info */}
            <span className="text-[12px] font-bold text-white">
              Move {moment.moveNumber}
              {moment.side === "black" ? "..." : ". "}
              <span className="font-mono text-[#fffc00]">{moment.san}</span>
            </span>

            {/* Evaluation Swing Indicator */}
            <span className="rounded bg-black/40 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-400 border border-white/5">
              {evalSwingText}
            </span>
          </div>

          {/* Right Tools: Persona Toggle, Sound, Minimize */}
          <div className="flex items-center gap-1.5">
            {/* Persona Switcher Pill */}
            <div className="flex items-center rounded-lg bg-black/40 p-0.5 border border-white/10 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => onPersonaChange("hikaru")}
                className={cn(
                  "px-2 py-0.5 rounded transition-colors",
                  persona === "hikaru"
                    ? "bg-[#fffc00] text-black font-black"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                Hikaru
              </button>
              <button
                type="button"
                onClick={() => onPersonaChange("magnus")}
                className={cn(
                  "px-2 py-0.5 rounded transition-colors",
                  persona === "magnus"
                    ? "bg-[#fffc00] text-black font-black"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                Magnus
              </button>
            </div>

            {/* Mute / Unmute */}
            <button
              type="button"
              onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted && typeof window !== "undefined") {
                  window.speechSynthesis.cancel();
                }
              }}
              title={isMuted ? "Unmute Coach Voice" : "Mute Coach Voice"}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5 text-[#fffc00]" />}
            </button>

            {/* Close / Minimize */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Minimize coach overlay"
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Main Body: Bitmoji Avatar + Comic Speech Bubble */}
        <div className="mt-3 flex items-start gap-3.5">
          {/* Avatar Character */}
          <div className="shrink-0 pt-1">
            <CoachSnapAvatar
              persona={persona}
              emotion={moment.emotion}
              size="md"
              showStickerBadge={true}
            />
          </div>

          {/* Comic Speech Bubble */}
          <div className="relative flex-1 rounded-2xl border border-white/10 bg-[#161a29]/90 p-3 shadow-inner">
            {/* Speech bubble pointer triangle */}
            <div className="absolute -left-2 top-5 h-0 w-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-[#161a29]" />

            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#fffc00]">
                {persona === "hikaru" ? "Hikaru Nakamura" : "Magnus Carlsen"}
              </span>
              <span className="text-[10px] font-bold text-zinc-400">
                Moment {currentIndex + 1} of {totalMoments}
              </span>
            </div>

            <p className="text-[12.5px] font-medium leading-[1.55] text-zinc-100 sm:text-[13px]">
              "{quote}"
            </p>
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5">
          {/* Interactive Training / What-If Launch Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onFixMove(moment)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#fffc00] to-[#f3c53d] px-3 py-1.5 text-[11.5px] font-black text-black shadow-md transition-all hover:brightness-105 active:scale-95"
            >
              <RotateCcw className="size-3.5" />
              Fix this move
            </button>

            {moment.bestMove && (
              <button
                type="button"
                onClick={onShowBestMove}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11.5px] font-bold text-zinc-200 transition-colors hover:bg-white/10"
              >
                <Eye className="size-3.5 text-[#fffc00]" />
                {isBestMoveRevealed ? `Best: ${moment.bestMove}` : "Show best move"}
              </button>
            )}
          </div>

          {/* Pagination Navigation: Prev / Next Key Moment */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevMoment}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="size-3.5" />
              Prev
            </button>
            <button
              type="button"
              onClick={onNextMoment}
              className="flex items-center gap-1 rounded-lg border border-[#fffc00]/30 bg-[#fffc00]/10 px-2.5 py-1 text-[11px] font-bold text-[#fffc00] transition-colors hover:bg-[#fffc00]/20"
            >
              Next
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
