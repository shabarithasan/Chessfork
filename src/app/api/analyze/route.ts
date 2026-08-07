import { NextResponse } from "next/server";

import { evaluateFen } from "@/lib/stockfish-worker";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const { fen, depth: rawDepth, maxTime: rawMaxTime, multiPv: rawMultiPv } = body as Record<string, unknown>;

    if (!fen || typeof fen !== "string") {
      return NextResponse.json({ message: "FEN string is required" }, { status: 400 });
    }

    const depth = typeof rawDepth === "number" ? Math.min(Math.max(Math.round(rawDepth), 15), 20) : 20;
    const maxTime = typeof rawMaxTime === "number" ? Math.min(Math.max(rawMaxTime, 1000), 10000) : 3000;
    const multiPv = typeof rawMultiPv === "number" ? Math.min(Math.max(Math.round(rawMultiPv), 1), 5) : 1;

    console.log(`[analyze] Analyzing FEN depth=${depth} maxTime=${maxTime} multiPv=${multiPv}`);

    const result = await evaluateFen(fen, depth, maxTime, multiPv);

    const mateValue = result.mate;
    const finalEval = mateValue !== null
      ? (mateValue > 0 ? 10000 : -10000)
      : result.eval;

    return NextResponse.json({
      eval: finalEval,
      mate: result.mate,
      bestMove: result.bestMove,
      bestLine: result.bestLine,
      depth: result.depth,
      topMoves: result.topMoves,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    console.error("[analyze] Error:", message);
    return NextResponse.json({ message }, { status: 500 });
  }
}
