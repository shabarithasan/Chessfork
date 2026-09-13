"use client";

import { LiveChessGame } from "@/lib/globe-types";

interface LiveFeedProps {
  games: LiveChessGame[];
  selectedGame: LiveChessGame | null;
  onGameSelect: (game: LiveChessGame) => void;
  onClose: () => void;
}

function truncateName(name: string) {
  if (name.length > 10) return name.substring(0, 8) + "...";
  return name;
}

export function LiveFeed({ games, selectedGame, onGameSelect, onClose }: LiveFeedProps) {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]/80 backdrop-blur-md rounded-xl border border-white/5 overflow-hidden font-mono">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="font-semibold text-[#a1a1aa] text-xs tracking-[0.2em] flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          LIVE FEED
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-0 custom-scrollbar">
        {games.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-white/30 text-xs">
            <p>No live games</p>
          </div>
        ) : (
          games.map((game, i) => (
            <LiveGameCard
              key={game.id}
              game={game}
              isSelected={selectedGame?.id === game.id}
              onClick={() => onGameSelect(game)}
              isEven={i % 2 === 0}
            />
          ))
        )}
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

function LiveGameCard({ game, isSelected, onClick, isEven }: { game: LiveChessGame; isSelected: boolean; onClick: () => void; isEven: boolean }) {
  const dotColor = game.timeControlCategory === "Bullet" ? "bg-amber-400" : "bg-emerald-500";
  
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2.5 flex items-center justify-between text-xs transition-colors whitespace-nowrap overflow-hidden ${
        isSelected
          ? "bg-white/10"
          : isEven ? "bg-transparent hover:bg-white/5" : "bg-white/[0.02] hover:bg-white/5"
      }`}
    >
      <div className="flex items-center gap-2.5 w-[42%] overflow-hidden">
        <span className={`shrink-0 size-1.5 rounded-full ${dotColor}`} />
        <span className="shrink-0 text-emerald-500 font-bold uppercase w-4 text-center">{game.white.country === "XX" ? "--" : game.white.country}</span>
        <span className="text-[#e4e4e7] font-semibold truncate">{truncateName(game.white.name)}</span>
        <span className="text-white/30 shrink-0">{game.white.rating}</span>
      </div>

      <div className="text-white/20 text-[10px] shrink-0 mx-2">vs</div>

      <div className="flex items-center gap-2 w-[42%] overflow-hidden">
        <span className="shrink-0 text-emerald-500 font-bold uppercase w-4 text-center">{game.black.country === "XX" ? "--" : game.black.country}</span>
        <span className="text-[#e4e4e7] font-semibold truncate">{truncateName(game.black.name)}</span>
        <span className="text-white/30 shrink-0">{game.black.rating}</span>
      </div>

      <div className="text-white/20 w-8 text-right shrink-0 ml-2">
        {game.timeControl}
      </div>
    </button>
  );
}