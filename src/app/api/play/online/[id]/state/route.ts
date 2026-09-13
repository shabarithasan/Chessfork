import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { matches } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const db = getDb();
  const [match] = await db.select().from(matches).where(eq(matches.id, id));

  if (!match) {
    return new NextResponse("Match not found", { status: 404 });
  }

  return NextResponse.json({
    id: match.id,
    fen: match.fen,
    status: match.status,
    whitePlayer: match.whitePlayer,
    blackPlayer: match.blackPlayer
  });
}
