import { clamp } from "@/lib/utils";

const DEFAULT_WORST_MOVE_CP = -400;

export function expectedScore(playerRating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

export function calculateRatingChange(params: {
  playerRating: number;
  opponentRating: number;
  result: 0 | 0.5 | 1;
  kFactor?: number;
}) {
  const expected = expectedScore(params.playerRating, params.opponentRating);
  const kFactor = params.kFactor ?? 20;
  return Math.round(kFactor * (params.result - expected));
}

export function accuracyFromAverageCpLoss(cpLoss: number) {
  return clamp(100 - cpLoss / 2.4, 26, 99.4);
}

export function winProbabilityFromCentipawns(evalCentipawns: number, materialCount = 32) {
  // Scale centipawns based on material. A +2.00 advantage in an endgame (few pieces)
  // is mathematically much stronger than +2.00 in the opening.
  // This prevents the engine from calling a move a "Blunder" in a completely won endgame
  // just because the score dropped from +8.00 to +5.00.
  const multiplier = 32 / Math.max(materialCount, 4);
  return 1 / (1 + 10 ** (-(evalCentipawns * multiplier) / 400));
}

export function capsFromEvaluations({
  bestScore,
  moveScore,
  worstScore = DEFAULT_WORST_MOVE_CP,
  materialCount = 32,
}: {
  bestScore: number;
  moveScore: number;
  worstScore?: number;
  materialCount?: number;
}) {
  const winProbBest = winProbabilityFromCentipawns(bestScore, materialCount);
  const winProbMove = winProbabilityFromCentipawns(moveScore, materialCount);
  const winProbWorst = winProbabilityFromCentipawns(worstScore, materialCount);
  const denominator = winProbBest - winProbWorst;

  if (Math.abs(denominator) <= Number.EPSILON) {
    return moveScore >= bestScore ? 100 : 0;
  }

  return clamp(((winProbMove - winProbWorst) / denominator) * 100, 0, 100);
}

export function accuracyFromCaps(capsScores: number[]) {
  if (capsScores.length === 0) {
    return 0;
  }

  return clamp(capsScores.reduce((total, score) => total + score, 0) / capsScores.length, 0, 100);
}
