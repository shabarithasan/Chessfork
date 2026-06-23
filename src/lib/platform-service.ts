import { z } from "zod";

import { readHeaders } from "@/lib/chess/pgn";
import { buildGameLoadingPreview } from "@/lib/chess/pgn-preview";
import { buildCoachSnapshot } from "@/lib/chess/training";
import { calculateRatingChange } from "@/lib/chess/rating";
import {
  baseAnalysis,
  sampleCoachSnapshot,
  samplePgn,
} from "@/data/sample-data";
import { enqueueAnalysisRun } from "@/server/queue/analysis-queue";
import { analyzePgnWithBestEngine, createPositionEvaluationWithBestEngine, type MoveAnalysisProgress } from "@/server/chess/stockfish-report";
import { findAnalysisRunById, listAnalysisRuns, persistAnalysisRun } from "@/server/repositories/analysis-repository";
import { persistCoachSnapshot } from "@/server/repositories/coach-repository";
import { listLeaderboardEntries } from "@/server/repositories/leaderboard-repository";
import { findPuzzleById, listPuzzles, recordPuzzleAttempt } from "@/server/repositories/puzzle-repository";
import { hashString } from "@/lib/utils";
import type {
  ImportGameLibraryResponse,
  ImportGameOutcome,
  ImportGameResultFilter,
  ImportablePlayerProfile,
  ImportableGameOption,
  UserAccount,
} from "@/types/platform";

const analysisRequestSchema = z.object({
  pgn: z.string().min(10),
  requestedDepth: z.enum(["quick", "deep"]).default("quick"),
});

const importRequestSchema = z.object({
  username: z.string().min(2),
  requestedDepth: z.enum(["quick", "deep"]).default("quick"),
  intent: z.enum(["list", "analyze"]).default("analyze"),
  archiveUrl: z.string().url().optional(),
  gameId: z.string().min(1).optional(),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(48).default(24),
  search: z.string().max(120).optional(),
  result: z.enum(["all", "win", "loss", "draw"]).default("all"),
  timeClass: z.string().max(32).optional(),
});

const puzzleAttemptSchema = z.object({
  puzzleId: z.string().min(1),
  move: z.string().min(1),
  elapsedMs: z.number().int().nonnegative().default(0),
});

const coachChatSchema = z.object({
  prompt: z.string().min(3),
});

export async function runAnalysisFromPgn(
  input: unknown,
  viewer?: Pick<UserAccount, "id"> | null,
  options?: {
    onMoveAnalyzed?: (progress: MoveAnalysisProgress) => Promise<void> | void;
  },
) {
  const payload = analysisRequestSchema.parse(input);
  const run = await analyzePgnWithBestEngine(payload.pgn, {
    onMoveAnalyzed: options?.onMoveAnalyzed,
    requestedDepth: payload.requestedDepth,
    source: "pgn",
  });
  await persistAnalysisRun(run, "pgn", viewer?.id);

  if (payload.requestedDepth === "deep") {
    await enqueueAnalysisRun({
      analysisId: run.id,
      pgn: payload.pgn,
      depth: payload.requestedDepth,
      source: "pgn",
    });
  }

  return {
    analysisId: run.id,
    shareUrl: `/analysis/${run.id}`,
    message:
      payload.requestedDepth === "deep"
        ? "Deep report created. When Redis is configured, a worker refinement pass is also queued."
        : "Quick analysis completed.",
    report: run,
  };
}

type ChessComArchiveResponse = {
  archives?: string[];
};

type ChessComApiGame = {
  black?: {
    result?: string;
    rating?: number;
    username?: string;
  };
  eco?: string;
  end_time?: number;
  pgn?: string;
  rated?: boolean;
  rules?: string;
  time_class?: string;
  time_control?: string;
  url?: string;
  uuid?: string;
  white?: {
    result?: string;
    rating?: number;
    username?: string;
  };
};

type ChessComGamesResponse = {
  games?: ChessComApiGame[];
};

type ChessComPlayerProfileResponse = {
  avatar?: string;
  country?: string;
  username?: string;
};

const CHESSCOM_CACHE_TTL_MS = 60 * 1000;
const CHESSCOM_PROFILE_CACHE_TTL_MS = 10 * 60 * 1000;
const globalForPlatformCache = globalThis as typeof globalThis & {
  __knightowlChessComGameCache?: Map<string, { expiresAt: number; games: ImportableGameOption[] }>;
  __knightowlChessComProfileCache?: Map<string, { expiresAt: number; profile: ImportablePlayerProfile | null }>;
};

