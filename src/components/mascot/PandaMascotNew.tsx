"use client";

interface PandaMascotNewProps {
  size?: number;
  className?: string;
}

export function PandaMascotNew({ size = 96, className = "" }: PandaMascotNewProps) {
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="-60 -115 120 165" style={{ width: "100%", height: "100%", display: "block" }}>
        <path d="M -22 -102 A 11 11 0 1 1 0 -102 A 11 11 0 1 1 -22 -102" fill="#21242F"/>
        <path d="M 22 -102 A 11 11 0 1 1 44 -102 A 11 11 0 1 1 22 -102" fill="#21242F"/>
        <path d="M -20 -102 A 5 5 0 1 1 -10 -102 A 5 5 0 1 1 -20 -102" fill="#48648D"/>
        <path d="M 24 -102 A 5 5 0 1 1 34 -102 A 5 5 0 1 1 24 -102" fill="#48648D"/>
        <path d="M -46 -10 A 46 52 0 1 1 46 -10 A 46 52 0 1 1 -46 -10" fill="#21242F"/>
        <path d="M -34 -7 A 34 44 0 1 1 34 -7 A 34 44 0 1 1 -34 -7" fill="#DEDEE2"/>
        <path d="M -30 -72 A 30 28 0 1 1 30 -72 A 30 28 0 1 1 -30 -72" fill="#DEDEE2"/>
        <path d="M -24 -78 A 12 14 0 1 1 0 -78 A 12 14 0 1 1 -24 -78" fill="#21242F"/>
        <path d="M 0 -78 A 12 14 0 1 1 24 -78 A 12 14 0 1 1 0 -78" fill="#21242F"/>
        <path d="M -14 -78 A 4 4 0 1 1 -6 -78 A 4 4 0 1 1 -14 -78" fill="#DEDEE2"/>
        <path d="M 6 -78 A 4 4 0 1 1 14 -78 A 4 4 0 1 1 6 -78" fill="#DEDEE2"/>
        <path d="M -5 -62 A 5 3 0 1 1 5 -62 A 5 3 0 1 1 -5 -62" fill="#D7A030"/>
        <path d="M -5 -58 Q 0 -54 5 -58" fill="none" stroke="#21242F" strokeWidth={1.5} strokeLinecap="round"/>
        <path d="M -40 36 A 14 10 0 1 1 -12 36 A 14 10 0 1 1 -40 36" fill="#21242F"/>
        <path d="M 12 36 A 14 10 0 1 1 40 36 A 14 10 0 1 1 12 36" fill="#21242F"/>
        <path d="M -44 -8 C -60 -4 -58 18 -46 24 C -42 26 -40 16 -42 6 C -43 -2 -42 -6 -44 -8" fill="#21242F"/>
        <path d="M 44 -8 C 60 -4 58 18 46 24 C 42 26 40 16 42 6 C 43 -2 42 -6 44 -8" fill="#21242F"/>
      </svg>
    </div>
  );
}
