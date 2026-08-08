/**
 * Live Game Service
 * Unified service that combines multiple providers and provides normalized data
 */

import { lichessProvider, calculateCountryStatsFromGames as lichessCalcStats } from "./lichess-provider";
import { chessComProvider, calculateCountryStatsFromGames as chesscomCalcStats } from "./chesscom-provider";
import { 
  LiveChessGame, 
  LiveGameProvider, 
  FetchGamesOptions,
  GlobeStatistics,
  CountryGameData 
} from "./globe-types";

export type DataSource = "lichess" | "chesscom";

interface ProviderEntry {
  source: DataSource;
  provider: LiveGameProvider;
}

const PROVIDERS: ProviderEntry[] = [
  { source: "lichess", provider: lichessProvider },
  { source: "chesscom", provider: chessComProvider },
];

function getProvider(source: DataSource): LiveGameProvider {
  const entry = PROVIDERS.find((p) => p.source === source);
  if (!entry) throw new Error(`Unknown data source: ${source}`);
  return entry.provider;
}

export async function fetchLiveGames(
  source: DataSource,
  options: FetchGamesOptions = {}
): Promise<LiveChessGame[]> {
  const provider = getProvider(source);
  return provider.fetchGames(options);
}

export async function fetchGameDetails(
  source: DataSource,
  gameId: string
): Promise<LiveChessGame | null> {
  const provider = getProvider(source);
  return provider.fetchGameDetails(gameId);
}

export async function fetchAllSourcesGames(
  options: FetchGamesOptions = {}
): Promise<{ lichess: LiveChessGame[]; chesscom: LiveChessGame[] }> {
  const [lichess, chesscom] = await Promise.allSettled([
    fetchLiveGames("lichess", options),
    fetchLiveGames("chesscom", options),
  ]);

  return {
    lichess: lichess.status === "fulfilled" ? lichess.value : [],
    chesscom: chesscom.status === "fulfilled" ? chesscom.value : [],
  };
}

export function calculateStatistics(games: LiveChessGame[]): GlobeStatistics {
  if (games.length === 0) {
    return {
      gamesReceived: 0,
      uniquePlayers: 0,
      countriesRepresented: 0,
      ratingDistribution: [],
      timeControlDistribution: [],
      openings: [],
      averageRating: 0,
    };
  }

  const players = new Set<string>();
  const countries = new Set<string>();
  const ratings: number[] = [];
  const timeControls = new Map<string, number>();
  const openings = new Map<string, number>();

  for (const game of games) {
    for (const player of [game.white, game.black]) {
      players.add(player.name);
      countries.add(player.country);
      ratings.push(player.rating);
    }
    timeControls.set(game.timeControlCategory, (timeControls.get(game.timeControlCategory) || 0) + 1);
    openings.set(game.opening, (openings.get(game.opening) || 0) + 1);
  }

  const ratingRanges = [
    { range: "0-1000", min: 0, max: 1000 },
    { range: "1000-1400", min: 1000, max: 1400 },
    { range: "1400-1800", min: 1400, max: 1800 },
    { range: "1800-2200", min: 1800, max: 2200 },
    { range: "2200-2600", min: 2200, max: 2600 },
    { range: "2600+", min: 2600, max: Infinity },
  ];

  return {
    gamesReceived: games.length,
    uniquePlayers: players.size,
    countriesRepresented: countries.size,
    ratingDistribution: ratingRanges.map(({ range, min, max }) => ({
      range,
      count: ratings.filter(r => r >= min && r < max).length,
    })),
    timeControlDistribution: Array.from(timeControls.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    openings: Array.from(openings.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    averageRating: Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length),
  };
}

export async function calculateCountryStats(
  games: LiveChessGame[]
): Promise<CountryGameData[]> {
  return lichessCalcStats(games);
}