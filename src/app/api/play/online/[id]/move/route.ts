import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { matches } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { Chess } from "chess.js";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  
  try {
    const { fen, pgn, move, playerColor } = await req.json();

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
      .set({ fen, pgn: pgn || "", status })
      .where(eq(matches.id, id));

    return NextResponse.json({ success: true, fen, pgn: pgn || "" });
  } catch (error) {
    console.error("Move error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
