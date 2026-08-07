import type { ParsedMove } from "./pgn-parser";
import { getSide } from "./pgn-parser";

export interface MoveAnalysis {
  ply: number;
  moveNumber: number;
  side: "white" | "black";
  san: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore: number;
  evalAfter: number;
  diff: number;
  classification: MoveClassification;
  bestMove: string;
  bestLine: string[];
  depth: number;
  mate: number | null;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
}

export type MoveClassification =
  | "Brilliant"
  | "Best"
  | "Excellent"
  | "Good"
  | "Inaccuracy"
  | "Mistake"
  | "Blunder";

export interface CriticalMoment {
  ply: number;
  moveNumber: number;
  side: "white" | "black";
  san: string;
  diff: number;
  classification: MoveClassification;
  bestMove: string;
}

export interface GameAnalysis {
  moves: MoveAnalysis[];
  whiteAccuracy: number;
  blackAccuracy: number;
  criticalMoments: CriticalMoment[];
  blunders: CriticalMoment[];
  mistakes: CriticalMoment[];
  missedOpportunities: CriticalMoment[];
  summary: string;
  openingName: string;
  eco: string;
}

interface ApiResponse {
  eval: number;
  mate: number | null;
  bestMove: string;
  bestLine: string[];
  depth: number;
}

export function classifyMove(diff: number, isCheckmate: boolean): MoveClassification {
  if (isCheckmate) return "Brilliant";
  const absDiff = Math.abs(diff);
  if (absDiff <= 8) return "Best";
  if (absDiff <= 25) return "Excellent";
  if (absDiff <= 50) return "Good";
  if (absDiff <= 100) return "Inaccuracy";
  if (absDiff <= 200) return "Mistake";
  return "Blunder";
}

export function calculateAccuracy(cpLosses: number[]): number {
  if (cpLosses.length === 0) return 0;
  const totalLoss = cpLosses.reduce((a, b) => a + b, 0);
  const avgLoss = totalLoss / cpLosses.length;
  const accuracy = Math.max(0, Math.min(100, 100 - avgLoss * 0.15));
  return Math.round(accuracy * 10) / 10;
}

export function detectOpening(moves: ParsedMove[]): { name: string; eco: string } {
  const sanList = moves.slice(0, Math.min(moves.length, 20)).map((m) => m.san);
  const openingBook: Record<string, { name: string; eco: string }> = {
    "e4 e5 Nf3 Nc6 Bb5": { name: "Ruy Lopez", eco: "C60" },
    "e4 e5 Nf3 Nc6 Bc4": { name: "Italian Game", eco: "C50" },
    "e4 e5 Nf3 Nc6 d4": { name: "Scotch Game", eco: "C45" },
    "e4 e5 Nf3 Nf6": { name: "Petrov Defense", eco: "C42" },
    "e4 e5 f4": { name: "King's Gambit", eco: "C33" },
    "e4 c5": { name: "Sicilian Defense", eco: "B20" },
    "e4 c5 Nf3 d6 d4 cxd4": { name: "Sicilian Defense: Open", eco: "B56" },
    "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6": { name: "Sicilian Defense: Najdorf", eco: "B90" },
    "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4": { name: "Sicilian Defense: Open", eco: "B56" },
    "e4 e6": { name: "French Defense", eco: "C00" },
    "e4 e6 d4 d5": { name: "French Defense: Advance", eco: "C02" },
    "e4 c6": { name: "Caro-Kann Defense", eco: "B10" },
    "e4 c6 d4 d5": { name: "Caro-Kann Defense: Advance", eco: "B12" },
    "d4 d5": { name: "Queen's Pawn Game", eco: "D00" },
    "d4 d5 c4": { name: "Queen's Gambit", eco: "D06" },
    "d4 d5 c4 e6": { name: "Queen's Gambit Declined", eco: "D30" },
    "d4 Nf6": { name: "Indian Defense", eco: "E00" },
    "d4 Nf6 c4 g6": { name: "King's Indian Defense", eco: "E60" },
    "d4 Nf6 c4 e6": { name: "Bogo-Indian Defense", eco: "E11" },
    "Nf3 d5 d4": { name: "Queen's Pawn Game", eco: "D02" },
    "Nf3 Nf6 c4 g6": { name: "King's Indian Defense", eco: "E60" },
    "c4 e5": { name: "English Opening", eco: "A20" },
    "c4 e6": { name: "English Opening", eco: "A10" },
    "c4 c5": { name: "English Opening: Symmetrical", eco: "A30" },
    "e4 d5": { name: "Scandinavian Defense", eco: "B01" },
    "e4 Nf6": { name: "Alekhine Defense", eco: "B02" },
    "d4 Nf6 c4 e6 Nf3 Bb4+": { name: "Bogo-Indian Defense", eco: "E11" },
    "d4 Nf6 c4 e6 Nf3 d5": { name: "Queen's Gambit Declined", eco: "D30" },
    "d4 Nf6 c4 g6 Nc3 d5": { name: "Grünfeld Defense", eco: "D70" },
    "d4 f5": { name: "Dutch Defense", eco: "A80" },
  };

  for (let len = Math.min(10, sanList.length); len >= 2; len--) {
    const key = sanList.slice(0, len).join(" ");
    if (openingBook[key]) {
      return openingBook[key];
    }
  }
  return { name: "Unknown Opening", eco: "A00" };
}

