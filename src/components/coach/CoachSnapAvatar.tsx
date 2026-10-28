"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type CoachPersona = "hikaru" | "magnus";
export type CoachEmotion = "blunder" | "brilliant" | "critical" | "thinking" | "neutral";

interface CoachSnapAvatarProps {
  persona: CoachPersona;
  emotion?: CoachEmotion;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showStickerBadge?: boolean;
}

export function CoachSnapAvatar({
  persona = "hikaru",
  emotion = "critical",
  className,
  size = "md",
  showStickerBadge = true,
}: CoachSnapAvatarProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
    xl: "w-40 h-40",
  }[size];

  // Dynamic emotional sticker emoji
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

  return (
    <div className={cn("relative select-none inline-flex items-center justify-center", className)}>
      {/* Snapchat-style glowing aura based on emotion */}
      <div
        className={cn(
          "absolute -inset-1 rounded-full blur-md opacity-70 transition-all duration-300 pointer-events-none",
          emotion === "blunder" && "bg-gradient-to-tr from-rose-600 to-red-400 opacity-60",
          emotion === "brilliant" && "bg-gradient-to-tr from-amber-400 via-yellow-300 to-orange-500 opacity-80 animate-pulse",
          emotion === "critical" && "bg-gradient-to-tr from-purple-500 via-indigo-400 to-cyan-400 opacity-70",
          (emotion === "thinking" || emotion === "neutral") && "bg-gradient-to-tr from-[#f3c53d]/50 to-amber-200/40"
        )}
      />

      {/* Main Avatar Character Container */}
      <div
        className={cn(
          "relative overflow-hidden rounded-full border-[3px] border-[#fffc00] shadow-[0_10px_25px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#1c2237] to-[#0c0f1d] flex items-center justify-center transition-transform hover:scale-105",
          sizeClasses
        )}
      >
        {persona === "hikaru" ? (
          <HikaruBitmoji emotion={emotion} />
        ) : (
          <MagnusBitmoji emotion={emotion} />
        )}
      </div>

      {/* Floating Snapchat Sticker Badge */}
      {showStickerBadge && (
        <div
          className={cn(
            "absolute -bottom-1 -right-1 flex items-center justify-center rounded-full size-7 sm:size-8 border-2 border-white shadow-lg text-sm sm:text-base animate-bounce-subtle z-10",
            stickerBg
          )}
          title={`Feeling ${emotion}`}
        >
          {stickerEmoji}
        </div>
      )}

      {/* Persona Tag Indicator */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#fffc00] text-[#0b0d14] font-black text-[9px] sm:text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full shadow-md border border-black/20 whitespace-nowrap z-10">
        {persona === "hikaru" ? "Hikaru" : "Magnus"}
      </div>
    </div>
  );
}

/**
 * Hikaru Nakamura Snapchat Bitmoji:
 * Streamer headset, black hoodie with yellow accents, neat black hair, glasses, expressive face.
 */
