import { clamp } from "@/lib/utils";

const DEFAULT_WORST_MOVE_CP = -150;

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
  // Scale centipawns slightly based on material to avoid calling moves blunders in trivially won endgames,
  // but keep the base curve anchored to the standard Chess.com formula.
  const multiplier = 32 / Math.max(materialCount, 4);
  const scaledCp = evalCentipawns * (multiplier * 0.5 + 0.5); // blend standard with material scaling
  
  // Standard CAPS v2 win probability curve (scaled 0 to 1)
  return 0.5 + 0.5 * (2 / (1 + Math.exp(-0.00368208 * scaledCp)) - 1);
}

export function capsFromEvaluations({
  bestScore,
  moveScore,
  materialCount = 32,
}: {
  bestScore: number;
  moveScore: number;
  worstScore?: number;
  materialCount?: number;
}) {
  const winProbBest = winProbabilityFromCentipawns(bestScore, materialCount) * 100;
  const winProbMove = winProbabilityFromCentipawns(moveScore, materialCount) * 100;
  
  const winProbLoss = winProbBest - winProbMove;

  if (winProbLoss <= 0) {
    return 100;
  }

  // Standard CAPS v2 move accuracy formula
  const moveAccuracy = 103.1668 * Math.exp(-0.04354 * winProbLoss) - 3.1669;
  
  return clamp(moveAccuracy, 0, 100);
}

export function accuracyFromCaps(capsScores: number[]) {
  if (capsScores.length === 0) {
    return 0;
  }

  const avg = capsScores.reduce((total, score) => total + score, 0) / capsScores.length;
  // A slight quadratic curve to penalize multiple mistakes more heavily
  return Math.max(0, Math.min(100, Math.pow(avg / 100, 1.0) * 100)); // We use power of 1.0 to just keep the mean since the move accuracy formula itself is already tuned.
}
