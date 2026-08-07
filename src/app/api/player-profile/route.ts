import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE = new Map<string, { avatarUrl: string | null; username: string; ts: number }>();
const TTL = 10 * 60 * 1000;

async function chessDotComProfile(username: string): Promise<{ avatarUrl: string | null; username: string } | null> {
  const normalized = username.replace(/\s+/g, "").toLowerCase();
  try {
    const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(normalized)}`, {
      headers: { "User-Agent": "Chessigma/1.0" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { avatar?: string; username?: string };
    if (!data.username) return null;
    let avatarUrl: string | null = null;
    if (data.avatar) {
      try {
        const u = new URL(data.avatar);
        avatarUrl = u.protocol === "https:" ? u.toString() : null;
      } catch { avatarUrl = null; }
    }
    return { avatarUrl, username: data.username };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username || typeof username !== "string") {
    return NextResponse.json({ message: "username parameter is required" }, { status: 400 });
  }

  const cached = CACHE.get(username.toLowerCase());
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached);
  }

  const profile = await chessDotComProfile(username);
  if (!profile) {
    return NextResponse.json({ avatarUrl: null, username, found: false });
  }

  const entry = { avatarUrl: profile.avatarUrl, username: profile.username, found: true };
  CACHE.set(username.toLowerCase(), { ...entry, ts: Date.now() });
  return NextResponse.json(entry);
}
