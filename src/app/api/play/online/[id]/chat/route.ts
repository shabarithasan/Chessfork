import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { matches } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  
  try {
    const { text, playerColor } = await req.json();

    if (!text || !playerColor) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getDb();

    // Verify match exists
    const [match] = await db.select().from(matches).where(eq(matches.id, id));

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const newMessage = {
      sender: playerColor,
      text,
      timestamp: new Date().toISOString()
    };

    // Append to JSONB array
    const currentChat = Array.isArray(match.chat) ? match.chat : [];
    const updatedChat = [...currentChat, newMessage];

    await db.update(matches)
      .set({ chat: updatedChat })
      .where(eq(matches.id, id));

    return NextResponse.json({ success: true, chat: updatedChat });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
