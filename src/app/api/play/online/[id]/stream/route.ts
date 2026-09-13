import { NextResponse } from "next/server";
import Redis from "ioredis";
import { env, redisEnabled } from "@/server/env";
import { getDb } from "@/server/db/client";
import { matches } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!redisEnabled()) {
    return new NextResponse("Redis is required for multiplayer", { status: 503 });
  }

  const { id } = await context.params;

  const db = getDb();
  const [match] = await db.select().from(matches).where(eq(matches.id, id));

  if (!match) {
    return new NextResponse("Match not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      await redis.connect();
      await redis.subscribe(`match:${id}`);

      const connectMsg = `data: ${JSON.stringify({ type: 'connected', fen: match.fen, status: match.status })}\n\n`;
      controller.enqueue(encoder.encode(connectMsg));

      redis.on("message", (channel, message) => {
        if (channel === `match:${id}`) {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        }
      });

      const pingInterval = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        redis.quit();
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      redis.quit();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