function getChessComGameCache() {
  if (!globalForPlatformCache.__knightowlChessComGameCache) {
    globalForPlatformCache.__knightowlChessComGameCache = new Map();
  }

  return globalForPlatformCache.__knightowlChessComGameCache;
}

function getChessComProfileCache() {
  if (!globalForPlatformCache.__knightowlChessComProfileCache) {
    globalForPlatformCache.__knightowlChessComProfileCache = new Map();
  }

  return globalForPlatformCache.__knightowlChessComProfileCache;
}

function chessComHeaders() {
  return {
    "User-Agent": "Chessfork/0.1 (+https://chessfork.app)",
  };
}

function formatChessComDate(input?: string) {
  return input ? input.replaceAll(".", "-") : "Unknown date";
}

function formatChessComResult(game: ChessComApiGame, headers: Record<string, string>) {
  if (headers.Result) {
    return headers.Result;
  }

  if (game.white?.result === "win") {
    return "1-0";
  }

  if (game.black?.result === "win") {
    return "0-1";
  }

  return "1/2-1/2";
}

function createChessComGameId(game: ChessComApiGame, archiveUrl: string) {
  return game.uuid ?? game.url ?? hashString(`${archiveUrl}:${game.end_time ?? ""}:${game.white?.username ?? ""}:${game.black?.username ?? ""}`);
}

