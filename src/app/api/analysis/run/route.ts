import { NextResponse } from "next/server";
import { z } from "zod";

import { runAnalysisFromPgn } from "@/lib/platform-service";
import { getCurrentUser } from "@/server/auth/session";
import { checkRateLimit } from "@/server/rate-limiter";

const analysisRunSchema = z.object({
  pgn: z.string().min(10),
  requestedDepth: z.enum(["quick", "deep"]).default("quick"),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitResult = checkRateLimit(`analysis-run:${ip}`, 15, 60_000);

  if (!rateLimitResult.allowed) {
    return NextResponse.json({ message: "Too many requests." }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = analysisRunSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = await runAnalysisFromPgn(parsed.data, await getCurrentUser());
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Analysis failed." },
      { status: 400 },
    );
  }
}
