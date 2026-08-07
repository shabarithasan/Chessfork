import { NextRequest, NextResponse } from "next/server";
import { fetchTvChannel, type TvChannel, type LiveGame as TvGame } from "@/lib/lichess-tv";
import { fetchChessComLiveGames } from "@/lib/chess-com";
import { notifyNewGame } from "@/lib/globe-sse";
import { countryCoords, countryName, flagEmoji } from "@/lib/lichess-tv";

export const runtime = "edge";

const CHANNELS: TvChannel[] = ["bullet", "blitz", "rapid", "classical"];

async function fetchAllChannels(): Promise<TvGame[]> {
  const results = await Promise.all(
    CHANNELS.map((channel) => fetchTvChannel(channel).catch(() => []))
  );
  return results.flat();
}

const seenGames = new Set<string>();

function generateGameId(source: string, id: string): string {
  return `${source}:${id}`;
}

async function fetchAndBroadcastLichess() {
  try {
    const games = await fetchAllChannels();
    let newCount = 0;

    for (const game of games) {
      const gameId = generateGameId("lichess", game.id);
      if (seenGames.has(gameId)) continue;
      seenGames.add(gameId);

      const fromCoords = countryCoords(game.white.country || "");
      const toCoords = countryCoords(game.black.country || "");

      if (!fromCoords || !toCoords) continue;

      const payload = {
        id: game.id,
        speed: game.speed,
        timeControl: game.speed,
        white: {
          name: game.white.name,
          rating: game.white.rating,
          country: game.white.country,
          countryName: game.white.country ? countryName(game.white.country) : "Unknown",
          flag: game.white.country ? flagEmoji(game.white.country) : "",
        },
        black: {
          name: game.black.name,
          rating: game.black.rating,
          country: game.black.country,
          countryName: game.black.country ? countryName(game.black.country) : "Unknown",
          flag: game.black.country ? flagEmoji(game.black.country) : "",
        },
        startedAt: game.startedAt,
        finishedAt: game.finishedAt,
        status: game.finishedAt ? "finished" : "playing",
        opening: "Lichess Game",
        moves: "",
      };

      notifyNewGame(payload);
      newCount++;
    }

    return newCount;
  } catch (error) {
    console.error("Failed to fetch Lichess games:", error);
    return 0;
  }
}

async function fetchAndBroadcastChessCom() {
  try {
    const games = await fetchChessComLiveGames(50);
    let newCount = 0;

    for (const game of games) {
      const gameId = generateGameId("chesscom", game.id);
      if (seenGames.has(gameId)) continue;
      seenGames.add(gameId);

      const fromCoords = countryCoords(game.white.country);
      const toCoords = countryCoords(game.black.country);

      if (!fromCoords || !toCoords) continue;

      const payload = {
        id: game.id,
        speed: game.time_class,
        timeControl: game.time_control,
        white: {
          name: game.white.username,
          rating: game.white.rating,
          country: game.white.country,
          countryName: game.white.country ? "Unknown" : "Unknown",
          flag: game.white.country ? flagEmoji(game.white.country) : "",
        },
        black: {
          name: game.black.username,
          rating: game.black.rating,
          country: game.black.country,
          countryName: game.black.country ? "Unknown" : "Unknown",
          flag: game.black.country ? flagEmoji(game.black.country) : "",
        },
        startedAt: game.start_time * 1000,
        finishedAt: game.end_time ? game.end_time * 1000 : undefined,
        status: game.end_time ? "finished" : "playing",
        opening: "Chess.com Game",
        moves: game.pgn.split("\n").slice(-1)[0] || "",
      };

      notifyNewGame(payload);
      newCount++;
    }

    return newCount;
  } catch (error) {
    console.error("Failed to fetch Chess.com games:", error);
    return 0;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const source = searchParams.get("source") || "both";

  const results: Record<string, number> = {};

  if (source === "lichess" || source === "both") {
    results.lichess = await fetchAndBroadcastLichess();
  }

  if (source === "chesscom" || source === "both") {
    results.chesscom = await fetchAndBroadcastChessCom();
  }

  return NextResponse.json({
    success: true,
    newGames: results,
    timestamp: Date.now(),
  });
}