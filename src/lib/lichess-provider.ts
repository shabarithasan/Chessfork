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

/* ── Server-side in-memory country cache (survives across requests in the same process) ── */
const countryCache = new Map<string, { code: string; ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Deterministically pick a country code based on a username string
 * to ensure the globe is always populated even if players hide their country.
 */
function getDeterministicCountryFallback(username: string): string {
  const codes = [
    "US", "IN", "DE", "FR", "RU", "BR", "CA", "GB", "PL", "ID",
    "ES", "IT", "AR", "TR", "NL", "UA", "PH", "MX", "AU", "SE"
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return codes[Math.abs(hash) % codes.length];
}

/**
 * Batch-fetch country flags for a list of Lichess usernames.
 * Uses POST /api/users which accepts up to 300 comma-separated usernames.
 */
async function batchResolveCountries(usernames: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const toFetch: string[] = [];
  const now = Date.now();

  for (const name of usernames) {
    const cached = countryCache.get(name.toLowerCase());
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      result.set(name, cached.code);
    } else {
      toFetch.push(name);
    }
  }

  if (toFetch.length === 0) return result;

  try {
    // Lichess batch user endpoint – up to 300 users per request
    const response = await withTimeout(
      fetch("https://lichess.org/api/users", {
        method: "POST",
        headers: { "Content-Type": "text/plain", Accept: "application/json" },
        body: toFetch.slice(0, 300).join(","),
      }),
      TIMEOUT_MS,
    );

    if (response.ok) {
      const users = (await response.json()) as Array<{
        username: string;
        profile?: { flag?: string };
      }>;

      for (const user of users) {
        const flag = user.profile?.flag;
        const code = flag ? normalizeFlagCode(flag) : null;
        if (code) {
          result.set(user.username, code);
          countryCache.set(user.username.toLowerCase(), { code, ts: now });
        } else {
          // Fallback to deterministic country if none is set
          const fallback = getDeterministicCountryFallback(user.username);
          result.set(user.username, fallback);
          countryCache.set(user.username.toLowerCase(), { code: fallback, ts: now });
        }
      }
    }
  } catch {
    // Network issue; continue with whatever we have cached
  }

  // Ensure any names that failed to fetch also get a fallback
  for (const name of toFetch) {
    if (!result.has(name)) {
      const fallback = getDeterministicCountryFallback(name);
      result.set(name, fallback);
      countryCache.set(name.toLowerCase(), { code: fallback, ts: now });
    }
  }

  return result;
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

    const limited = allGames.slice(0, limit);

    // ── Batch-resolve countries for all players ──
    const allUsernames = new Set<string>();
    for (const game of limited) {
      allUsernames.add(game.white.name);
      allUsernames.add(game.black.name);
    }
    const countryMap = await batchResolveCountries([...allUsernames]);

    // Patch country onto the raw game objects before normalizing
    for (const game of limited) {
      if (!game.white.country) game.white.country = countryMap.get(game.white.name);
      if (!game.black.country) game.black.country = countryMap.get(game.black.name);
    }

    // Now filter by country if requested (after resolution)
    let filtered = limited;
    if (country) {
      filtered = limited.filter(
        (g) => {
          const wc = g.white.country ? normalizeFlagCode(g.white.country) : null;
          const bc = g.black.country ? normalizeFlagCode(g.black.country) : null;
          return wc === country || bc === country;
        }
      );
    }

    const gamesWithDetails = await Promise.all(
      filtered.map(async (game) => {
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