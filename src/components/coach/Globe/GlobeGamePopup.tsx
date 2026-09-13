"use client";

import { X } from "lucide-react";
import type { GlobeGame, TimeClass } from "./globe-game-types";
import { countryName, flagEmoji } from "./globe-geo";
import { ChessPieceIcon, TIME_CLASS_BADGE, TIME_CLASS_LABEL } from "./globe-icons";

const WIN_RESULTS = new Set(["win"]);
const LOSS_RESULTS = new Set(["checkmated", "timeout", "resigned", "abandoned", "lose", "loss"]);

function outcome(result: string): "win" | "loss" | "draw" {
  if (WIN_RESULTS.has(result)) return "win";
  if (LOSS_RESULTS.has(result)) return "loss";
  return "draw";
}

function relativeTime(seconds: number) {
  if (seconds < 60) return "just now";
  const m = Math.floor(seconds / 60);
  if (m === 1) return "1 min ago";
  return `${m} min ago`;
}

function PlayerRow({
  username,
  rating,
  country,
  result,
  color,
  source,
}: {
  username: string;
  rating: number;
  country: string;
  result: string;
  color: "white" | "black";
  source: string;
}) {
  const o = outcome(result);
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div
        className={`w-3 h-3 rounded-sm shrink-0 ${
          color === "white"
            ? "bg-white shadow-[0_0_4px_rgba(255,255,255,0.15)]"
            : "bg-zinc-800 border border-zinc-600"
        }`}
      />
      <span className="text-base leading-none" title={countryName(country)}>
        {flagEmoji(country)}
      </span>
      <a
        href={
          source === "lichess"
            ? `https://lichess.org/@/${username}`
            : `https://www.chess.com/member/${username}`
        }
        target="_blank"
        rel="noopener noreferrer"
        className="text-[13px] font-medium text-zinc-100 truncate max-w-[120px] hover:text-amber-400 transition-colors"
      >
        {username}
      </a>
      <span className="text-[11px] text-zinc-500 tabular-nums">({rating})</span>
      <span
        className={`text-xs font-semibold ml-auto tabular-nums ${
          o === "win" ? "text-green-400" : o === "loss" ? "text-red-400" : "text-zinc-400"
        }`}
      >
        {o === "win" ? "1" : o === "loss" ? "0" : "\u00bd"}
      </span>
    </div>
  );
}

export function GlobeGamePopup({
  game,
  position,
  pinned = false,
  onClose,
}: {
  game: GlobeGame;
  position: { x: number; y: number };
  pinned?: boolean;
  onClose?: () => void;
}) {
  const badge = TIME_CLASS_BADGE[game.time_class] ?? TIME_CLASS_BADGE.rapid;
  const label: string = TIME_CLASS_LABEL[game.time_class] ?? game.time_class;

  return (
    <div
      className={`fixed z-50 ${pinned ? "" : "pointer-events-none"}`}
      style={{ left: position.x, top: position.y }}
    >
      <div className="relative bg-zinc-900/95 backdrop-blur-md border border-zinc-700/40 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] min-w-[250px] animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
        {pinned && onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors z-10"
          >
            <X size={14} />
          </button>
        )}
        <div className="p-4">
          <div className={`flex items-center gap-2 mb-3 ${pinned ? "pr-5" : ""}`}>
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border ${badge}`}
            >
              <ChessPieceIcon timeClass={game.time_class as TimeClass} size={11} />
              <span className="text-[11px] font-medium leading-none">{label}</span>
            </div>
            <span className="text-[11px] text-zinc-500 ml-auto">
              {relativeTime(game.ago_seconds)}
            </span>
          </div>
          <div className="space-y-1">
            <PlayerRow
              username={game.white_username}
              rating={game.white_rating}
              country={game.white_country}
              result={game.white_result}
              color="white"
              source={game.source}
            />
            <PlayerRow
              username={game.black_username}
              rating={game.black_rating}
              country={game.black_country}
              result={game.black_result}
              color="black"
              source={game.source}
            />
          </div>
          {game.opening && (
            <div className="mt-2.5 pt-2.5 border-t border-zinc-800/40 text-[11px] text-zinc-500 truncate">
              {game.opening}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
