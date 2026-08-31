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
  const winProbabilityBefore = winProbabilityFromCentipawns(bestScoreForPlayer);
  const winProbabilityAfter = winProbabilityFromCentipawns(moveScoreForPlayer);
  const deltaPercent = (winProbabilityAfter - winProbabilityBefore) * 100;
  const cpLoss = Math.max(0, bestScoreForPlayer - moveScoreForPlayer);
  const isTopEngineChoice = sameSan(input.playedMoveSan, input.bestMoveSan) || cpLoss <= BEST_MOVE_MARGIN_CP;
  const alternativeLossesPercent = (input.alternativeLines ?? [])
    .filter((line) => !sameSan(line.san, input.playedMoveSan))
    .map((line) => {
      const alternativeScoreForPlayer = line.score;
      return (winProbabilityFromCentipawns(alternativeScoreForPlayer) - winProbabilityBefore) * 100;
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

  const cpLoss = Math.max(0, input.bestScore - input.moveScore);
  const isTopEngineChoice = sameSan(input.playedMoveSan, input.bestMoveSan) || cpLoss <= BEST_MOVE_MARGIN_CP;

  let grade: MoveGrade;
  
  if (input.bestScore >= 10000 && cpLoss === 0 && !isTopEngineChoice) {
    // A brilliant mate found
    grade = "Brilliant";
  } else if (cpLoss > 300) {
    grade = "Blunder";
  } else if (cpLoss > 150) {
    grade = "Mistake";
  } else if (cpLoss > 50) {
    grade = "Inaccuracy";
  } else if (isTopEngineChoice) {
    grade = "Best";
  } else if (cpLoss <= 15) {
    grade = "Excellent";
  } else {
    grade = "Good";
  }

  return {
    alternativeLossesPercent: [],
    deltaPercent: 0,
    winProbabilityAfter: 0,
    winProbabilityBefore: 0,
    isTopEngineChoice,
    grade,
    isOnlyMove: false,
    label: grade,
  };
}
