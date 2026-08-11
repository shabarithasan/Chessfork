import type { ParsedMove } from "./pgn-parser";
import { getSide } from "./pgn-parser";
import type { MoveAnalysis, CriticalMoment, GameAnalysis } from "./game-analyzer";
import { classifyMove, calculateAccuracy, detectOpening, buildSummary } from "./game-analyzer";
import { classifyMoveAbsolute } from "./move-classifier";

export interface TopMoveEntry {
  san: string;
  from: string;
  to: string;
  eval: number;
  mate: number | null;
  line: string[];
}

export interface AnalyzedMove extends MoveAnalysis {
  topMoves: TopMoveEntry[];
  explanation: string;
}

export interface AnalysisProgress {
  current: number;
  total: number;
  phase: "opening" | "middlegame" | "endgame";
  fen: string;
}

export async function analyzeCompleteGame(
  moves: ParsedMove[],
  onProgress?: (progress: AnalysisProgress) => void,
  signal?: AbortSignal,
): Promise<GameAnalysis & { analyzedMoves: AnalyzedMove[] }> {
  const results: AnalyzedMove[] = [];
  const whiteCpLosses: number[] = [];
  const blackCpLosses: number[] = [];
  const total = moves.length;

  const { evaluateFen } = await import("./stockfish-worker");

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const move = moves[i];
    const side = getSide(i);
    const fen = move.fenBefore;

    const phase: AnalysisProgress["phase"] =
      i < 10 ? "opening" : i < 40 ? "middlegame" : "endgame";

    onProgress?.({
      current: i + 1,
      total,
      phase,
      fen,
    });

    try {
      const analysis = await evaluateFen(fen, 20, 3000, 3);
      const evalBefore = analysis.eval;

      let evalAfter = evalBefore;
      if (i < total - 1) {
        const nextAnalysis = await evaluateFen(move.fenAfter, 18, 1500, 1);
        evalAfter = nextAnalysis.eval;
      }

      const diff = side === "white" ? evalAfter - evalBefore : evalBefore - evalAfter;

      const classification = classifyMove(diff, move.isCheckmate);
      const { grade } = classifyMoveAbsolute(Math.max(0, side === "white" ? -diff : diff), move.isCheckmate);

      if (side === "white") {
        whiteCpLosses.push(Math.max(0, -diff));
      } else {
        blackCpLosses.push(Math.max(0, diff));
      }

      const bestLineSan = analysis.bestLine.slice(0, 6);

      const topMoves: TopMoveEntry[] = (analysis.topMoves ?? []).map((t) => ({
        san: t.san,
        from: t.from,
        to: t.to,
        eval: t.eval,
        mate: t.mate ?? null,
        line: t.line ?? [],
      }));

      const explanation = buildExplanation(move.san, side, classification, evalAfter - evalBefore);

      results.push({
        ply: i + 1,
        moveNumber: Math.floor(i / 2) + 1,
        side,
        san: move.san,
        fenBefore: move.fenBefore,
        fenAfter: move.fenAfter,
        evalBefore,
        evalAfter,
        diff,
        classification,
        bestMove: analysis.bestMove,
        bestLine: bestLineSan,
        depth: analysis.depth,
        mate: analysis.mate,
        isCapture: move.isCapture,
        isCheck: move.isCheck,
        isCheckmate: move.isCheckmate,
        topMoves,
        explanation,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      results.push({
        ply: i + 1,
        moveNumber: Math.floor(i / 2) + 1,
        side,
        san: move.san,
        fenBefore: move.fenBefore,
        fenAfter: move.fenAfter,
        evalBefore: 0,
        evalAfter: 0,
        diff: 0,
        classification: "Good",
        bestMove: "",
        bestLine: [],
        depth: 0,
        mate: null,
        isCapture: move.isCapture,
        isCheck: move.isCheck,
        isCheckmate: move.isCheckmate,
        topMoves: [],
        explanation: "Analysis unavailable for this position.",
      });
    }
  }

  const blunders = results.filter((m) => m.classification === "Blunder");
  const mistakes = results.filter((m) => m.classification === "Mistake");
  const criticalMoments = results.filter((m) => Math.abs(m.diff) >= 100);
  const missedOpportunities = results.filter(
    (m) => m.classification !== "Best" && m.classification !== "Excellent" && Math.abs(m.diff) > 50,
  );

  const opening = detectOpening(moves);
  const summary = buildSummary(results, opening.name);

  return {
    moves: results,
    whiteAccuracy: calculateAccuracy(whiteCpLosses),
    blackAccuracy: calculateAccuracy(blackCpLosses),
    criticalMoments: criticalMoments.map(mapToCritical),
    blunders: blunders.map(mapToCritical),
    mistakes: mistakes.map(mapToCritical),
    missedOpportunities: missedOpportunities.map(mapToCritical),
    summary,
    openingName: opening.name,
    eco: opening.eco,
    analyzedMoves: results,
  };
}

function mapToCritical(m: MoveAnalysis): CriticalMoment {
  return {
    ply: m.ply,
    moveNumber: m.moveNumber,
    side: m.side,
    san: m.san,
    diff: m.diff,
    classification: m.classification,
    bestMove: m.bestMove,
  };
}

function buildExplanation(san: string, side: string, classification: string, evalChange: number): string {
  const player = side === "white" ? "White" : "Black";
  switch (classification) {
    case "Brilliant":
      return `${player}'s ${san} is brilliant. This move is the best possible and significantly improves the position.`;
    case "Best":
      return `${player} plays ${san} — the engine's top choice in this position.`;
    case "Excellent":
      return `${san} is a strong move by ${player}, though not the absolute best option available.`;
    case "Good":
      return `${san} by ${player} maintains a playable position. Another move would have been slightly more accurate.`;
    case "Inaccuracy":
      return `${player}'s ${san} is an inaccuracy. The evaluation shifted ${Math.abs(evalChange) > 0 ? `by ${Math.abs(Math.round(evalChange))} centipawns` : "slightly"} in the opponent's favor.`;
    case "Mistake":
      return `${player} makes a mistake with ${san}. This gives the opponent a tangible advantage.`;
    case "Blunder":
      return `${player} blunders with ${san}! This significantly changes the evaluation and may decide the game.`;
    default:
      return `${player} plays ${san}.`;
  }
}
