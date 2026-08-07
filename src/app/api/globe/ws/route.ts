import { NextRequest } from "next/server";

import { addClient, removeClient } from "@/lib/globe-sse";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      addClient(controller);

      const interval = setInterval(() => {
        try {
          controller.enqueue(
            `data: ${JSON.stringify({ type: "heartbeat", timestamp: Date.now() })}\n\n`,
          );
        } catch {
          clearInterval(interval);
          removeClient(controller);
        }
      }, 30000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        removeClient(controller);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}