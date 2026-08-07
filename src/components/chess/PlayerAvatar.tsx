"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface PlayerAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  rating?: string | number | null;
  countryFlag?: string | null;
}

const dims = { sm: "size-7 text-[9px]", md: "size-9 text-xs", lg: "size-12 text-sm" };
const imgSizes = { sm: 28, md: 36, lg: 48 };

function initials(name: string): string {
  return name
    .split(/[\s,_.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function bgGradient(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  const h1 = (hash * 47 + 180) % 360;
  const h2 = (h1 + 60 + (hash * 13) % 40) % 360;
  return `linear-gradient(135deg, hsl(${h1},55%,50%), hsl(${h2},50%,40%))`;
}

export function PlayerAvatar({ name, avatarUrl, size = "md", className = "", rating, countryFlag }: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);
  const init = initials(name);
  const grad = useRef(bgGradient(name));

  const avatar = (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 font-bold text-white/90 ${dims[size]} ${className}`}
    >
      {avatarUrl && !failed ? (
        <Image
          alt={name}
          className="object-cover"
          fill
          loading="lazy"
          sizes={`${imgSizes[size]}px`}
          src={avatarUrl}
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <span style={{ background: grad.current }} className="grid size-full place-items-center rounded-full">
          {init || "?"}
        </span>
      )}
    </span>
  );

  if (rating || countryFlag) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        {avatar}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          {(rating || countryFlag) && (
            <p className="flex items-center gap-1 text-[10px] text-slate-500">
              {countryFlag && <span>{countryFlag}</span>}
              {rating && <span>{rating}</span>}
            </p>
          )}
        </div>
      </div>
    );
  }

  return avatar;
}
