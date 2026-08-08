/**
 * Chess.com Provider
 * Fetches live games from Chess.com Public API and normalizes to LiveChessGame
 */

import { 
  fetchChessComLiveGames, 
  fetchChessComPlayer, 
  getTimeControlCategory,
  type ChessComGame 
} from "@/lib/chess-com";
import { 
  LiveChessGame, 
  LiveGameProvider, 
  FetchGamesOptions,
  CountryGameData 
} from "./globe-types";
import { countryCoords, countryName, flagEmoji, normalizeFlagCode } from "@/lib/lichess-tv";

const TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);
}

function normalizeChessComPlayer(
  player: ChessComGame["white"] | ChessComGame["black"],
  profile: { country?: string } | null
): LiveChessGame["white"] {
  const country = profile?.country 
    ? normalizeFlagCode(profile.country) 
    : normalizeFlagCode(player.country);
  
  return {
    name: player.username,
    rating: player.rating,
    country: country || "XX",
    countryName: country ? countryName(country) : "Unknown",
    flag: country ? flagEmoji(country) : "",
    title: player.title,
  };
}

function chessComGameToNormalized(
  game: ChessComGame, 
  whiteProfile: { country?: string } | null,
  blackProfile: { country?: string } | null
): LiveChessGame {
  const white = normalizeChessComPlayer(game.white, whiteProfile);
  const black = normalizeChessComPlayer(game.black, blackProfile);
  const timeControlCategory = getTimeControlCategory(game.time_class, game.time_control);

  return {
    id: `chesscom:${game.id}`,
    source: "chesscom",
    white,
    black,
    timeControl: game.time_control,
    timeControlCategory,
    opening: "Chess.com Game",
    moves: game.pgn.split("\n").slice(-1)[0] || "",
    status: game.end_time ? "finished" : "playing",
    winner: game.white.result === "win" ? white.name : game.black.result === "win" ? black.name : undefined,
    startedAt: game.start_time * 1000,
    finishedAt: game.end_time ? game.end_time * 1000 : undefined,
    coordinates: {
      white: white.country ? countryCoords(white.country) : null,
      black: black.country ? countryCoords(black.country) : null,
    },
  };
}

export const chessComProvider: LiveGameProvider = {
  name: "Chess.com",
  
  async fetchGames(options: FetchGamesOptions = {}): Promise<LiveChessGame[]> {
    const { limit = 50, timeControl, liveOnly = true, country } = options;
    
    try {
      const games = await withTimeout(fetchChessComLiveGames(limit * 3), TIMEOUT_MS);
      
      let filtered = games;
      
      if (timeControl && timeControl !== "All") {
        filtered = filtered.filter(
          (g) => getTimeControlCategory(g.time_class, g.time_control) === timeControl
        );
      }
      
      if (liveOnly) {
        filtered = filtered.filter((g) => !g.end_time);
      }
      
      if (country) {
        filtered = filtered.filter(
          (g) => g.white.country === country || g.black.country === country
        );
      }
      
      const limited = filtered.slice(0, limit);
      
      const gamesWithDetails = await Promise.all(
        limited.map(async (game) => {
          try {
            const [whiteProfile, blackProfile] = await Promise.all([
              withTimeout(fetchChessComPlayer(game.white.username), 3000),
              withTimeout(fetchChessComPlayer(game.black.username), 3000),
            ]);
            return chessComGameToNormalized(game, whiteProfile, blackProfile);
          } catch {
            return chessComGameToNormalized(game, null, null);
          }
        })
      );
      
      return gamesWithDetails;
    } catch (error) {
      console.error("Chess.com fetchGames error:", error);
      return [];
    }
  },

  async fetchGameDetails(gameId: string): Promise<LiveChessGame | null> {
    try {
      const cleanId = gameId.startsWith("chesscom:") ? gameId.slice(9) : gameId;
      const games = await withTimeout(fetchChessComLiveGames(100), TIMEOUT_MS);
      const game = games.find(g => g.id === cleanId);
      if (!game) return null;
      
      const [whiteProfile, blackProfile] = await Promise.all([
        withTimeout(fetchChessComPlayer(game.white.username), 3000),
        withTimeout(fetchChessComPlayer(game.black.username), 3000),
      ]);
      
      return chessComGameToNormalized(game, whiteProfile, blackProfile);
    } catch {
      return null;
    }
  },
};

export async function calculateCountryStatsFromGames(
  games: LiveChessGame[]
): Promise<CountryGameData[]> {
  const countryMap = new Map<string, {
    games: LiveChessGame[];
    players: Set<string>;
    ratings: number[];
    timeControls: Map<string, number>;
    openings: Map<string, number>;
  }>();

  for (const game of games) {
    for (const player of [game.white, game.black]) {
      const code = player.country;
      if (!countryMap.has(code)) {
        countryMap.set(code, {
          games: [],
          players: new Set(),
          ratings: [],
          timeControls: new Map(),
          openings: new Map(),
        });
      }
      const data = countryMap.get(code)!;
      data.games.push(game);
      data.players.add(player.name);
      data.ratings.push(player.rating);
      data.timeControls.set(game.timeControlCategory, (data.timeControls.get(game.timeControlCategory) || 0) + 1);
      data.openings.set(game.opening, (data.openings.get(game.opening) || 0) + 1);
    }
  }

  return Array.from(countryMap.entries())
    .filter(([, data]) => data.games.length > 0)
    .map(([code, data]) => {
      const coords = countryCoords(code);
      return {
        countryCode: code,
        countryName: countryName(code),
        flag: flagEmoji(code),
        gameCount: data.games.length,
        coordinates: coords,
        activeGames: data.games.filter(g => g.status === "playing").length,
        uniquePlayers: data.players.size,
        averageRating: Math.round(data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length),
        timeControlDistribution: Array.from(data.timeControls.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count),
        openings: Array.from(data.openings.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
      };
    })
    .sort((a, b) => b.gameCount - a.gameCount);
}