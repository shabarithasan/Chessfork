"use client";

import type { MoveGrade } from "@/lib/move-classifier";

export interface ClassifyInput {
  bestEval: number;
  playedEval: number;
  bestMove: string;
  playedMove: string;
  bestMateInN: number | null;
  playedMateInN: number | null;
  isOnlyMove: boolean;
  allBestEvals: number[];
  side: "white" | "black";
  isCapture: boolean;
  isCheck: boolean;
  isPromotion: boolean;
  isCastle: boolean;
  isSacrifice: boolean;
  depth: number;
}

export interface ClassifyResult {
  grade: MoveGrade;
  reasons: string[];
}

function evalGapForOnlyEngineMove(evals: number[]): number {
  if (evals.length < 2) return 0;
  return Math.abs(evals[0] - evals[1]);
}

const MIN_DEPTH_FOR_BRILLIANT = 16;

export function classifyWhatIfMove(input: ClassifyInput): ClassifyResult {
  const { bestEval, playedEval, bestMove, playedMove, bestMateInN, playedMateInN, isOnlyMove, allBestEvals, side, isCheck, isSacrifice, depth } = input;

  const cpLoss = side === "white" ? bestEval - playedEval : playedEval - bestEval;
  const absLoss = Math.max(0, cpLoss);
  const onlyEngineGap = evalGapForOnlyEngineMove(allBestEvals);
  const isOnlyEngineMove = onlyEngineGap > 200;

  const reasons: string[] = [];

  /* ── Step 1: Only legal move (forced) ── */
  if (isOnlyMove) {
    reasons.push("forced_move");
    return { grade: "Excellent", reasons };
  }

  /* ── Step 2: Mate detection ── */
  if (bestMateInN !== null) {
    if (side === "white") {
      if (bestMateInN > 0) {
        if (playedMove === bestMove) {
          reasons.push("best_move_mate");
          return earlyGrade(depth, "Best", reasons);
        }
        if (playedMateInN !== null && playedMateInN < 0) {
          reasons.push("still_mating");
          return earlyGrade(depth, "Best", reasons);
        }
        reasons.push("missed_mate");
        return { grade: "Blunder", reasons };
      }
      if (playedMateInN !== null && playedMateInN > 0) {
        reasons.push("still_being_mated");
        return { grade: "Mistake", reasons };
      }
      if (playedMateInN !== null && playedMateInN < 0) {
        reasons.push("escaped_mate");
        return earlyGrade(depth, "Excellent", reasons);
      }
      reasons.push("escaped_mate");
      return earlyGrade(depth, "Excellent", reasons);
    }
    if (bestMateInN > 0) {
      if (playedMove === bestMove) {
        reasons.push("best_move_mate");
        return earlyGrade(depth, "Best", reasons);
      }
      if (playedMateInN !== null && playedMateInN < 0) {
        reasons.push("still_mating");
        return earlyGrade(depth, "Best", reasons);
      }
      reasons.push("missed_mate");
      return { grade: "Blunder", reasons };
    }
    if (playedMateInN !== null && playedMateInN > 0) {
      reasons.push("still_being_mated");
      return { grade: "Mistake", reasons };
    }
    if (playedMateInN !== null && playedMateInN < 0) {
      reasons.push("escaped_mate");
      return earlyGrade(depth, "Excellent", reasons);
    }
    reasons.push("escaped_mate");
    return earlyGrade(depth, "Excellent", reasons);
  }

  /* ── Step 3: Brilliant — sacrifice confirmed by MultiPV gap ── */
  if (playedMove === bestMove && isSacrifice && isOnlyEngineMove) {
    reasons.push("best_move", "sacrifice", "only_engine_move");
    return maybeDowngrade(depth, { grade: "Brilliant", reasons }, reasons);
  }
  if (isSacrifice && isCheck && absLoss <= 50) {
    reasons.push("sacrifice", "check");
    return maybeDowngrade(depth, { grade: "Brilliant", reasons }, reasons);
  }
  if (isSacrifice && isOnlyEngineMove && absLoss <= 30) {
    reasons.push("sacrifice", "only_engine_move");
    return maybeDowngrade(depth, { grade: "Brilliant", reasons }, reasons);
  }

  /* ── Step 4: Best move match (exact) ── */
  if (playedMove === bestMove) {
    reasons.push("best_move");
    return { grade: "Best", reasons };
  }

  /* ── Step 5: Equivalent moves — tiny gap, treat as Excellent ── */
  if (absLoss <= 10) {
    reasons.push("negligible_loss");
    return { grade: "Best", reasons };
  }

  /* ── Step 6: Only-engine-move — player chose the only losing continuation ── */
  if (isOnlyEngineMove && absLoss > 50) {
    reasons.push("only_engine_move", "losing");
    return { grade: "Blunder", reasons };
  }

  /* ── Step 7: Missed win ── */
  if (bestEval > 150 && playedEval < 50) {
    reasons.push("missed_win");
    return { grade: "Mistake", reasons };
  }

  /* ── Step 8: Position-aware scaling ── */
  if (absLoss <= 25) {
    reasons.push("small_loss");
    return { grade: "Excellent", reasons };
  }
  if (absLoss <= 50) {
    reasons.push("small_loss");
    return { grade: "Good", reasons };
  }
  if (absLoss <= 100) {
    reasons.push("medium_loss");
    return { grade: "Inaccuracy", reasons };
  }
  if (absLoss <= 300) {
    reasons.push("large_loss");
    return { grade: "Mistake", reasons };
  }
  reasons.push("large_loss");
  return { grade: "Blunder", reasons };
}

function earlyGrade(depth: number, fallback: MoveGrade, reasons: string[]): ClassifyResult {
  if (depth < MIN_DEPTH_FOR_BRILLIANT && fallback === "Brilliant") {
    reasons.push("shallow_depth_downgrade");
    return { grade: "Best", reasons };
  }
  return { grade: fallback, reasons };
}

function maybeDowngrade(depth: number, result: ClassifyResult, reasons: string[]): ClassifyResult {
  if (depth < MIN_DEPTH_FOR_BRILLIANT && result.grade === "Brilliant") {
    reasons.push("shallow_depth_downgrade");
    return { grade: "Best", reasons };
  }
  return result;
}
