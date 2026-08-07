import type { MoveAnalysis, CriticalMoment, GameAnalysis } from "./game-analyzer";
import type { GameHeaders, ParsedMove } from "./pgn-parser";
import type { AnalyzedMove } from "./analysis-engine";

export interface PhaseInfo {
  name: string;
  startPly: number;
  endPly: number;
  moves: AnalyzedMove[];
  whiteAccuracy: number;
  blackAccuracy: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  themes: string[];
}

export interface BiggestSwings {
  white: CriticalMoment[];
  black: CriticalMoment[];
  overall: CriticalMoment[];
}

export interface PlayerStats {
  accuracy: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  bestMoves: number;
  totalMoves: number;
  avgCpLoss: number;
  peakAccuracy: number;
  peakAccuracyMove: string;
  worstMistake: CriticalMoment | null;
  biggestBlunder: CriticalMoment | null;
}

export interface OpeningAnalysis {
  name: string;
  eco: string;
  moveCount: number;
  side: string;
  bookMoveCount: number;
}

export interface KeyMoment {
  ply: number;
  moveNumber: number;
  side: "white" | "black";
  san: string;
  evalAfter: number;
  diff: number;
  classification: string;
  description: string;
}

export interface GraphPoint {
  move: number;
  whiteEval: number;
  blackEval: number;
  san: string;
}

export interface BlunderEntry {
  ply: number;
  moveNumber: number;
  side: "white" | "black";
  san: string;
  evalBefore: number;
  evalAfter: number;
  diff: number;
  bestMove: string;
  bestLine: string[];
  explanation: string;
}

export interface GameReport {
  game: {
    white: string;
    black: string;
    result: string;
    date?: string;
    event?: string;
    whiteElo?: string;
    blackElo?: string;
    totalMoves: number;
  };
  opening: OpeningAnalysis;
  phases: PhaseInfo[];
  biggestSwings: BiggestSwings;
  keyMoments: KeyMoment[];
  players: {
    white: PlayerStats;
    black: PlayerStats;
  };
  blunders: BlunderEntry[];
  mistakes: CriticalMoment[];
  graphData: GraphPoint[];
  summary: string;
}

export function generateReport(
  analysis: GameAnalysis & { analyzedMoves: AnalyzedMove[] },
  headers: GameHeaders,
  parsedMoves: ParsedMove[],
): GameReport {
  const analyzedMoves = analysis.analyzedMoves ?? [];
  const phases = detectPhases(analyzedMoves);

  const whiteMoves = analyzedMoves.filter((m) => m.side === "white");
  const blackMoves = analyzedMoves.filter((m) => m.side === "black");

  const whiteStats = computePlayerStats(whiteMoves, analysis.whiteAccuracy);
  const blackStats = computePlayerStats(blackMoves, analysis.blackAccuracy);

  const blunderEntries: BlunderEntry[] = analyzedMoves
    .filter((m) => m.classification === "Blunder")
    .map((m) => ({
      ply: m.ply,
      moveNumber: m.moveNumber,
      side: m.side,
      san: m.san,
      evalBefore: m.evalBefore,
      evalAfter: m.evalAfter,
      diff: m.diff,
      bestMove: m.bestMove,
      bestLine: m.bestLine,
      explanation: m.explanation,
    }));

  const keyMoments = findKeyMoments(analyzedMoves, analysis.criticalMoments);
  const graphData = buildGraphData(analyzedMoves);

  return {
    game: {
      white: headers.white,
      black: headers.black,
      result: headers.result,
      date: headers.date,
      event: headers.event,
      whiteElo: headers.whiteElo,
      blackElo: headers.blackElo,
      totalMoves: parsedMoves.length,
    },
    opening: {
      name: analysis.openingName,
      eco: analysis.eco,
      moveCount: Math.min(parsedMoves.length, 20),
      side: parsedMoves[0]?.san?.startsWith("e") ? "King's pawn" : "Queen's pawn",
      bookMoveCount: Math.min(
        parsedMoves.length,
        parsedMoves.length > 10 ? 8 : parsedMoves.length > 5 ? 5 : 3,
      ),
    },
    phases,
    biggestSwings: findBiggestSwings(analysis.criticalMoments, 5),
    keyMoments,
    players: { white: whiteStats, black: blackStats },
    blunders: blunderEntries,
    mistakes: analysis.mistakes,
    graphData,
    summary: analysis.summary,
  };
}

function detectPhases(moves: AnalyzedMove[]): PhaseInfo[] {
  if (moves.length === 0) return [];

  const openingEnd = Math.min(20, moves.length);
  const middlegameEnd = Math.min(40, moves.length);

  const phases: PhaseInfo[] = [];

  const openingMoves = moves.slice(0, openingEnd);
  if (openingMoves.length > 0) {
    phases.push(makePhase("Opening", openingMoves));
  }

  if (middlegameEnd > openingEnd) {
    const mgMoves = moves.slice(openingEnd, middlegameEnd);
    phases.push(makePhase("Middlegame", mgMoves));
  }

  if (moves.length > middlegameEnd) {
    const egMoves = moves.slice(middlegameEnd);
    phases.push(makePhase("Endgame", egMoves));
  }

  return phases;
}

