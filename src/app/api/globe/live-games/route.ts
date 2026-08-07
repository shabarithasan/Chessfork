import { NextRequest, NextResponse } from "next/server";
import { fetchTvChannel, fetchGameOpening, type TvChannel, type LiveGame, parseTvChannelPgn, countryCoords, countryName, flagEmoji } from "@/lib/lichess-tv";

export const runtime = "edge";

const CHANNELS: TvChannel[] = ["bullet", "blitz", "rapid", "classical"];

async function fetchAllChannels(): Promise<LiveGame[]> {
  const results = await Promise.all(
    CHANNELS.map((channel) => fetchTvChannel(channel).catch(() => []))
  );
  return results.flat();
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const timeControl = searchParams.get("timeControl");
    const country = searchParams.get("country");
    const liveOnly = searchParams.get("liveOnly") !== "false";

    const allGames = await fetchAllChannels();

    let filtered = allGames;

    if (timeControl && timeControl !== "All") {
      const tcMap: Record<string, TvChannel> = {
        Bullet: "bullet",
        Blitz: "blitz",
        Rapid: "rapid",
        Classical: "classical",
      };
      const channel = tcMap[timeControl];
      if (channel) {
        filtered = filtered.filter((g) => g.speed === channel);
      }
    }

    if (liveOnly) {
      filtered = filtered.filter((g) => !g.finishedAt);
    }

    if (country) {
      filtered = filtered.filter(
        (g) => g.white.country === country || g.black.country === country
      );
    }

    const limited = filtered.slice(0, limit);

    const gamesWithDetails = await Promise.all(
      limited.map(async (game) => {
        const opening = await fetchGameOpening(game.id);
        return {
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
          opening: opening?.name || "Unknown Opening",
          moves: "",
        };
      })
    );

    return NextResponse.json({
      games: gamesWithDetails,
      total: filtered.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Failed to fetch live games:", error);
    return NextResponse.json(
      { error: "Failed to fetch live games" },
      { status: 500 }
    );
  }
}