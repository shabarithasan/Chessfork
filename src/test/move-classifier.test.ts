import { describe, expect, it } from "vitest";

import { classifyMove, shouldProbeOnlyMove } from "@/server/chess/move-classifier";
import type { EngineLine } from "@/types/platform";

function line(san: string, score: number, rank: number): EngineLine {
  return {
    depth: 18,
    line: [san],
    nodes: 1000,
    rank,
    san,
    score,
  };
}

describe("move classifier", () => {
  it("marks a top engine move with tiny winning-chance loss as Best", () => {
    // Player plays best move: bestScore=120 (player +120), moveScore=-120 (opponent sees -120 = player +120)
    const classification = classifyMove({
      bestMoveSan: "Nf3",
      bestScore: 120,
      moveScore: -120,
      playedMoveSan: "Nf3",
    });

    expect(classification.label).toBe("Best");
    expect(classification.deltaPercent).toBeGreaterThanOrEqual(-0.5);
  });

  it("marks a non-top move with a small loss as Excellent", () => {
    // bestScore=100 (player +100), moveScore=-90 (opponent sees -90 = player +90), so player lost 10cp
    expect(
      classifyMove({
        bestMoveSan: "Nf3",
        bestScore: 100,
        moveScore: -90,
        playedMoveSan: "Bc4",
      }).label,
    ).toBe("Excellent");
  });

  it.each([
    [-30, "Good"],
    [-50, "Inaccuracy"],
    [-100, "Mistake"],
    [-200, "Blunder"],
  ] as const)("maps a %p cp drop from equality into %s", (moveScore, expected) => {
    // From equality (bestScore=0), best move keeps equality (moveScore=0)
    // Played move gives opponent moveScore = -cpLoss (opponent sees player's advantage as negative)
    // So if player loses 30cp, moveScore = -(-30) = 30? Wait...
    // If bestScore=0 (equality), and player plays a move losing 30cp, player's advantage becomes -30.
    // Opponent's perspective: +30. So moveScore = 30.
    expect(
      classifyMove({
        bestMoveSan: "Nf3",
        bestScore: 0,
        moveScore: -moveScore,
        playedMoveSan: "a3",
      }).label,
    ).toBe(expected);
  });

  it("marks an only-move queen sacrifice that wins from equality as Brilliant", () => {
    // bestScore=0 (equality), best move Qxh7+ wins by 260cp (opponent sees -260)
    // Alternative lines from player's perspective: Qxh7+ = 260 (winning), Bc4 = -120 (losing), Re1 = -90
    const input = {
      alternativeLines: [line("Qxh7+", 260, 1), line("Bc4", -120, 2), line("Re1", -90, 3)],
      bestMoveSan: "Qxh7+",
      bestScore: 0,
      moveScore: -260,
      playedMoveSan: "Qxh7+",
    };

    expect(shouldProbeOnlyMove(input)).toBe(true);
    expect(classifyMove(input).label).toBe("Brilliant");
  });

  it("uses the relaxed only-move threshold for Great", () => {
    // bestScore=0, best move Rxe6 wins by 180cp (opponent sees -180)
    // Alternatives: Rxe6 = 180 (best), h3 = -55, a3 = -60
    expect(
      classifyMove({
        alternativeLines: [line("Rxe6", 180, 1), line("h3", -55, 2), line("a3", -60, 3)],
        bestMoveSan: "Rxe6",
        bestScore: 0,
        moveScore: -180,
        playedMoveSan: "Rxe6",
      }).label,
    ).toBe("Great");
  });

  it("handles black-to-move scores correctly (engine returns from side-to-move perspective)", () => {
    // Equal position (bestScore=0), black plays move winning by 100cp (white sees -100)
    // 100cp ≈ 14% win prob gain (< 15% Brilliant threshold) -> Best
    expect(
      classifyMove({
        bestMoveSan: "Nf6",
        bestScore: 0,
        moveScore: -100,
        playedMoveSan: "Bc5",
      }).label,
    ).toBe("Best");
  });
});
