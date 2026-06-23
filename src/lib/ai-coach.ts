import { formatOpeningName } from "@/lib/chess/openings";
import { normalizeResultLabel } from "@/lib/report-card-data";
import type { AnalysisRun, MoveEvaluation } from "@/types/platform";

export type AiCoachPhase = "opening" | "middlegame" | "endgame";
export type AiCoachSeverity = "critical" | "minor" | "moderate";
export type AiCoachRating = "Advanced" | "Expert" | "Intermediate";

export interface AiCoachMoveIssue {
  cpLoss: number;
  fen: string;
  move: string;
}

export interface AiCoachGameInput {
  blackAccuracy: number;
  blunders: AiCoachMoveIssue[];
  mistakes: AiCoachMoveIssue[];
  opening: string;
  phase: AiCoachPhase;
  pgn: string;
  result: string;
  timeLeft: number;
  whiteAccuracy: number;
}

export interface AiCoachWeakness {
  description: string;
  drill: string;
  evidence: string;
  severity: AiCoachSeverity;
  title: string;
}

export interface AiCoachReport {
  openingRecommendation: string;
  overallRating: AiCoachRating;
  quickInsight?: string;
  strengths: string[];
  summary: string;
  weaknesses: AiCoachWeakness[];
  weeklyGoal: string;
}

function issueFromMove(move: MoveEvaluation): AiCoachMoveIssue {
  return {
    cpLoss: Math.round(move.cpLoss),
    fen: move.fenBefore,
    move: `${move.moveNumber}. ${move.san}`,
  };
}

function dominantCriticalPhase(moves: MoveEvaluation[]): AiCoachPhase {
  const criticalMoves = moves.filter((move) => move.grade === "Blunder" || move.grade === "Mistake" || move.cpLoss >= 80);
  const counts: Record<AiCoachPhase, number> = {
    endgame: 0,
    middlegame: 0,
    opening: 0,
  };

  for (const move of criticalMoves.length > 0 ? criticalMoves : moves) {
    counts[move.phase] += 1;
  }

  return (Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] as AiCoachPhase | undefined) ?? "middlegame";
}

export function buildAiCoachGameFromAnalysis(run: AnalysisRun): AiCoachGameInput {
  return {
    blackAccuracy: Math.round(run.accuracyBlack),
    blunders: run.moveEvaluations.filter((move) => move.grade === "Blunder").map(issueFromMove).slice(0, 5),
    mistakes: run.moveEvaluations.filter((move) => move.grade === "Mistake").map(issueFromMove).slice(0, 5),
    opening: formatOpeningName(run.opening),
    phase: dominantCriticalPhase(run.moveEvaluations),
    pgn: run.pgn,
    result: normalizeResultLabel(run.result, run.white, run.black),
    timeLeft: 0,
    whiteAccuracy: Math.round(run.accuracyWhite),
  };
}

export function buildAiCoachGamesFromAnalyses(runs: AnalysisRun[], limit: number) {
  return runs.slice(0, limit).map(buildAiCoachGameFromAnalysis);
}