function parseChessComEndedAt(headers: Record<string, string>, game: ChessComApiGame) {
  if (typeof game.end_time === "number") {
    return new Date(game.end_time * 1000).toISOString();
  }

  const headerDate = headers.EndDate ?? headers.UTCDate ?? headers.Date;
  const headerTime = headers.EndTime ?? headers.UTCTime ?? headers.StartTime;

  if (!headerDate) {
    return undefined;
  }

  const normalizedDate = headerDate.replaceAll(".", "-");
  const normalizedTime = headerTime ?? "00:00:00";
  const parsed = new Date(`${normalizedDate}T${normalizedTime}Z`);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function chessComSortValue(game: Pick<ImportableGameOption, "endedAt" | "playedAt">) {
  if (game.endedAt) {
    const precise = Date.parse(game.endedAt);
    if (!Number.isNaN(precise)) {
      return precise;
    }
  }

  const fallback = Date.parse(game.playedAt);
  return Number.isNaN(fallback) ? 0 : fallback;
}

function chessComOutcome(result: string, playerColor: "white" | "black"): ImportGameOutcome {
  if (result === "1/2-1/2") {
    return "draw";
  }

  if ((result === "1-0" && playerColor === "white") || (result === "0-1" && playerColor === "black")) {
    return "win";
  }

  return "loss";
}

function normalizeChessComUsername(username: string) {
  return username.trim().toLowerCase();
}

function extractCountryCode(countryUrl?: string) {
  if (!countryUrl) {
    return undefined;
  }

  const code = countryUrl.split("/").filter(Boolean).at(-1)?.toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : undefined;
}

function countryNameForCode(code?: string) {
  if (!code) {
    return undefined;
  }

  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function normalizeAvatarUrl(avatarUrl?: string) {
  if (!avatarUrl) {
    return undefined;
  }

  try {
    const parsed = new URL(avatarUrl);
    return parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

async function fetchChessComPlayerProfile(username: string): Promise<ImportablePlayerProfile | null> {
  const normalizedUsername = normalizeChessComUsername(username);

  if (!normalizedUsername) {
    return null;
  }

  const profileResponse = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(normalizedUsername)}`, {
    headers: chessComHeaders(),
    next: { revalidate: 0 },
  });

  if (!profileResponse.ok) {
    return null;
  }

  const profile = (await profileResponse.json()) as ChessComPlayerProfileResponse;
  const countryCode = extractCountryCode(profile.country);

  return {
    avatarUrl: normalizeAvatarUrl(profile.avatar),
    countryCode,
    countryName: countryNameForCode(countryCode),
    username: profile.username ?? username,
  };
}

async function getCachedChessComPlayerProfile(username: string) {
  const normalizedUsername = normalizeChessComUsername(username);

  if (!normalizedUsername) {
    return null;
  }

  const cache = getChessComProfileCache();
  const cached = cache.get(normalizedUsername);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.profile;
  }

  const profile = await fetchChessComPlayerProfile(normalizedUsername);
  cache.set(normalizedUsername, {
    expiresAt: Date.now() + CHESSCOM_PROFILE_CACHE_TTL_MS,
    profile,
  });

  return profile;
}

async function enrichChessComGamesWithProfiles(games: ImportableGameOption[]) {
  const usernames = [
    ...new Set(
      games
        .flatMap((game) => [game.white, game.black])
        .map((username) => normalizeChessComUsername(username))
        .filter(Boolean),
    ),
  ];
  const profileEntries = await Promise.all(
    usernames.map(async (username) => [username, await getCachedChessComPlayerProfile(username)] as const),
  );
  const profilesByUsername = new Map(profileEntries);

  return games.map((game) => ({
    ...game,
    blackProfile: profilesByUsername.get(normalizeChessComUsername(game.black)) ?? undefined,
    whiteProfile: profilesByUsername.get(normalizeChessComUsername(game.white)) ?? undefined,
  }));
}

function summarizeChessComGame(game: ChessComApiGame, archiveUrl: string, username: string): ImportableGameOption | null {
  if (game.rules && game.rules !== "chess") {
    return null;
  }

  if (!game.pgn) {
    return null;
  }

  const headers = readHeaders(game.pgn);
  const playedAt =
    headers.EndDate
      ? formatChessComDate(headers.EndDate)
      : headers.Date
        ? formatChessComDate(headers.Date)
        : game.end_time
          ? new Date(game.end_time * 1000).toISOString().slice(0, 10)
          : "Unknown date";
  const white = headers.White ?? game.white?.username ?? "White";
  const black = headers.Black ?? game.black?.username ?? "Black";
  const normalizedUsername = username.trim().toLowerCase();
  const playerColor = white.toLowerCase() === normalizedUsername ? "white" : "black";
  const result = formatChessComResult(game, headers);
  const endedAt = parseChessComEndedAt(headers, game);
  const preview = buildGameLoadingPreview(game.pgn);

  return {
    id: createChessComGameId(game, archiveUrl),
    source: "chesscom",
    white,
    black,
    opponent: playerColor === "white" ? black : white,
    playerColor,
    outcome: chessComOutcome(result, playerColor),
    result,
    playedAt,
    endedAt,
    timeControl: headers.TimeControl ?? game.time_control ?? "Unknown",
    timeClass: game.time_class,
    eco: headers.ECO,
    openingName: headers.Opening,
    archiveUrl,
    url: headers.Link ?? game.url,
    rated: game.rated,
    whiteRating: game.white?.rating,
    blackRating: game.black?.rating,
    ...preview,
  };
}

async function fetchChessComArchives(username: string) {
  const archivesResponse = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`, {
    headers: chessComHeaders(),
    next: { revalidate: 0 },
  });

  if (!archivesResponse.ok) {
    throw new Error("Unable to fetch Chess.com archives");
  }

  const archives = (await archivesResponse.json()) as ChessComArchiveResponse;
  return archives.archives ?? [];
}

async function fetchChessComArchiveGames(archiveUrl: string) {
  const gamesResponse = await fetch(archiveUrl, {
    headers: chessComHeaders(),
    next: { revalidate: 0 },
  });

  if (!gamesResponse.ok) {
    throw new Error("Unable to fetch Chess.com games");
  }

  const games = (await gamesResponse.json()) as ChessComGamesResponse;
  return games.games ?? [];
}

async function fetchChessComPgn(username: string) {
  const archives = await fetchChessComArchives(username);
  const latestArchive = archives.at(-1);
  if (!latestArchive) {
    throw new Error("No public Chess.com archives found");
  }

  const games = await fetchChessComArchiveGames(latestArchive);
  const latestGame = [...games]
    .filter((game) => Boolean(game.pgn))
    .sort((left, right) => (right.end_time ?? 0) - (left.end_time ?? 0))[0];

  return latestGame?.pgn;
}

async function getAllChessComGames(username: string) {
  const archives = await fetchChessComArchives(username);
  if (archives.length === 0) {
    throw new Error("No public Chess.com archives found");
  }

  const archiveUrls = [...archives].reverse();
  const archiveEntries: Array<{ archiveUrl: string; game: ChessComApiGame }> = [];
  const concurrency = 6;

  for (let index = 0; index < archiveUrls.length; index += concurrency) {
    const archiveChunk = archiveUrls.slice(index, index + concurrency);
    const chunkResponses = await Promise.all(
      archiveChunk.map(async (archiveUrl) => ({
        archiveUrl,
        games: await fetchChessComArchiveGames(archiveUrl),
      })),
    );

    for (const response of chunkResponses) {
      archiveEntries.push(...response.games.map((game) => ({ archiveUrl: response.archiveUrl, game })));
    }
  }

  return archiveEntries
    .map(({ archiveUrl, game }) => summarizeChessComGame(game, archiveUrl, username))
    .filter((game): game is ImportableGameOption => Boolean(game))
    .sort((left, right) => chessComSortValue(right) - chessComSortValue(left));
}

async function getCachedChessComGames(username: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const cache = getChessComGameCache();
  const cached = cache.get(normalizedUsername);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.games;
  }

  const games = await getAllChessComGames(username);
  cache.set(normalizedUsername, {
    expiresAt: Date.now() + CHESSCOM_CACHE_TTL_MS,
    games,
  });

  return games;
}

function buildChessComLibraryStats(games: ImportableGameOption[]) {
  const timeClassSet = new Set<string>();
  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (const game of games) {
    if (game.outcome === "win") {
      wins += 1;
    } else if (game.outcome === "loss") {
      losses += 1;
    } else {
      draws += 1;
    }

    if (game.timeClass) {
      timeClassSet.add(game.timeClass);
    }
  }

  return {
    totalGames: games.length,
    wins,
    losses,
    draws,
    timeClasses: [...timeClassSet].sort(),
  };
}

async function listChessComGames(params: {
  page: number;
  pageSize: number;
  result: ImportGameResultFilter;
  search?: string;
  timeClass?: string;
  username: string;
}): Promise<ImportGameLibraryResponse> {
  const allGames = await getCachedChessComGames(params.username);
  const filters = {
    search: params.search?.trim() ?? "",
    result: params.result,
    timeClass: params.timeClass?.trim() ? params.timeClass.trim() : "all",
  };
  const normalizedSearch = filters.search.toLowerCase();
  const filteredGames = allGames.filter((game) => {
    if (filters.result !== "all" && game.outcome !== filters.result) {
      return false;
    }

    if (filters.timeClass !== "all" && game.timeClass !== filters.timeClass) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [game.white, game.black, game.opponent, game.eco, game.openingName, game.playedAt]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  const start = params.page * params.pageSize;
  const games = await enrichChessComGamesWithProfiles(filteredGames.slice(start, start + params.pageSize));
  const shownCount = Math.min(start + games.length, filteredGames.length);
  const stats = buildChessComLibraryStats(allGames);

  return {
    source: "chesscom",
    username: params.username,
    games,
    page: params.page,
    pageSize: params.pageSize,
    filteredCount: filteredGames.length,
    hasMore: start + games.length < filteredGames.length,
    filters,
    stats,
    message:
      filteredGames.length > 0
        ? `Loaded ${shownCount} of ${filteredGames.length} matching public Chess.com games for ${params.username}.`
        : `No public Chess.com games matched these filters for ${params.username}.`,
  };
}

async function fetchChessComSelectedGamePgn(gameId: string, archiveUrl: string) {
  const games = await fetchChessComArchiveGames(archiveUrl);
  const selectedGame = games.find((game) => createChessComGameId(game, archiveUrl) === gameId);

  if (!selectedGame?.pgn) {
    throw new Error("Unable to locate the selected Chess.com game");
  }

  return selectedGame.pgn;
}

async function fetchLichessPgn(username: string) {
  const response = await fetch(
    `https://lichess.org/api/games/user/${username}?max=1&moves=true&pgnInJson=true&opening=true`,
    {
      headers: {
        Accept: "application/x-ndjson",
      },
      next: { revalidate: 0 },
    },
  );

  if (!response.ok) {
    throw new Error("Unable to fetch Lichess games");
  }

  const text = await response.text();
  const firstLine = text.trim().split("\n")[0];
  if (!firstLine) {
    throw new Error("No public Lichess games found");
  }

  const parsed = JSON.parse(firstLine) as { pgn?: string };
  return parsed.pgn;
}

export async function importFromSource(
  source: "chesscom" | "lichess",
  input: unknown,
  viewer?: Pick<UserAccount, "id"> | null,
) {
  const payload = importRequestSchema.parse(input);

  if (source === "chesscom" && payload.intent === "list") {
    return listChessComGames({
      username: payload.username,
      page: payload.page,
      pageSize: payload.pageSize,
      search: payload.search,
      result: payload.result,
      timeClass: payload.timeClass,
    });
  }

  let pgn = samplePgn;
  let liveImport = false;

  try {
    pgn =
      source === "chesscom"
        ? payload.gameId && payload.archiveUrl
          ? await fetchChessComSelectedGamePgn(payload.gameId, payload.archiveUrl)
          : ((await fetchChessComPgn(payload.username)) ?? samplePgn)
        : ((await fetchLichessPgn(payload.username)) ?? samplePgn);
    liveImport = true;
  } catch (error) {
    if (source === "chesscom" && payload.gameId) {
      throw error;
    }

    pgn = samplePgn;
  }

  const run = await analyzePgnWithBestEngine(pgn, {
    requestedDepth: payload.requestedDepth,
    subject: payload.username,
    source,
  });
  await persistAnalysisRun(run, source, viewer?.id);

  if (payload.requestedDepth === "deep") {
    await enqueueAnalysisRun({
      analysisId: run.id,
      pgn,
      depth: payload.requestedDepth,
      source,
    });
  }

  return {
    analysisId: run.id,
    shareUrl: `/analysis/${run.id}`,
    source,
    message: liveImport
      ? source === "chesscom" && payload.gameId
        ? `Imported the selected public Chess.com game for ${payload.username}.`
        : `Imported ${payload.username}'s latest public ${source === "chesscom" ? "Chess.com" : "Lichess"} game.`
      : `Live ${source} import fell back to the bundled sample because no public game was reachable.`,
    report: run,
  };
}

export async function getAnalysisResponse(id: string) {
  return findAnalysisRunById(id);
}

export async function listAnalysisResponses(userId?: string) {
  return listAnalysisRuns(userId);
}

export async function evaluatePosition(input: unknown) {
  const payload = z
    .object({
      fen: z.string().min(10),
      requestedDepth: z.enum(["quick", "deep"]).default("quick"),
    })
    .parse(input);

  return createPositionEvaluationWithBestEngine(payload.fen, payload.requestedDepth);
}

export async function attemptPuzzle(input: unknown, viewer?: Pick<UserAccount, "id"> | null) {
  const payload = puzzleAttemptSchema.parse(input);
  const puzzle = await findPuzzleById(payload.puzzleId);
  if (!puzzle) {
    throw new Error("Puzzle not found");
  }

  const normalizedGuess = payload.move.replace(/\s+/g, "");
  const normalizedSolution = puzzle.solution[0].replace(/\s+/g, "");
  const correct = normalizedGuess.toLowerCase() === normalizedSolution.toLowerCase();
  const newRating = 1500 + calculateRatingChange({
    playerRating: 1500,
    opponentRating: puzzle.rating,
    result: correct ? 1 : 0,
    kFactor: 16,
  });
  await recordPuzzleAttempt({
    puzzleId: puzzle.id,
    userId: viewer?.id,
    correct,
    elapsedMs: payload.elapsedMs,
    ratingAfter: newRating,
  });

  return {
    correct,
    newRating,
    message: correct
      ? "Correct. This tactic would be added to your spaced-repetition queue."
      : `Not quite. The training loop would resurface ${puzzle.solution[0]} later.`,
  };
}

export async function getLeaderboard(type: "puzzles" | "brilliant") {
  return listLeaderboardEntries(type);
}

export async function getPuzzles() {
  return listPuzzles();
}

export async function createCoachReport(viewer?: Pick<UserAccount, "id" | "displayName"> | null) {
  const scopedRuns = await listAnalysisRuns(viewer?.id);
  const snapshot = buildCoachSnapshot(
    viewer?.displayName ?? baseAnalysis.white,
    scopedRuns.length > 0 ? scopedRuns : [baseAnalysis],
  );
  await persistCoachSnapshot(snapshot, viewer?.id);
  return {
    report: snapshot,
    reportId: snapshot.id,
    shareUrl: `/coach/report/${snapshot.id}`,
  };
}

export async function respondAsCoach(input: unknown) {
  const payload = coachChatSchema.parse(input);
  const heuristics = [
    "Review your last three critical moments and sort them into blunder, discipline, or conversion buckets.",
    "Run a 15-minute block: 5 minutes of calculation, 5 minutes of conversion drills, 5 minutes of blunder replay.",
    "If you keep losing winning positions, your next module should emphasize simplification triggers rather than new openings.",
  ];

  return {
    reply: `${sampleCoachSnapshot.summary} ${heuristics[payload.prompt.length % heuristics.length]}`,
  };
}
