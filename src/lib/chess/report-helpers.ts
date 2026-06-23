import { clamp } from "@/lib/utils";
import type { AnalysisRun, MoveEvaluation } from "@/types/platform";

export const MAX_REPORTED_CP_LOSS = 999;
const MATE_SWING_CP_LOSS = 5_000;

export function normalizeCpLoss(cpLoss: number) {
  return clamp(Math.round(cpLoss), 0, MAX_REPORTED_CP_LOSS);
}

export function formatCpLossValue(cpLoss: number) {
  const rounded = Math.max(0, Math.round(cpLoss));

  if (rounded >= MATE_SWING_CP_LOSS) {
    return "Mate swing";
  }

  if (rounded > MAX_REPORTED_CP_LOSS) {
    return `${MAX_REPORTED_CP_LOSS}+`;
  }

  return rounded.toString();
}

export function formatCpLossLabel(cpLoss: number) {
  const value = formatCpLossValue(cpLoss);
  return value === "Mate swing" ? value : `${value} CPL`;
}

function describeFinalEdge(score: number, white: string, black: string) {
  if (score >= 160) {
    return `${white} finished with a clear engine edge.`;
  }

  if (score <= -160) {
    return `${black} finished with a clear engine edge.`;
  }

  if (score >= 55) {
    return `${white} held the cleaner final position.`;
  }

  if (score <= -55) {
    return `${black} held the cleaner final position.`;
  }

  return "The final position stayed roughly balanced by engine standards.";
}

function describeBiggestSwing(move: MoveEvaluation) {
  if (move.cpLoss >= MATE_SWING_CP_LOSS) {
    return `${move.side === "white" ? "White" : "Black"}'s biggest drop came after ${move.san}, where a mating sequence slipped and ${move.bestMove} was the cleaner engine choice.`;
  }

  if (move.cpLoss >= MAX_REPORTED_CP_LOSS) {
    return `${move.side === "white" ? "White" : "Black"}'s biggest drop came after ${move.san}, where the position nearly collapsed and ${move.bestMove} was the cleaner engine choice.`;
  }

  return `${move.side === "white" ? "White" : "Black"}'s biggest drop came after ${move.san}, where ${formatCpLossValue(move.cpLoss)} centipawns disappeared and ${move.bestMove} was the cleaner engine choice.`;
}

export function buildAnalysisStory(params: {
  black: string;
  criticalMoments: AnalysisRun["criticalMoments"];
  evaluations: MoveEvaluation[];
  moveCount: number;
  openingName: string;
  subject: string;
  white: string;
}) {
  const sharpPlyCount = params.evaluations.filter((move) => move.isCapture || move.isCheck).length;
  const biggestSwing = params.evaluations.reduce<MoveEvaluation | null>(
    (current, move) => (!current || move.cpLoss > current.cpLoss ? move : current),
    null,
  );
  const finalMove = params.evaluations.at(-1);
  const reviewCount =
    params.criticalMoments.length > 0
      ? params.criticalMoments.length
      : params.evaluations.filter((move) => move.cpLoss >= 60).length;

  return [
    `${params.subject} entered ${params.openingName} and produced ${reviewCount || 1} moments worth a second look across ${params.moveCount} plies.`,
    biggestSwing
      ? describeBiggestSwing(biggestSwing)
      : "The game never hit a single catastrophic engine swing, so the review is more about cumulative drift than one collapse.",
    `${describeFinalEdge(finalMove?.score ?? 0, params.white, params.black)} The game stayed tactical on ${sharpPlyCount} plies, so calculation mattered more than autopilot.`,
  ];
}

export function sanitizeAnalysisRun(run: AnalysisRun): AnalysisRun {
  return {
    ...run,
    criticalMoments: run.criticalMoments.map((moment) => ({
      ...moment,
      cpLoss: normalizeCpLoss(moment.cpLoss),
    })),
    moveEvaluations: run.moveEvaluations.map((move) => ({
      ...move,
      cpLoss: normalizeCpLoss(move.cpLoss),
      engineLines: move.engineLines?.map((line) => ({ ...line, line: [...line.line] })),
      principalVariation: [...move.principalVariation],
      refutationLine: move.refutationLine ? { ...move.refutationLine, line: [...move.refutationLine.line] } : undefined,
    })),
    story: [...run.story],
    bestMoveChain: [...run.bestMoveChain],
  };
}