function HikaruBitmoji({ emotion }: { emotion: CoachEmotion }) {
  return (
    <svg
      viewBox="0 0 160 160"
      className="w-full h-full object-cover scale-[1.08] translate-y-1"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="hikaruSkin" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#f7d0b3" />
          <stop offset="100%" stopColor="#e3af8c" />
        </radialGradient>
        <linearGradient id="hikaruHoodie" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e2230" />
          <stop offset="100%" stopColor="#11131c" />
        </linearGradient>
        <linearGradient id="headsetGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f3c53d" />
          <stop offset="100%" stopColor="#ff7700" />
        </linearGradient>
      </defs>

      {/* Background radial highlight */}
      <circle cx="80" cy="80" r="70" fill="#242c44" opacity="0.6" />

      {/* Shoulders / Hoodie */}
      <path
        d="M20 160 C20 120 45 110 80 110 C115 110 140 120 140 160 Z"
        fill="url(#hikaruHoodie)"
      />
      {/* Hoodie strings & zip */}
      <path d="M80 115 L80 160" stroke="#f3c53d" strokeWidth="2.5" strokeDasharray="3 2" />
      <path d="M68 118 C68 135 70 140 70 145" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <path d="M92 118 C92 135 90 140 90 145" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

      {/* Neck */}
      <rect x="68" y="90" width="24" height="25" rx="6" fill="#dfa782" />

      {/* Head / Face */}
      <rect x="46" y="40" width="68" height="66" rx="33" fill="url(#hikaruSkin)" />

      {/* Ears */}
      <circle cx="45" cy="74" r="8" fill="#e3af8c" />
      <circle cx="115" cy="74" r="8" fill="#e3af8c" />

      {/* Gamer Headset Band over Head */}
      <path
        d="M36 68 C36 28 124 28 124 68"
        stroke="#1a1c24"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M42 66 C42 34 118 34 118 66"
        stroke="url(#headsetGlow)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Headset Ear Cushions */}
      <rect x="30" y="58" width="16" height="28" rx="8" fill="#151821" stroke="#f3c53d" strokeWidth="1.5" />
      <rect x="114" y="58" width="16" height="28" rx="8" fill="#151821" stroke="#f3c53d" strokeWidth="1.5" />

      {/* Headset Boom Mic */}
      <path
        d="M38 76 C38 96 55 102 70 100"
        stroke="#222530"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="71" cy="100" r="4.5" fill="#f3c53d" />

      {/* Neat Black Hair */}
      <path
        d="M45 54 C45 32 75 22 115 38 C115 38 108 48 95 48 C85 48 75 42 60 48 C50 52 45 54 45 54 Z"
        fill="#121318"
      />
      {/* Front fringe strands */}
      <path d="M58 46 C65 42 78 43 85 47" stroke="#1c1f2b" strokeWidth="3" strokeLinecap="round" />

      {/* Eyebrows */}
      {emotion === "blunder" ? (
        <>
          {/* Angled down / agonized eyebrows */}
          <path d="M54 58 L68 64" stroke="#1f222e" strokeWidth="3" strokeLinecap="round" />
          <path d="M106 58 L92 64" stroke="#1f222e" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : emotion === "critical" ? (
        <>
          {/* Deep intense furrowed brows */}
          <path d="M54 62 L69 66" stroke="#1f222e" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M106 62 L91 66" stroke="#1f222e" strokeWidth="3.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Confident streamer raised brows */}
          <path d="M54 58 Q62 54 70 58" stroke="#1f222e" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M90 58 Q98 54 106 58" stroke="#1f222e" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* Glasses Frames (Hikaru Signature) */}
      <rect x="52" y="62" width="22" height="15" rx="4" fill="#000000" fillOpacity="0.1" stroke="#12141a" strokeWidth="2.5" />
      <rect x="86" y="62" width="22" height="15" rx="4" fill="#000000" fillOpacity="0.1" stroke="#12141a" strokeWidth="2.5" />
      <path d="M74 68 L86 68" stroke="#12141a" strokeWidth="2.5" />

      {/* Eyes depending on emotion */}
      {emotion === "blunder" ? (
        <>
          {/* Squeezed shut / facepalm squint */}
          <path d="M57 70 L69 70" stroke="#12141a" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M91 70 L103 70" stroke="#12141a" strokeWidth="2.5" strokeLinecap="round" />
          {/* Big sweat drop */}
          <path d="M110 52 C113 56 113 60 110 63 C107 60 107 56 110 52 Z" fill="#38bdf8" />
        </>
      ) : emotion === "brilliant" ? (
        <>
          {/* Cool sunglasses overlay */}
          <rect x="49" y="60" width="27" height="18" rx="4" fill="#111" stroke="#f3c53d" strokeWidth="1.5" />
          <rect x="84" y="60" width="27" height="18" rx="4" fill="#111" stroke="#f3c53d" strokeWidth="1.5" />
          <line x1="53" y1="64" x2="63" y2="74" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.7" />
          <line x1="88" y1="64" x2="98" y2="74" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.7" />
        </>
      ) : (
        <>
          {/* Sharp focused eyes with light reflection */}
          <circle cx="63" cy="69" r="4.5" fill="#1c1917" />
          <circle cx="64.5" cy="67.5" r="1.5" fill="#ffffff" />
          <circle cx="97" cy="69" r="4.5" fill="#1c1917" />
          <circle cx="98.5" cy="67.5" r="1.5" fill="#ffffff" />
        </>
      )}

      {/* Nose */}
      <path d="M78 72 C78 78 76 80 82 81" stroke="#c98a63" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Mouth */}
      {emotion === "blunder" ? (
        // Open shocked mouth
        <ellipse cx="80" cy="91" rx="7" ry="5" fill="#6b1d1d" stroke="#12141a" strokeWidth="1.5" />
      ) : emotion === "brilliant" ? (
        // Huge hype smile
        <path d="M68 87 Q80 100 92 87 Z" fill="#ffffff" stroke="#12141a" strokeWidth="1.5" />
      ) : emotion === "critical" ? (
        // Tense focused mouth
        <path d="M72 90 L88 88" stroke="#12141a" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        // Confident smirk
        <path d="M71 88 Q81 94 90 87" stroke="#12141a" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}

      {/* Beard stubble (Hikaru style) */}
      <path d="M68 96 Q80 101 92 96" stroke="#b07d58" strokeWidth="1.5" strokeDasharray="1.5 2" />

      {/* Hand Gesture (Facepalm on blunder, Finger on chin for critical) */}
      {emotion === "blunder" && (
        <g transform="translate(86, 68) rotate(-15)">
          <rect x="0" y="0" width="16" height="24" rx="8" fill="#e3af8c" stroke="#12141a" strokeWidth="2" />
          <path d="M4 6 L12 6 M4 11 L12 11 M4 16 L12 16" stroke="#c98a63" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}

/**
 * Magnus Carlsen Snapchat Bitmoji:
 * Messy wavy hair, dark suit / t-shirt, relaxed Norwegian facial bone structure, coffee / chill vibe.
 */
function MagnusBitmoji({ emotion }: { emotion: CoachEmotion }) {
  return (
    <svg
      viewBox="0 0 160 160"
      className="w-full h-full object-cover scale-[1.08] translate-y-1"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="magnusSkin" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#fae0cb" />
          <stop offset="100%" stopColor="#deb08f" />
        </radialGradient>
        <linearGradient id="magnusSuit" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="magnusHair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#784b28" />
          <stop offset="100%" stopColor="#4a2e16" />
        </linearGradient>
      </defs>

      {/* Background radial highlight */}
      <circle cx="80" cy="80" r="70" fill="#1e293b" opacity="0.6" />

      {/* Shoulders / Suit & Tee */}
      <path
        d="M20 160 C20 118 42 108 80 108 C118 108 140 118 140 160 Z"
        fill="url(#magnusSuit)"
      />
      {/* V-neck / Open Collar */}
      <path d="M68 112 L80 135 L92 112 Z" fill="#ffffff" />
      <path d="M62 110 L78 140" stroke="#0f172a" strokeWidth="3" />
      <path d="M98 110 L82 140" stroke="#0f172a" strokeWidth="3" />

      {/* Neck */}
      <rect x="68" y="90" width="24" height="25" rx="6" fill="#d99f7a" />

      {/* Head / Strong Jawline (Magnus signature) */}
      <path
        d="M48 44 C48 30 112 30 112 44 C112 76 106 104 80 104 C54 104 48 76 48 44 Z"
        fill="url(#magnusSkin)"
      />

      {/* Ears */}
      <circle cx="47" cy="72" r="7.5" fill="#deb08f" />
      <circle cx="113" cy="72" r="7.5" fill="#deb08f" />

      {/* Messy Tousled Wavy Hair (Magnus signature) */}
      <path
        d="M44 48 C40 28 58 14 82 16 C105 18 118 28 116 48 C116 48 108 34 94 36 C80 38 72 28 58 38 C50 42 44 48 44 48 Z"
        fill="url(#magnusHair)"
      />
      {/* Messy hair strands jumping out */}
      <path d="M60 22 C64 12 75 14 78 22" stroke="#5c381c" strokeWidth="4" strokeLinecap="round" />
      <path d="M85 20 C92 10 104 15 102 26" stroke="#5c381c" strokeWidth="4" strokeLinecap="round" />
      <path d="M48 36 C42 30 46 22 52 26" stroke="#5c381c" strokeWidth="3.5" strokeLinecap="round" />

      {/* Eyebrows */}
      {emotion === "blunder" ? (
        <>
          {/* Skeptical raised eyebrow */}
          <path d="M55 58 Q64 52 72 60" stroke="#3d2612" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M88 64 L104 60" stroke="#3d2612" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : emotion === "critical" ? (
        <>
          {/* Intense focused champion stare */}
          <path d="M55 60 L70 64" stroke="#3d2612" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M105 60 L90 64" stroke="#3d2612" strokeWidth="3.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Calm relaxed brows */}
          <path d="M55 58 Q64 54 72 58" stroke="#3d2612" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M88 58 Q96 54 104 58" stroke="#3d2612" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* Eyes (Magnus Deep Blue / Intense Gaze) */}
      {emotion === "blunder" ? (
        <>
          {/* Sarcastic / Unimpressed eye roll */}
          <ellipse cx="64" cy="67" rx="5" ry="4" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
          <circle cx="64" cy="65" r="2.5" fill="#2563eb" />
          <ellipse cx="96" cy="67" rx="5" ry="4" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
          <circle cx="96" cy="65" r="2.5" fill="#2563eb" />
        </>
      ) : (
        <>
          {/* Laser focused deep gaze */}
          <ellipse cx="64" cy="68" rx="5.5" ry="4.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
          <circle cx="64" cy="68" r="3" fill="#1d4ed8" />
          <circle cx="65.5" cy="66.5" r="1.2" fill="#ffffff" />
          <ellipse cx="96" cy="68" rx="5.5" ry="4.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
          <circle cx="96" cy="68" r="3" fill="#1d4ed8" />
          <circle cx="97.5" cy="66.5" r="1.2" fill="#ffffff" />
        </>
      )}

      {/* Nose (Chiseled Norse profile) */}
      <path d="M79 66 L78 78 L84 79" stroke="#b87d55" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Mouth */}
      {emotion === "blunder" ? (
        // Mild smirk / head shake
        <path d="M72 90 Q80 94 90 88" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      ) : emotion === "brilliant" ? (
        // Satisfied grin with coffee
        <path d="M70 88 Q80 98 90 88" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      ) : emotion === "critical" ? (
        // Determined straight line
        <path d="M73 90 L87 90" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        // Classic Magnus smirk
        <path d="M72 89 Q82 93 89 87" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}

      {/* Ceramic Coffee Mug (for Brilliant / Chill pose) */}
      {emotion === "brilliant" && (
        <g transform="translate(100, 110)">
          <rect x="0" y="0" width="20" height="22" rx="4" fill="#f8fafc" stroke="#334155" strokeWidth="2" />
          <path d="M20 5 C25 5 25 15 20 17" stroke="#334155" strokeWidth="2" fill="none" />
          {/* Steam */}
          <path d="M6 -4 Q10 -8 6 -12" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M14 -2 Q18 -6 14 -10" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      )}
    </svg>
  );
}
