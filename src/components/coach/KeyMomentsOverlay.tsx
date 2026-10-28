"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, ChevronRight, ChevronLeft, Volume2, VolumeX, X, RotateCcw, Eye, Check } from "lucide-react";
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

    if (moment.type === "brilliant") {
      playSound("achievement");
    } else if (moment.type === "blunder") {
      playSound("incorrect");
    } else {
      playSound("notify");
    }

    if (!isMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(quote);
      if (persona === "hikaru") {
        utterance.rate = 1.25;
        utterance.pitch = 1.15;
      } else {
        utterance.rate = 0.95;
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

  // ── 1. Minimized Floating Coach Pill ──
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[1200] animate-bounce-subtle pointer-events-auto">
        <button
          onClick={() => setIsMinimized(false)}
          className="group flex items-center gap-3 rounded-full border-2 border-[#fffc00] bg-[#121624]/95 p-2 pr-5 shadow-[0_12px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-all hover:scale-105"
        >
          <div className="relative size-12 overflow-hidden rounded-full border border-[#fffc00]/60 bg-neutral-900 shadow-md">
            <CoachSnapAvatar
              persona={persona}
              emotion={moment.emotion}
              size="sm"
              variant="bust"
              showStickerBadge={false}
              className="w-full h-full scale-125"
            />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#fffc00] animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-[#fffc00]">
                3D Coach ({currentIndex + 1}/{totalMoments})
              </span>
            </div>
            <p className="text-[12px] font-bold text-white">
              {persona === "hikaru" ? "Hikaru's analysis" : "Magnus's take"}
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

  // ── 2. Full-Screen 3D Coach Stage (Primary Display Matching User's Image) ──
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-8 backdrop-blur-md bg-black/65 animate-in fade-in duration-300 pointer-events-auto">
      {/* Click outside backdrop to dismiss/minimize */}
      <div
        className="absolute inset-0 -z-10"
        onClick={() => setIsMinimized(true)}
        title="Click anywhere to return to board"
      />

      <div className="relative flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 max-w-5xl w-full mx-auto">
        {/* Floating Speech Bubble / Dialog (like reference image) */}
        <div className="relative flex-1 max-w-lg w-full rounded-3xl bg-white p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.6)] text-zinc-900 border border-white/40 animate-in zoom-in-95 duration-400">
          {/* Bubble Pointer Triangle pointing to 3D avatar on desktop */}
          <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[12px] border-y-transparent border-l-[14px] border-l-white" />

          {/* Top Row: Moment Tag, Persona Tabs, Controls */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-black shadow-sm">
                <Sparkles className="size-3" />
                {moment.badgeText}
              </span>
              <span className="rounded bg-rose-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-rose-700">
                {evalSwingText}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Persona Switcher Pill */}
              <div className="flex items-center rounded-xl bg-zinc-100 p-0.5 text-[11px] font-bold border border-zinc-200">
                <button
                  type="button"
                  onClick={() => onPersonaChange("hikaru")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    persona === "hikaru"
                      ? "bg-zinc-900 text-white shadow-sm font-black"
                      : "text-zinc-500 hover:text-zinc-900"
                  )}
                >
                  Hikaru ⚡
                </button>
                <button
                  type="button"
                  onClick={() => onPersonaChange("magnus")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    persona === "magnus"
                      ? "bg-zinc-900 text-white shadow-sm font-black"
                      : "text-zinc-500 hover:text-zinc-900"
                  )}
                >
                  Magnus 👑
                </button>
              </div>

              {/* Voice Mute / Unmute */}
              <button
                type="button"
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (!isMuted && typeof window !== "undefined") {
                    window.speechSynthesis.cancel();
                  }
                }}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 transition"
                title={isMuted ? "Unmute Voice" : "Mute Voice"}
              >
                {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4 text-amber-500" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 transition"
                title="Minimize Coach"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Coach Name & Headline */}
          <div className="mb-2">
            <h4 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              {persona === "hikaru" ? "Hikaru Nakamura" : "Magnus Carlsen"}
            </h4>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
              {moment.headline} • Move {moment.moveNumber} ({moment.san})
            </p>
          </div>

          {/* Coach Speech Text */}
          <div className="my-4 rounded-2xl bg-zinc-50 p-4 border border-zinc-100">
            <p className="text-sm sm:text-base font-medium leading-relaxed text-zinc-700">
              "{quote}"
            </p>
          </div>

          {/* Action Buttons Row (styled matching the reference image's Let's Go button) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onFixMove(moment);
                  setIsMinimized(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/30 transition-all hover:brightness-110 active:scale-95"
              >
                <Check className="size-4 stroke-[3]" />
                Fix This Move
              </button>

              {moment.bestMove && (
                <button
                  type="button"
                  onClick={onShowBestMove}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition"
                >
                  <Eye className="size-3.5 text-amber-600" />
                  {isBestMoveRevealed ? `Best: ${moment.bestMove}` : "Show Best Move"}
                </button>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onPrevMoment}
                className="flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition"
              >
                <ChevronLeft className="size-4" />
                Prev
              </button>
              <button
                type="button"
                onClick={onNextMoment}
                className="flex items-center gap-1 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition"
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 3D Full-Body Bitmoji Avatar Character standing proudly */}
        <div className="shrink-0 flex flex-col items-center justify-end">
          <CoachSnapAvatar
            persona={persona}
            emotion={moment.emotion}
            variant="fullbody"
            size="full"
            showStickerBadge={true}
          />
        </div>
      </div>
    </div>
  );
}
