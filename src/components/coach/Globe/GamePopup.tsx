"use client";

import { LiveGame } from "../chess-globe";

interface GamePopupProps {
  game: LiveGame;
  onClose: () => void;
}

function formatTimeControl(tc: string): string {
  const [base, inc] = tc.split("+");
  const baseMin = parseInt(base);
  if (baseMin < 3) return `Bullet (${tc})`;
  if (baseMin < 10) return `Blitz (${tc})`;
  if (baseMin < 30) return `Rapid (${tc})`;
  return `Classical (${tc})`;
}

function getTimeControlColor(tc: string): string {
  const base = parseInt(tc.split("+")[0]);
  if (base < 3) return "text-red-400 bg-red-400/10 border-red-400/20";
  if (base < 10) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
  if (base < 30) return "text-blue-400 bg-blue-400/10 border-blue-400/20";
  return "text-purple-400 bg-purple-400/10 border-purple-400/20";
}

export function GamePopup({ game, onClose }: GamePopupProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0a0e1a] border border-white/10 rounded-[1.2rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Live Game
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTimeControlColor(game.timeControl)}`}>
              {formatTimeControl(game.timeControl)}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/5 text-white/70 border border-white/10">
              {game.opening}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <PlayerCard
              player={game.player1}
              isWhite
              status={game.status}
              winner={game.winner}
            />
            <PlayerCard
              player={game.player2}
              isWhite={false}
              status={game.status}
              winner={game.winner}
            />
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="font-medium text-white/70 mb-2">Current Position</div>
            <div className="font-mono text-xs text-white/50 bg-[#04091a] p-3 rounded max-h-24 overflow-y-auto whitespace-pre-wrap">
              {game.moves || "Game just started..."}
            </div>
          </div>

          {game.status === "finished" && game.winner && (
            <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <span>🏆</span>
                <span>Game Finished</span>
              </div>
              <div className="text-white/80 mt-1">Winner: <span className="font-semibold">{game.winner}</span></div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
            >
              Close
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg bg-[#f3c53d] text-black font-medium hover:bg-[#f3c53d]/90 transition-colors"
            >
              Watch Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({
  player,
  isWhite,
  status,
  winner,
}: {
  player: LiveGame["player1"];
  isWhite: boolean;
  status: LiveGame["status"];
  winner?: string;
}) {
  const isWinner = winner === player.name;
  const isLoser = status === "finished" && winner && winner !== player.name;

  return (
    <div
      className={`relative p-3 rounded-lg border ${
        isWinner
          ? "border-emerald-400/30 bg-emerald-400/5"
          : isLoser
          ? "border-red-400/30 bg-red-400/5"
          : "border-white/10"
      }`}
    >
      {isWinner && (
        <div className="absolute -top-2 -right-2 bg-emerald-400 text-black text-xs font-bold px-2 py-0.5 rounded">
          WINNER
        </div>
      )}
      {isLoser && (
        <div className="absolute -top-2 -right-2 bg-red-400 text-white text-xs font-bold px-2 py-0.5 rounded">
          LOST
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${status === "playing" ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
        <span className="text-xs text-white/50">{isWhite ? "White" : "Black"}</span>
      </div>

      <div className="font-semibold text-white truncate">{player.name}</div>
      <div className="text-sm text-white/50">{player.rating} · {player.country}</div>

      {status === "playing" && (
        <div className="mt-2 text-xs text-white/40">
          {isWhite ? "To move" : "Opponent's turn"}
        </div>
      )}
    </div>
  );
}