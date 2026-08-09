import { winProbabilityFromCentipawns } from "@/lib/chess/rating";
import type { EngineLine, MoveGrade } from "@/types/platform";

const BEST_MOVE_MARGIN_CP = 5;
const BRILLIANT_EQUAL_POSITION_CP = 80;
const BRILLIANT_GAIN_PERCENT = 15;
const BRILLIANT_ALTERNATIVE_LOSS_PERCENT = -10;
const GREAT_GAIN_PERCENT = 10;
const GREAT_ALTERNATIVE_LOSS_PERCENT = -5;

export type MoveClassificationInput = {
  alternativeLines?: EngineLine[];
  bestMoveSan?: string;
  bestScore: number;
  isBookMove?: boolean;
  moveScore: number;
  playedMoveSan: string;
  materialCount?: number;
};

export type MoveClassification = {
  alternativeLossesPercent: number[];
  deltaPercent: number;
  grade: MoveGrade;
  isOnlyMove: boolean;
  isTopEngineChoice: boolean;
  label: MoveGrade;
  winProbabilityAfter: number;
  winProbabilityBefore: number;
};

function normalizeSan(san: string) {
  return san.replaceAll("0", "O").replace(/[!?]+/g, "");
}

function sameSan(left?: string, right?: string) {
  return Boolean(left && right && normalizeSan(left) === normalizeSan(right));
}

function getClassificationFacts(input: MoveClassificationInput) {
  const bestScoreForPlayer = input.bestScore;
  const moveScoreForPlayer = input.moveScore;
  const materialCount = input.materialCount ?? 32;
  const winProbabilityBefore = winProbabilityFromCentipawns(bestScoreForPlayer, materialCount);
  const winProbabilityAfter = winProbabilityFromCentipawns(moveScoreForPlayer, materialCount);
  const deltaPercent = (winProbabilityAfter - winProbabilityBefore) * 100;
  const cpLoss = Math.max(0, bestScoreForPlayer - moveScoreForPlayer);
  const isTopEngineChoice = sameSan(input.playedMoveSan, input.bestMoveSan) || cpLoss <= BEST_MOVE_MARGIN_CP;
  const alternativeLossesPercent = (input.alternativeLines ?? [])
    .filter((line) => !sameSan(line.san, input.playedMoveSan))
    .map((line) => {
      const alternativeScoreForPlayer = line.score;
      return (winProbabilityFromCentipawns(alternativeScoreForPlayer, materialCount) - winProbabilityBefore) * 100;
    });

  return {
    alternativeLossesPercent,
    bestScoreForPlayer,
    deltaPercent,
    isTopEngineChoice,
    winProbabilityAfter,
    winProbabilityBefore,
  };
}

export function shouldProbeOnlyMove(input: MoveClassificationInput) {
  if (input.isBookMove) {
    return false;
  }

  const facts = getClassificationFacts(input);

  return (
    facts.isTopEngineChoice &&
    Math.abs(facts.bestScoreForPlayer) <= BRILLIANT_EQUAL_POSITION_CP &&
    facts.deltaPercent > GREAT_GAIN_PERCENT
  );
}

export function classifyMove(input: MoveClassificationInput): MoveClassification {
  if (input.isBookMove) {
    return {
      alternativeLossesPercent: [],
      deltaPercent: 0,
      grade: "Book",
      isOnlyMove: false,
      isTopEngineChoice: true,
      label: "Book",
      winProbabilityAfter: 1,
      winProbabilityBefore: 1,
    };
  }

  const facts = getClassificationFacts(input);
  const isCriticalEqualPosition = Math.abs(facts.bestScoreForPlayer) <= BRILLIANT_EQUAL_POSITION_CP;
  const allAlternativesLoseForBrilliant =
    facts.alternativeLossesPercent.length > 0 &&
    facts.alternativeLossesPercent.every((loss) => loss <= BRILLIANT_ALTERNATIVE_LOSS_PERCENT);
  const allAlternativesLoseForGreat =
    facts.alternativeLossesPercent.length > 0 &&
    facts.alternativeLossesPercent.every((loss) => loss <= GREAT_ALTERNATIVE_LOSS_PERCENT);

  const cpLoss = Math.max(0, input.bestScore - input.moveScore);

  if (
    facts.isTopEngineChoice &&
    (facts.deltaPercent > BRILLIANT_GAIN_PERCENT || facts.winProbabilityBefore > 0.8) &&
    allAlternativesLoseForBrilliant
  ) {
    return {
      ...facts,
      grade: "Brilliant",
      isOnlyMove: true,
      label: "Brilliant",
    };
  }

  if (
    facts.isTopEngineChoice &&
    facts.deltaPercent > GREAT_GAIN_PERCENT &&
    allAlternativesLoseForGreat
  ) {
    return {
      ...facts,
      grade: "Great",
      isOnlyMove: true,
      label: "Great",
    };
  }

  let grade: MoveGrade;
  if (facts.deltaPercent >= -0.5 && facts.isTopEngineChoice) {
    grade = "Best";
  } else if (facts.deltaPercent >= -2 || cpLoss <= 15) {
    grade = "Excellent";
  } else if (facts.deltaPercent >= -5 || cpLoss <= 60) {
    grade = "Good";
  } else if (facts.deltaPercent >= -10 || cpLoss <= 120) {
    grade = "Inaccuracy";
  } else if (facts.deltaPercent >= -20 || cpLoss <= 250) {
    grade = "Mistake";
  } else {
    grade = "Blunder";
  }

  return {
    ...facts,
    grade,
    isOnlyMove: false,
    label: grade,
  };
}
