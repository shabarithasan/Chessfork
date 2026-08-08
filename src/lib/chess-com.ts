export interface ChessComPlayer {
  username: string;
  rating: number;
  country: string;
  title?: string;
}

export interface ChessComGame {
  id: string;
  url: string;
  pgn: string;
  time_class: "bullet" | "blitz" | "rapid" | "daily";
  time_control: string;
  rules: string;
  white: ChessComPlayer & { result: string; rating: number; "@id": string };
  black: ChessComPlayer & { result: string; rating: number; "@id": string };
  start_time: number;
  end_time?: number;
}

export async function fetchChessComLiveGames(limit: number = 50): Promise<ChessComGame[]> {
  try {
    const response = await fetch("https://api.chess.com/pub/live", {
      headers: {
        Accept: "application/json",
        "User-Agent": "Chessfork/1.0",
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.games?.slice(0, limit) || [];
  } catch (error) {
    console.error("Failed to fetch Chess.com live games:", error);
    return [];
  }
}

export async function fetchChessComPlayer(username: string): Promise<{ country?: string } | null> {
  try {
    const response = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function parseChessComTimeControl(tc: string): { base: number; increment: number } {
  const parts = tc.split("+");
  return {
    base: parseInt(parts[0]) || 0,
    increment: parseInt(parts[1]) || 0,
  };
}

export function getTimeControlCategory(timeClass: string, timeControl: string): "Bullet" | "Blitz" | "Rapid" | "Classical" {
  if (timeClass === "bullet") return "Bullet";
  if (timeClass === "blitz") return "Blitz";
  if (timeClass === "rapid") return "Rapid";
  if (timeClass === "daily") return "Classical";
  const { base } = parseChessComTimeControl(timeControl);
  if (base < 180) return "Bullet";
  if (base < 600) return "Blitz";
  if (base < 1800) return "Rapid";
  return "Classical";
}