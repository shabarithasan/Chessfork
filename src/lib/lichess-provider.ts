/**
 * Lichess TV Provider
 * Fetches live games from Lichess TV API and normalizes to LiveChessGame
 */

import { 
  fetchTvChannel, 
  fetchGameOpening, 
  type GameOpening,
  type TvChannel, 
  type LiveGame as TvLiveGame,
  countryCoords, 
  countryName, 
  flagEmoji,
  normalizeFlagCode 
} from "@/lib/lichess-tv";
import { 
  LiveChessGame, 
  LiveGameProvider, 
  FetchGamesOptions,
  CountryGameData 
} from "./globe-types";

const CHANNELS: TvChannel[] = ["bullet", "blitz", "rapid", "classical"];

const SPEED_TO_CATEGORY: Record<string, "Bullet" | "Blitz" | "Rapid" | "Classical"> = {
  ultraBullet: "Bullet",
  bullet: "Bullet",
  blitz: "Blitz",
  rapid: "Rapid",
  classical: "Classical",
  correspondence: "Classical",
};

const TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);
}

function mapTimeControlCategory(speed: string): "Bullet" | "Blitz" | "Rapid" | "Classical" {
  return SPEED_TO_CATEGORY[speed] || "Blitz";
}

function normalizePlayer(
  player: TvLiveGame["white"] | TvLiveGame["black"],
  source: "white" | "black"
): LiveChessGame["white"] {
  const country = player.country ? normalizeFlagCode(player.country) : undefined;
  return {
    name: player.name,
    rating: player.rating,
    country: country || "XX",
    countryName: country ? countryName(country) : "Unknown",
    flag: country ? flagEmoji(country) : "",
  };
}

function tvGameToNormalized(game: TvLiveGame, opening: GameOpening | null): LiveChessGame {
  const white = normalizePlayer(game.white, "white");
  const black = normalizePlayer(game.black, "black");
  
  return {
    id: `lichess:${game.id}`,
    source: "lichess",
    white,
    black,
    timeControl: game.speed,
    timeControlCategory: mapTimeControlCategory(game.speed),
    opening: opening?.name || "Unknown Opening",
    moves: "",
    status: game.finishedAt ? "finished" : "playing",
    winner: undefined,
    startedAt: game.startedAt,
    finishedAt: game.finishedAt,
    coordinates: {
      white: white.country ? countryCoords(white.country) : null,
      black: black.country ? countryCoords(black.country) : null,
    },
  };
}

export const lichessProvider: LiveGameProvider = {
  name: "Lichess TV",
  
  async fetchGames(options: FetchGamesOptions = {}): Promise<LiveChessGame[]> {
    const { limit = 50, timeControl, liveOnly = true, country } = options;
    
    const channelsToFetch = timeControl && timeControl !== "All"
      ? [timeControl.toLowerCase() as TvChannel]
      : CHANNELS;

    const results = await Promise.allSettled(
      channelsToFetch.map((channel) => 
        withTimeout(fetchTvChannel(channel), TIMEOUT_MS)
      )
    );

    let allGames: TvLiveGame[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allGames = allGames.concat(result.value);
      }
    }

    if (liveOnly) {
      allGames = allGames.filter((g) => !g.finishedAt);
    }

    if (country) {
      allGames = allGames.filter(
        (g) => g.white.country === country || g.black.country === country
      );
    }

    const limited = allGames.slice(0, limit);

    const gamesWithDetails = await Promise.all(
      limited.map(async (game) => {
        try {
          const opening = await withTimeout(fetchGameOpening(game.id), 5000);
          return tvGameToNormalized(game, opening);
        } catch {
          return tvGameToNormalized(game, null);
        }
      })
    );

    return gamesWithDetails;
  },

  async fetchGameDetails(gameId: string): Promise<LiveChessGame | null> {
    try {
      const cleanId = gameId.startsWith("lichess:") ? gameId.slice(8) : gameId;
      const opening = await withTimeout(fetchGameOpening(cleanId), 5000);
      
      const response = await withTimeout(
        fetch(`https://lichess.org/api/game/${encodeURIComponent(cleanId)}?moves=1&opening=true`, {
          headers: { Accept: "application/json" },
        }),
        TIMEOUT_MS
      );
      
      if (!response.ok) return null;
      const game = await response.json();
      
      const white = game.players?.white;
      const black = game.players?.black;
      if (!white || !black) return null;

      const normalized: LiveChessGame = {
        id: `lichess:${game.id}`,
        source: "lichess",
        white: normalizePlayer({ name: white.user?.name || white.name, rating: white.rating, country: white.user?.flag }, "white"),
        black: normalizePlayer({ name: black.user?.name || black.name, rating: black.rating, country: black.user?.flag }, "black"),
        timeControl: game.speed,
        timeControlCategory: mapTimeControlCategory(game.speed),
        opening: opening?.name || "Unknown Opening",
        moves: game.moves || "",
        status: game.status === "started" ? "playing" : "finished",
        winner: game.winner,
        startedAt: game.createdAt,
        finishedAt: game.lastMoveAt,
        coordinates: {
          white: white.user?.flag ? countryCoords(normalizeFlagCode(white.user.flag) || "") : null,
          black: black.user?.flag ? countryCoords(normalizeFlagCode(black.user.flag) || "") : null,
        },
      };
      
      return normalized;
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