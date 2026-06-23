import { clamp } from "@/lib/utils";

const DEFAULT_WORST_MOVE_CP = -200;

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

export function winProbabilityFromCentipawns(evalCentipawns: number) {
  return 1 / (1 + 10 ** (-evalCentipawns / 400));
}

export function capsFromEvaluations({
  bestScore,
  moveScore,
  worstScore = DEFAULT_WORST_MOVE_CP,
}: {
  bestScore: number;
  moveScore: number;
  worstScore?: number;
}) {
  const winProbBest = winProbabilityFromCentipawns(bestScore);
  const winProbMove = winProbabilityFromCentipawns(moveScore);
  const winProbWorst = winProbabilityFromCentipawns(worstScore);
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
