import { NextRequest, NextResponse } from "next/server";
import { fetchLiveGames, calculateStatistics, calculateCountryStats } from "@/lib/live-game-service";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const timeControl = searchParams.get("timeControl") || "All";
    const country = searchParams.get("country") || undefined;
    const liveOnly = searchParams.get("liveOnly") !== "false";

    const games = await fetchLiveGames("lichess", {
      limit,
      timeControl: timeControl as "Bullet" | "Blitz" | "Rapid" | "Classical" | "All",
      liveOnly,
      country,
    });

    const statistics = calculateStatistics(games);
    const countryStats = await calculateCountryStats(games);

    return NextResponse.json({
      games,
      statistics,
      countryStats,
      total: games.length,
      timestamp: Date.now(),
      source: "lichess",
    });
  } catch (error) {
    console.error("Failed to fetch Lichess live games:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch Lichess games",
        details: error instanceof Error ? error.message : "Unknown error",
        games: [],
        statistics: null,
        countryStats: [],
        total: 0,
        timestamp: Date.now(),
        source: "lichess",
      },
      { status: 500 }
    );
  }
}