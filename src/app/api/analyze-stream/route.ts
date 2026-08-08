import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { detectOpeningFromPgn, countPgnPlies } from "@/lib/chess/eco-database";
import { winProbabilityFromCentipawns } from "@/lib/chess/rating";
import { runAnalysisFromPgn } from "@/lib/platform-service";
import { getCurrentUser } from "@/server/auth/session";
import type { AnalysisRun, MoveGrade } from "@/types/platform";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const streamRequestSchema = z.object({
  mode: z.enum(["quick", "deep"]).default("quick"),
  pgn: z.string().min(10),
  source: z.enum(["pgn", "chesscom", "lichess"]).optional(),
  subject: z.string().optional(),
});

const moveGrades: MoveGrade[] = ["Brilliant", "Great", "Best", "Excellent", "Good", "Book", "Inaccuracy", "Mistake", "Blunder"];

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

function eventPayload(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = streamRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid stream analysis payload." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(eventPayload(event, payload)));
      };

      try {
        const opening = detectOpeningFromPgn(parsed.data.pgn);
        const totalMoves = countPgnPlies(parsed.data.pgn);

        send("opening", {
          moveCount: totalMoves,
          opening,
          startedAt,
        });

        const data = await runAnalysisFromPgn(
          {
            pgn: parsed.data.pgn,
            requestedDepth: parsed.data.mode,
            source: parsed.data.source,
            subject: parsed.data.subject,
          },
          await getCurrentUser(),
          {
            onMoveAnalyzed: ({ move, moveIndex }) => {
              send("move", {
                bestMove: move.bestMove,
                cpLoss: move.cpLoss,
                grade: move.grade,
                move,
                moveIndex,
                progress: Math.round(((moveIndex + 1) / totalMoves) * 100),
                totalMoves,
              });
            },
          },
        );
        const elapsedMs = Date.now() - startedAt;

        send("complete", {
          ...data,
          chartData: buildChartData(data.report),
          elapsedMs,
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
        send("error", {
          message: error instanceof Error ? error.message : "Analysis failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
