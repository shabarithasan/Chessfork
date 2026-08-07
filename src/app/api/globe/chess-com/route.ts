import { NextRequest, NextResponse } from "next/server";
import { fetchChessComLiveGames, fetchChessComPlayer, getTimeControlCategory, type ChessComGame } from "@/lib/chess-com";

export const runtime = "edge";

const COUNTRY_COORDS: Record<string, [number, number]> = {
  US: [37.1, -95.7], IN: [21.1, 78.7], RU: [61.5, 105.3], CN: [35.9, 104.2],
  DE: [51.2, 10.4], FR: [46.2, 2.2], GB: [52.5, -1.8], BR: [-14.2, -51.9],
  JP: [36.2, 138.3], ES: [40.2, -3.7], IT: [42.8, 12.8], CA: [56.1, -106.3],
  SE: [60.1, 18.6], NO: [60.5, 8.5], PL: [52.1, 19.4], UA: [49.0, 31.4],
  NL: [52.1, 5.3], AR: [-34.0, -64.0], AU: [-25.0, 134.0], KR: [36.5, 127.8],
};

function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return "";
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(0x1f1a5 + char.charCodeAt(0)));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const timeControl = searchParams.get("timeControl");
    const country = searchParams.get("country");
    const liveOnly = searchParams.get("liveOnly") !== "false";

    const games = await fetchChessComLiveGames(limit * 2);

    let filtered = games;

    if (timeControl && timeControl !== "All") {
      filtered = filtered.filter((g) => getTimeControlCategory(g.time_class, g.time_control) === timeControl);
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
        const [whiteProfile, blackProfile] = await Promise.all([
          fetchChessComPlayer(game.white.username),
          fetchChessComPlayer(game.black.username),
        ]);

        return {
          id: game.id,
          speed: game.time_class,
          timeControl: game.time_control,
          white: {
            name: game.white.username,
            rating: game.white.rating,
            country: whiteProfile?.country || game.white.country,
            countryName: whiteProfile?.country ? COUNTRY_COORDS[whiteProfile.country] ? "Unknown" : whiteProfile.country : "Unknown",
            flag: whiteProfile?.country ? flagEmoji(whiteProfile.country) : "",
          },
          black: {
            name: game.black.username,
            rating: game.black.rating,
            country: blackProfile?.country || game.black.country,
            countryName: blackProfile?.country ? COUNTRY_COORDS[blackProfile.country] ? "Unknown" : blackProfile.country : "Unknown",
            flag: blackProfile?.country ? flagEmoji(blackProfile.country) : "",
          },
          startedAt: game.start_time * 1000,
          finishedAt: game.end_time ? game.end_time * 1000 : undefined,
          status: game.end_time ? "finished" : "playing",
          opening: "Chess.com Game",
          moves: game.pgn.split("\n").slice(-1)[0] || "",
        };
      })
    );

    return NextResponse.json({
      games: gamesWithDetails,
      total: filtered.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Failed to fetch Chess.com live games:", error);
    return NextResponse.json(
      { error: "Failed to fetch Chess.com live games" },
      { status: 500 }
    );
  }
}