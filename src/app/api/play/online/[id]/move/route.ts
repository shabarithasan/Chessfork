import { NextResponse } from "next/server";
import Redis from "ioredis";
import { env, redisEnabled } from "@/server/env";
import { getDb } from "@/server/db/client";
import { matches } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { Chess } from "chess.js";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!redisEnabled()) {
    return NextResponse.json({ error: "Redis not enabled" }, { status: 503 });
  }

  const { id } = await context.params;
  
  try {
    const { fen, move, playerColor } = await req.json();

    if (!fen || !move || !playerColor) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getDb();

    // Verify match exists
    const [match] = await db.select().from(matches).where(eq(matches.id, id));

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // We can do an extra validation step here using chess.js to ensure the move is legal
    // against the DB's current FEN, but to avoid race conditions with fast play,
    // we'll primarily trust the client FEN and just persist it, validating if it's a valid board.
    
    let isGameOver = false;
    let status = match.status;

    try {
       const chess = new Chess(fen);
       if (chess.isGameOver()) {
          isGameOver = true;
          status = "finished";
       }
    } catch {
       return NextResponse.json({ error: "Invalid FEN" }, { status: 400 });
    }

    // Update match in DB
    await db.update(matches)
      .set({ fen, status })
      .where(eq(matches.id, id));

    // Publish to Redis
    const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    
    await redis.publish(
      `match:${id}`, 
      JSON.stringify({
        type: "move",
        fen,
        move,
        playerColor,
        isGameOver
      })
    );
    
    redis.quit();

    return NextResponse.json({ success: true, fen });
  } catch (error) {
    console.error("Move error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
