"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export type CoachPersona = "hikaru" | "magnus";
export type CoachEmotion = "blunder" | "brilliant" | "critical" | "thinking" | "neutral";

interface CoachSnapAvatarProps {
  persona: CoachPersona;
  emotion?: CoachEmotion;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  variant?: "fullbody" | "bust";
  showStickerBadge?: boolean;
}

export function CoachSnapAvatar({
  persona = "hikaru",
  emotion = "critical",
  className,
  size = "full",
  variant = "fullbody",
  showStickerBadge = true,
}: CoachSnapAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // High-res 3D full-body render paths
  const fullbodySrc = (() => {
    if (persona === "hikaru") {
      return emotion === "blunder"
        ? "/images/coaches/hikaru_blunder.png"
        : "/images/coaches/hikaru_standing.png";
    }
    return emotion === "blunder"
      ? "/images/coaches/magnus_blunder.png"
      : "/images/coaches/magnus_standing.png";
  })();

  const stickerEmoji = {
    blunder: "🤦‍♂️",
    brilliant: "🔥",
    critical: "🧠",
    thinking: "🤔",
    neutral: "👑",
  }[emotion];

  const stickerBg = {
    blunder: "bg-red-500",
    brilliant: "bg-amber-400 text-stone-950",
    critical: "bg-purple-500",
    thinking: "bg-blue-500",
    neutral: "bg-emerald-500",
  }[emotion];

  // 1. Full-Body 3D Mode (Primary Display Mode as requested)
  if (variant === "fullbody") {
    return (
      <div className={cn("relative flex flex-col items-center select-none pointer-events-auto", className)}>
        {/* Full-Body 3D Character Cutout */}
        <div className="relative group transition-transform duration-300 hover:scale-105">
          {!imageError ? (
            <img
              src={fullbodySrc}
              alt={persona === "hikaru" ? "3D Hikaru Nakamura" : "3D Magnus Carlsen"}
              onError={() => setImageError(true)}
              className="h-[380px] sm:h-[460px] md:h-[540px] lg:h-[600px] w-auto max-w-none object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.7)] animate-in fade-in slide-in-from-right-8 duration-500"
            />
          ) : (
            <Fallback3DBust persona={persona} emotion={emotion} />
          )}

          {/* Ground Contact Shadow */}
          <div className="w-[60%] h-5 bg-black/60 rounded-[100%] blur-md mx-auto -mt-3 shadow-2xl" />

          {/* Floating Reaction Emoji Badge on shoulder */}
          {showStickerBadge && (
            <div
              className={cn(
                "absolute top-8 right-4 flex items-center justify-center rounded-full size-9 sm:size-10 border-2 border-white shadow-xl text-lg sm:text-xl animate-bounce z-20",
                stickerBg
              )}
              title={`Reaction: ${emotion}`}
            >
              {stickerEmoji}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Bust / Compact Mode (for pills and minimized avatars)
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
    xl: "w-32 h-32",
    full: "w-24 h-24",
  }[size];

  return (
    <div className={cn("relative select-none inline-flex items-center justify-center", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-full border-2 border-[#fffc00] shadow-[0_8px_20px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#1c2237] to-[#0c0f1d] flex items-center justify-center",
          sizeClasses
        )}
      >
        <img
          src={fullbodySrc}
          alt={persona}
          className="w-full h-full object-cover object-top scale-150 translate-y-3"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              persona === "hikaru"
                ? "https://assets-coaches.chess.com/image/coachhikaru.png?v=28d7093b"
                : "https://assets-coaches.chess.com/image/coachmagnus.png?v=819d9dba";
          }}
        />
      </div>

      {showStickerBadge && (
        <div
          className={cn(
            "absolute -bottom-1 -right-1 flex items-center justify-center rounded-full size-6 border-2 border-white shadow-md text-xs z-10",
            stickerBg
          )}
        >
          {stickerEmoji}
        </div>
      )}
    </div>
  );
}

function Fallback3DBust({ persona, emotion }: { persona: CoachPersona; emotion: CoachEmotion }) {
  return (
    <div className="h-[360px] w-64 rounded-3xl bg-gradient-to-b from-neutral-800 to-neutral-950 p-6 flex flex-col items-center justify-center text-center border border-white/10 shadow-2xl">
      <div className="size-28 rounded-full overflow-hidden border-4 border-[#fffc00] mb-4 shadow-lg">
        <img
          src={
            persona === "hikaru"
              ? "https://assets-coaches.chess.com/image/coachhikaru.png?v=28d7093b"
              : "https://assets-coaches.chess.com/image/coachmagnus.png?v=819d9dba"
          }
          alt={persona}
          className="w-full h-full object-cover"
        />
      </div>
      <h3 className="text-xl font-black text-white">
        {persona === "hikaru" ? "Hikaru Nakamura" : "Magnus Carlsen"}
      </h3>
      <p className="text-sm font-semibold text-[#fffc00] mt-1 capitalize">
        Feeling: {emotion}
      </p>
    </div>
  );
}
