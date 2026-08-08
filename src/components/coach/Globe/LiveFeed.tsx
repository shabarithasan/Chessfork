"use client";

import { LiveChessGame } from "@/lib/globe-types";

interface LiveFeedProps {
  games: LiveChessGame[];
  selectedGame: LiveChessGame | null;
  onGameSelect: (game: LiveChessGame) => void;
  onClose: () => void;
}

function formatTimeControl(tc: string): string {
  const [base, inc] = tc.split("+");
  const baseMin = parseInt(base);
  if (baseMin < 3) return `🚀 ${tc} Bullet`;
  if (baseMin < 10) return `⚡ ${tc} Blitz`;
  if (baseMin < 30) return `⏱ ${tc} Rapid`;
  return `🏛 ${tc} Classical`;
}

function getTimeControlColor(tc: string): string {
  const base = parseInt(tc.split("+")[0]);
  if (base < 3) return "text-red-400 bg-red-400/10 border-red-400/20";
  if (base < 10) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
  if (base < 30) return "text-blue-400 bg-blue-400/10 border-blue-400/20";
  return "text-purple-400 bg-purple-400/10 border-purple-400/20";
}

function getCategoryColor(category: string): string {
  switch (category) {
    case "Bullet": return "text-red-400 bg-red-400/10 border-red-400/20";
    case "Blitz": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    case "Rapid": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "Classical": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
    default: return "text-white/50 bg-white/5 border-white/10";
  }
}

export function LiveFeed({ games, selectedGame, onGameSelect, onClose }: LiveFeedProps) {
  return (
    <div className="flex flex-col h-full bg-[#040914]/50 backdrop-blur rounded-[1.2rem] border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          Live Games ({games.length})
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 transition-colors text-white/50 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {games.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/50 gap-2">
            <span className="text-lg">🌍</span>
            <p>No live games matching filters</p>
          </div>
        ) : (
          games.map((game) => (
            <LiveGameCard
              key={game.id}
              game={game}
              isSelected={selectedGame?.id === game.id}
              onClick={() => onGameSelect(game)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function LiveGameCard({ game, isSelected, onClick }: { game: LiveChessGame; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg border transition-all ${
        isSelected
          ? "border-[#f3c53d] bg-[#f3c53d]/10"
          : "border-white/5 hover:border-white/10 hover:bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${getCategoryColor(game.timeControlCategory)}`}>
          {game.timeControlCategory}
        </span>
        <span className="text-xs text-white/50">{game.opening}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate">{game.white.name}</span>
            <span className="text-white/50 text-sm">({game.white.rating})</span>
            {game.white.flag && <span className="text-white/30">{game.white.flag}</span>}
            <span className="text-white/30">{game.white.country}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded">
          <span className="text-white/50 text-sm">vs</span>
        </div>

        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center justify-end gap-2">
            {game.black.flag && <span className="text-white/30">{game.black.flag}</span>}
            <span className="text-white/30">{game.black.country}</span>
            <span className="text-white/50 text-sm">({game.black.rating})</span>
            <span className="font-medium text-white truncate">{game.black.name}</span>
          </div>
        </div>
      </div>

      {game.status === "finished" && game.winner && (
        <div className="mt-2 text-xs text-emerald-400">
          Finished · Winner: {game.winner}
        </div>
      )}

      {game.status === "playing" && (
        <div className="mt-2 text-xs text-white/40 font-mono">
          {game.moves.slice(0, 60)}{game.moves.length > 60 ? "..." : ""}
        </div>
      )}
    </button>
  );
}