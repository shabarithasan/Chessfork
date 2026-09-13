import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { matches } from "@/server/db/schema";
import { redisEnabled } from "@/server/env";

export async function POST() {
  try {
    const db = getDb();
    
    // Generate random 6-character code (A-Z, 0-9)
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0 for readability
    let shortCode = '';
    for (let i = 0; i < 6; i++) {
      shortCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const [match] = await db.insert(matches)
      .values({
        shortCode,
        status: "waiting",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
      })
      .returning();

    return NextResponse.json({ id: match.id, shortCode: match.shortCode });
  } catch (error) {
    console.error("Failed to create match:", error);
    return NextResponse.json({ error: "Failed to create match" }, { status: 500 });
  }
}
