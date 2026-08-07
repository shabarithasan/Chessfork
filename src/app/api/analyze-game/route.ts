import { NextRequest, NextResponse } from "next/server";
import { parseHeaders, parseMoves, validatePgn } from "@/lib/pgn-parser";
import { analyzeCompleteGame } from "@/lib/analysis-engine";
import { generateReport } from "@/lib/report-generator";
import type { AnalysisProgress } from "@/lib/analysis-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const { pgn } = body as { pgn?: string };
    if (!pgn || typeof pgn !== "string") {
      return NextResponse.json({ message: "PGN string is required" }, { status: 400 });
    }

    const validation = validatePgn(pgn);
    if (!validation.valid) {
      return NextResponse.json({ message: validation.error ?? "Invalid PGN" }, { status: 400 });
    }

    const headers = parseHeaders(pgn);
    const moves = parseMoves(pgn);

    if (moves.length === 0) {
      return NextResponse.json({ message: "No moves found in PGN" }, { status: 400 });
    }

    console.log(`[analyze-game] Analyzing ${moves.length} moves: ${headers.white} vs ${headers.black}`);

    const progressLog = (progress: AnalysisProgress) => {
      console.log(
        `[analyze-game] Progress: ${progress.current}/${progress.total} (${progress.phase})`,
      );
    };

    const analysis = await analyzeCompleteGame(moves, progressLog);
    const report = generateReport(analysis, headers, moves);

    return NextResponse.json({
      gameData: headers,
      moves,
      analysis,
      report,
      status: "complete",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    console.error("[analyze-game] Error:", message);
    return NextResponse.json({ message, status: "error" }, { status: 500 });
  }
}
