import { NextResponse } from "next/server";

import { evaluatePosition } from "@/lib/platform-service";
import { checkRateLimit } from "@/server/rate-limiter";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitResult = checkRateLimit(`evaluate:${ip}`, 30, 60_000);

  if (!rateLimitResult.allowed) {
    return NextResponse.json({ message: "Too many requests." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const data = await evaluatePosition(body);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Evaluation failed." },
      { status: 400 },
    );
  }
}
