import { NextResponse } from "next/server";

import { explainMove } from "@/lib/deepseek-client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const { fen, move, evalScore } = body as Record<string, unknown>;

    if (!fen || typeof fen !== "string") {
      return NextResponse.json({ message: "FEN string is required" }, { status: 400 });
    }
    if (!move || typeof move !== "string") {
      return NextResponse.json({ message: "Move notation is required" }, { status: 400 });
    }
    if (typeof evalScore !== "number") {
      return NextResponse.json({ message: "Eval score must be a number" }, { status: 400 });
    }

    console.log(`[explain] Analyzing move: ${move} eval=${evalScore}`);

    const result = await explainMove(fen, move, evalScore);

    return NextResponse.json({
      explanation: result.explanation,
      moveClassification: result.moveClassification,
      evalChange: result.evalChange,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Explanation failed";
    console.error("[explain] Error:", message);
    return NextResponse.json({ message }, { status: 500 });
  }
}
