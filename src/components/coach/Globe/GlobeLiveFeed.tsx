"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { GlobeGame, TimeClass } from "./globe-game-types";
import { flagEmoji } from "./globe-geo";
import { ChessPieceIcon } from "./globe-icons";

function agoShort(seconds: number) {
  if (seconds < 60) return "now";
  const m = Math.floor(seconds / 60);
  return `${m}m`;
}

function FeedRow({
  game,
  isOpen,
  onToggle,
}: {
  game: GlobeGame;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-top-1 duration-300">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/[0.03] transition-colors"
      >
        <ChessPieceIcon timeClass={game.time_class as TimeClass} size={12} />
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="leading-none">{flagEmoji(game.white_country)}</span>
          <span className="text-zinc-200 truncate max-w-[72px] font-medium">
            {game.white_username}
          </span>
          <span className="text-zinc-600 text-[10px] tabular-nums">
            {game.white_rating}
          </span>
        </div>
        <span className="text-zinc-700 text-[9px] font-medium shrink-0">vs</span>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="leading-none">{flagEmoji(game.black_country)}</span>
          <span className="text-zinc-200 truncate max-w-[72px] font-medium">
            {game.black_username}
          </span>
          <span className="text-zinc-600 text-[10px] tabular-nums">
            {game.black_rating}
          </span>
        </div>
        <span className="text-zinc-600 text-[10px] tabular-nums shrink-0 w-5 text-right">
          {agoShort(game.ago_seconds)}
        </span>
      </button>
      {isOpen && (
        <div className="px-3 pb-2.5 pt-0.5 flex justify-center animate-in fade-in slide-in-from-top-1 duration-150">
          <a
            href={
              game.source === "lichess"
                ? `https://lichess.org/${game.id.replace("lichess:", "")}`
                : `https://www.chess.com/game/live/${game.id.replace("chesscom:", "")}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <ExternalLink size={9} />
            Analyze on ChessFork
          </a>
        </div>
      )}
    </div>
  );
}

export function GlobeLiveFeed({ games }: { games: GlobeGame[] }) {
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    const now = Date.now();
    return [...games]
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 10)
      .map((g) => ({
        ...g,
        ago_seconds: Math.round((now - new Date(g.created_at).getTime()) / 1000),
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, tick]);

  if (rows.length === 0) return null;

  const visible = expanded ? 10 : 3;

  return (
    <div className="fixed bottom-14 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:bottom-auto sm:left-4 sm:top-16 z-40 w-[min(340px,calc(100vw-24px))]">
      <div className="bg-zinc-900/70 backdrop-blur-md border border-zinc-800/50 rounded-xl overflow-hidden">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="sm:pointer-events-none w-full px-3 py-2 border-b border-zinc-800/50 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
              Live Feed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ChevronDown
              size={12}
              className={`text-zinc-500 transition-transform sm:hidden ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>
        <div className="divide-y divide-zinc-800/30">
          {rows.map((game, i) => (
            <div key={game.id} className={i >= visible ? "hidden sm:block" : ""}>
              <FeedRow
                game={game}
                isOpen={game.id === openId}
                onToggle={() => setOpenId(openId === game.id ? null : game.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
