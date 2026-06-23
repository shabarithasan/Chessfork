import { NextResponse } from "next/server";

import { getLeaderboard } from "@/lib/platform-service";

export async function GET(_: Request, context: { params: Promise<{ type: string }> }) {
  const { type } = await context.params;
  if (type !== "puzzles" && type !== "brilliant") {
    return NextResponse.json({ message: "Unsupported leaderboard type." }, { status: 400 });
  }

  return NextResponse.json(await getLeaderboard(type));
}