function makePhase(name: string, moves: AnalyzedMove[]): PhaseInfo {
  const whiteCp = moves
    .filter((m) => m.side === "white")
    .map((m) => Math.max(0, -m.diff));
  const blackCp = moves
    .filter((m) => m.side === "black")
    .map((m) => Math.max(0, m.diff));

  const whiteAcc = calcAccuracy(whiteCp);
  const blackAcc = calcAccuracy(blackCp);

  const themes = detectThemes(moves);

  return {
    name,
    startPly: moves[0].ply,
    endPly: moves[moves.length - 1].ply,
    moves,
    whiteAccuracy: whiteAcc,
    blackAccuracy: blackAcc,
    blunders: moves.filter((m) => m.classification === "Blunder").length,
    mistakes: moves.filter((m) => m.classification === "Mistake").length,
    inaccuracies: moves.filter((m) => m.classification === "Inaccuracy").length,
    themes,
  };
}

function detectThemes(moves: AnalyzedMove[]): string[] {
  const themes: string[] = [];
  if (moves.some((m) => m.isCapture)) themes.push("Captures");
  if (moves.some((m) => m.isCheck)) themes.push("Check");
  if (moves.some((m) => m.bestLine.length > 3)) themes.push("Tactical");
  if (moves.some((m) => m.classification === "Blunder" || m.classification === "Mistake")) themes.push("Errors");
  if (moves.some((m) => Math.abs(m.diff) > 150)) themes.push("Sharp");
  if (moves.length > 0 && Math.abs(moves[moves.length - 1].evalAfter) < 50) themes.push("Balanced");
  return themes.length > 0 ? themes : ["Positional"];
}

function calcAccuracy(cpLosses: number[]): number {
  if (cpLosses.length === 0) return 0;
  const avg = cpLosses.reduce((a, b) => a + b, 0) / cpLosses.length;
  return Math.round(Math.max(0, Math.min(100, 100 - avg * 0.15)) * 10) / 10;
}

function findBiggestSwings(
  criticalMoments: CriticalMoment[],
  count: number,
): BiggestSwings {
  const sorted = [...criticalMoments].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  return {
    white: sorted.filter((m) => m.side === "white").slice(0, count),
    black: sorted.filter((m) => m.side === "black").slice(0, count),
    overall: sorted.slice(0, count),
  };
}

function computePlayerStats(
  moves: AnalyzedMove[],
  accuracy: number,
): PlayerStats {
  if (moves.length === 0) {
    return {
      accuracy: 0, blunders: 0, mistakes: 0, inaccuracies: 0,
      bestMoves: 0, totalMoves: 0, avgCpLoss: 0,
      peakAccuracy: 0, peakAccuracyMove: "",
      worstMistake: null, biggestBlunder: null,
    };
  }

  const cpLosses = moves.map((m) => Math.abs(m.diff));
  const avgCpLoss = cpLosses.reduce((a, b) => a + b, 0) / cpLosses.length;

  const bestMoves = moves.filter(
    (m) => m.classification === "Best" || m.classification === "Brilliant" || m.classification === "Excellent",
  );

  const peak = bestMoves.length > 0
    ? bestMoves.reduce((best, m) => (Math.abs(m.diff) < Math.abs(best.diff) ? m : best), bestMoves[0])
    : moves[0];

  const mistakes = moves.filter((m) => m.classification === "Mistake").sort(
    (a, b) => Math.abs(b.diff) - Math.abs(a.diff),
  );
  const blunders = moves.filter((m) => m.classification === "Blunder").sort(
    (a, b) => Math.abs(b.diff) - Math.abs(a.diff),
  );

  return {
    accuracy,
    blunders: blunders.length,
    mistakes: mistakes.length,
    inaccuracies: moves.filter((m) => m.classification === "Inaccuracy").length,
    bestMoves: bestMoves.length,
    totalMoves: moves.length,
    avgCpLoss: Math.round(avgCpLoss * 10) / 10,
    peakAccuracy: peak ? Math.round(Math.abs(peak.diff) * 10) / 10 : 0,
    peakAccuracyMove: peak?.san ?? "",
    worstMistake: mistakes[0] ?? null,
    biggestBlunder: blunders[0] ?? null,
  };
}

function findKeyMoments(
  moves: AnalyzedMove[],
  criticalMoments: CriticalMoment[],
): KeyMoment[] {
  const sorted = [...criticalMoments].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 6);

  return sorted.map((cm) => {
    const move = moves.find((m) => m.ply === cm.ply);
    const description = move?.classification === "Blunder"
      ? `Critical blunder by ${cm.side}. ${cm.san} loses ${Math.abs(cm.diff)} centipawns.`
      : move?.classification === "Mistake"
        ? `Significant mistake by ${cm.side}. ${cm.san} shifted the evaluation by ${Math.abs(cm.diff)} centipawns.`
        : `Key moment at move ${cm.moveNumber}. ${cm.side === "white" ? "White" : "Black"} played ${cm.san} (eval swing: ${cm.diff > 0 ? "+" : ""}${cm.diff}).`;

    return {
      ply: cm.ply,
      moveNumber: cm.moveNumber,
      side: cm.side,
      san: cm.san,
      evalAfter: move?.evalAfter ?? 0,
      diff: cm.diff,
      classification: cm.classification,
      description,
    };
  });
}

function buildGraphData(moves: AnalyzedMove[]): GraphPoint[] {
  return moves.map((m, i) => ({
    move: i + 1,
    whiteEval: m.side === "white" ? m.evalAfter : -m.evalAfter,
    blackEval: m.side === "black" ? m.evalAfter : -m.evalAfter,
    san: m.san,
  }));
}
