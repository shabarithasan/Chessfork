import { NextRequest, NextResponse } from "next/server";
import { fetchAllSourcesGames } from "@/lib/live-game-service";
import { calculateStatistics, calculateCountryStats } from "@/lib/live-game-service";
import { notifyNewGame, getClientCount } from "@/lib/globe-sse";

export const runtime = "edge";

const seenGames = new Set<string>();

function generateGameId(source: string, id: string): string {
  return `${source}:${id}`;
}

async function fetchAndBroadcast(source: "lichess" | "chesscom"): Promise<number> {
  try {
    const provider = source === "lichess" 
      ? (await import("@/lib/lichess-provider")).lichessProvider
      : (await import("@/lib/chesscom-provider")).chessComProvider;
    
    const games = await provider.fetchGames({ limit: 100, liveOnly: true });
    let newCount = 0;

    for (const game of games) {
      const gameId = generateGameId(source, game.id);
      if (seenGames.has(gameId)) continue;
      seenGames.add(gameId);

      notifyNewGame({ ...game, source });
      newCount++;
    }

    return newCount;
  } catch (error) {
    console.error(`Failed to fetch ${source} games:`, error);
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
    results.lichess = await fetchAndBroadcast("lichess");
  }

  if (source === "chesscom" || source === "both") {
    results.chesscom = await fetchAndBroadcast("chesscom");
  }

  return NextResponse.json({
    success: true,
    newGames: results,
    connectedClients: getClientCount(),
    timestamp: Date.now(),
  });
}