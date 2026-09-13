import { NextResponse } from "next/server";

import { persistAnalysisRun } from "@/server/repositories/analysis-repository";
import { awardUserXp } from "@/server/repositories/user-repository";
import { XP_AWARDS } from "@/lib/progression";
import { getCurrentUser } from "@/server/auth/session";
import { checkRateLimit } from "@/server/rate-limiter";
import type { AnalysisRun } from "@/types/platform";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitResult = checkRateLimit(`analysis-save:${ip}`, 30, 60_000);

  if (!rateLimitResult.allowed) {
    return NextResponse.json({ message: "Too many requests." }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => null);
    
    if (!body || !body.id || !body.pgn || !Array.isArray(body.evaluations)) {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    const run = body as AnalysisRun;
    const user = await getCurrentUser();
    await persistAnalysisRun(run, run.source ?? "pgn", user?.id);

    if (user) {
      await awardUserXp(user.id, XP_AWARDS.ANALYZE_GAME, "gamesAnalyzed").catch(console.error);
    }

    return NextResponse.json({ success: true, id: run.id });
  } catch (error) {
    console.error("[api/analysis/save]", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Save failed." },
      { status: 500 },
    );
  }
}