async function analyzePosition(
  fen: string,
  signal?: AbortSignal,
): Promise<ApiResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fen, depth: 18, maxTime: 2000 }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Analysis failed: ${res.statusText}`);
  }
  return res.json();
}

export async function analyzeFullGame(
  moves: ParsedMove[],
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal,
): Promise<GameAnalysis> {
  const results: MoveAnalysis[] = [];
  let whiteCpLosses: number[] = [];
  let blackCpLosses: number[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const side = getSide(i);
    onProgress?.(i + 1, moves.length);

    try {
      const analysis = await analyzePosition(move.fenBefore, signal);
      const evalBefore = analysis.eval;
      const evalAfter = moves[i + 1]
        ? (await analyzePosition(move.fenAfter, signal)).eval
        : evalBefore;

      const diff = side === "white" ? evalAfter - evalBefore : evalBefore - evalAfter;
      const absDiff = Math.abs(diff);

      const classification = classifyMove(absDiff, move.isCheckmate);

      if (side === "white") {
        whiteCpLosses.push(Math.max(0, -diff));
      } else {
        blackCpLosses.push(Math.max(0, diff));
      }

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
        bestLine: analysis.bestLine,
        depth: analysis.depth,
        mate: analysis.mate,
        isCapture: move.isCapture,
        isCheck: move.isCheck,
        isCheckmate: move.isCheckmate,
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
    criticalMoments: criticalMoments.map((m) => ({
      ply: m.ply,
      moveNumber: m.moveNumber,
      side: m.side,
      san: m.san,
      diff: m.diff,
      classification: m.classification,
      bestMove: m.bestMove,
    })),
    blunders: blunders.map((m) => ({
      ply: m.ply,
      moveNumber: m.moveNumber,
      side: m.side,
      san: m.san,
      diff: m.diff,
      classification: m.classification,
      bestMove: m.bestMove,
    })),
    mistakes: mistakes.map((m) => ({
      ply: m.ply,
      moveNumber: m.moveNumber,
      side: m.side,
      san: m.san,
      diff: m.diff,
      classification: m.classification,
      bestMove: m.bestMove,
    })),
    missedOpportunities: missedOpportunities.map((m) => ({
      ply: m.ply,
      moveNumber: m.moveNumber,
      side: m.side,
      san: m.san,
      diff: m.diff,
      classification: m.classification,
      bestMove: m.bestMove,
    })),
    summary,
    openingName: opening.name,
    eco: opening.eco,
  };
}

export function analyzeSinglePosition(
  fenBefore: string,
  moveSan: string,
  side: "white" | "black",
  evalBefore: number,
  evalAfter: number,
): {
  classification: MoveClassification;
  diff: number;
} {
  const diff = side === "white" ? evalAfter - evalBefore : evalBefore - evalAfter;
  return {
    classification: classifyMove(Math.abs(diff), false),
    diff,
  };
}

export function buildSummary(moves: MoveAnalysis[], openingName: string): string {
  const blunderCount = moves.filter((m) => m.classification === "Blunder").length;
  const mistakeCount = moves.filter((m) => m.classification === "Mistake").length;
  const inaccuracyCount = moves.filter((m) => m.classification === "Inaccuracy").length;

  if (moves.length === 0) return "No moves analyzed.";

  let summary = `Game analyzed with ${openingName}. `;
  summary += `Total blunders: ${blunderCount}, mistakes: ${mistakeCount}, inaccuracies: ${inaccuracyCount}. `;

  const whiteScore = moves.filter((m) => m.side === "white").filter((m) => m.classification === "Best" || m.classification === "Excellent").length;
  const blackScore = moves.filter((m) => m.side === "black").filter((m) => m.classification === "Best" || m.classification === "Excellent").length;

  if (whiteScore > blackScore + 2) {
    summary += "White played more accurately overall.";
  } else if (blackScore > whiteScore + 2) {
    summary += "Black played more accurately overall.";
  } else {
    summary += "Both sides had comparable accuracy.";
  }

  return summary;
}
