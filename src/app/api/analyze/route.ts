import { NextResponse } from "next/server";
import { z } from "zod";

import { winProbabilityFromCentipawns } from "@/lib/chess/rating";
import { runAnalysisFromPgn } from "@/lib/platform-service";
import { getCurrentUser } from "@/server/auth/session";
import { checkRateLimit } from "@/server/rate-limiter";
import type { AnalysisRun, MoveGrade } from "@/types/platform";

const moveGrades: MoveGrade[] = ["Brilliant", "Great", "Best", "Excellent", "Good", "Book", "Inaccuracy", "Mistake", "Blunder"];

const analyzeRequestSchema = z.object({
  pgn: z.string().min(10),
  mode: z.enum(["quick", "deep"]).default("quick"),
});

function buildChartData(report: AnalysisRun) {
  return report.moveEvaluations.map((move) => ({
    move: `${move.moveNumber}${move.side === "white" ? "." : "..."} ${move.san}`,
    ply: move.ply,
    winProbability: Math.round(winProbabilityFromCentipawns(move.score) * 100),
  }));
}

function buildMoveStatistics(report: AnalysisRun) {
  const emptyCounts = () => Object.fromEntries(moveGrades.map((grade) => [grade, 0])) as Record<MoveGrade, number>;
  const stats = {
    black: emptyCounts(),
    white: emptyCounts(),
  };

  for (const move of report.moveEvaluations) {
    stats[move.side][move.grade] += 1;
  }

  return stats;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitResult = checkRateLimit(`analyze:${ip}`, 10, 60_000);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please wait before sending another analysis." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = analyzeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = await runAnalysisFromPgn(
      {
        pgn: parsed.data.pgn,
        requestedDepth: parsed.data.mode,
      },
      await getCurrentUser(),
    );

    return NextResponse.json({
      ...data,
      chartData: buildChartData(data.report),
      game: {
        black: data.report.black,
        date: data.report.playedAt,
        event: data.report.title,
        opening: data.report.opening,
        result: data.report.result,
        timeControl: data.report.timeControl,
        white: data.report.white,
      },
      moves: data.report.moveEvaluations,
      statistics: buildMoveStatistics(data.report),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Analysis failed." },
      { status: 400 },
    );
  }
}
