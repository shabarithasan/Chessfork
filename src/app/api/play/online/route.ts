import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { matches } from "@/server/db/schema";
import { redisEnabled } from "@/server/env";

export async function POST() {
  try {
    const db = getDb();
    const [match] = await db.insert(matches)
      .values({
        status: "waiting",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
      })
      .returning();

    return NextResponse.json({ id: match.id });
  } catch (error) {
    console.error("Failed to create match:", error);
    return NextResponse.json({ error: "Failed to create match" }, { status: 500 });
  }
}
