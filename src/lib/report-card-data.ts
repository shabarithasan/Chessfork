import { formatOpeningName } from "@/lib/chess/openings";
import type { AnalysisRun, MoveEvaluation } from "@/types/platform";

export interface ReportCardRequest {
  bestMove: string;
  bestMoves?: number;
  blackAccuracy: number;
  blackPlayer: string;
  blunders: number;
  brilliantMoves: number;
  date: string;
  mistakes: number;
  opening: string;
  result: string;
  totalMoves: number;
  whiteAccuracy: number;
  whitePlayer: string;
  worstMove: string;
}

export interface ReportCardData extends ReportCardRequest {
  bestMoves: number;
}

function cleanText(value: string, fallback: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

function roundAccuracy(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
}

function countMoves(run: AnalysisRun, grade: MoveEvaluation["grade"]) {
  return run.moveEvaluations.filter((move) => move.grade === grade).length;
}

function findBestMove(run: AnalysisRun) {
  return (
    run.moveEvaluations.find((move) => move.grade === "Brilliant") ??
    run.moveEvaluations.find((move) => move.grade === "Best") ??
    run.moveEvaluations.find((move) => move.grade === "Great") ??
    run.moveEvaluations[0]
  );
}

function findWorstMove(run: AnalysisRun) {
  return run.moveEvaluations.reduce<MoveEvaluation | undefined>((worst, move) => {
    if (!worst) {
      return move;
    }

    return move.cpLoss > worst.cpLoss ? move : worst;
  }, undefined);
}

export function normalizeResultLabel(result: string, whitePlayer: string, blackPlayer: string) {
  const normalizedResult = result.trim().toLowerCase();
  const normalizedWhite = whitePlayer.trim().toLowerCase();
  const normalizedBlack = blackPlayer.trim().toLowerCase();

  if (normalizedResult === "1-0" || normalizedResult.includes("white won") || normalizedResult.includes(`${normalizedWhite} won`)) {
    return "White Won";
  }

  if (normalizedResult === "0-1" || normalizedResult.includes("black won") || normalizedResult.includes(`${normalizedBlack} won`)) {
    return "Black Won";
  }

  if (normalizedResult.includes("draw") || normalizedResult.includes("1/2")) {
    return "Draw";
  }

  return cleanText(result, "Result Pending");
}

export function buildReportCardDataFromAnalysis(run: AnalysisRun): ReportCardData {
  const bestMove = findBestMove(run);
  const worstMove = findWorstMove(run);
  const whitePlayer = cleanText(run.white, "White");
  const blackPlayer = cleanText(run.black, "Black");

  return {
    bestMove: bestMove ? `${bestMove.moveNumber}. ${bestMove.san}` : "N/A",
    bestMoves: countMoves(run, "Best"),
    blackAccuracy: roundAccuracy(run.accuracyBlack),
    blackPlayer,
    blunders: countMoves(run, "Blunder"),
    brilliantMoves: countMoves(run, "Brilliant"),
    date: run.playedAt || run.createdAt,
    mistakes: countMoves(run, "Mistake"),
    opening: cleanText(formatOpeningName(run.opening), "Unknown Opening"),
    result: normalizeResultLabel(run.result, whitePlayer, blackPlayer),
    totalMoves: run.moveCount,
    whiteAccuracy: roundAccuracy(run.accuracyWhite),
    whitePlayer,
    worstMove: worstMove ? `${worstMove.moveNumber}. ${worstMove.san}` : "N/A",
  };
}

export function normalizeReportCardData(input: ReportCardRequest): ReportCardData {
  const whitePlayer = cleanText(input.whitePlayer, "White");
  const blackPlayer = cleanText(input.blackPlayer, "Black");

  return {
    bestMove: cleanText(input.bestMove, "N/A"),
    bestMoves: Math.max(0, Math.round(input.bestMoves ?? (input.bestMove ? 1 : 0))),
    blackAccuracy: roundAccuracy(input.blackAccuracy),
    blackPlayer,
    blunders: Math.max(0, Math.round(input.blunders)),
    brilliantMoves: Math.max(0, Math.round(input.brilliantMoves)),
    date: cleanText(input.date, new Date().toISOString()),
    mistakes: Math.max(0, Math.round(input.mistakes)),
    opening: cleanText(input.opening, "Unknown Opening"),
    result: normalizeResultLabel(input.result, whitePlayer, blackPlayer),
    totalMoves: Math.max(0, Math.round(input.totalMoves)),
    whiteAccuracy: roundAccuracy(input.whiteAccuracy),
    whitePlayer,
    worstMove: cleanText(input.worstMove, "N/A"),
  };
}
