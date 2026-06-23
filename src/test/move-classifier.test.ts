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
    const classification = classifyMove({
      bestMoveSan: "Nf3",
      bestScore: 120,
      moveScore: 118,
      playedMoveSan: "Nf3",
      player: "w",
    });

    expect(classification.label).toBe("Best");
    expect(classification.deltaPercent).toBeGreaterThanOrEqual(-0.5);
  });

  it("marks a non-top move with a small loss as Excellent", () => {
    expect(
      classifyMove({
        bestMoveSan: "Nf3",
        bestScore: 100,
        moveScore: 90,
        playedMoveSan: "Bc4",
        player: "w",
      }).label,
    ).toBe("Excellent");
  });

  it.each([
    [-30, "Good"],
    [-50, "Inaccuracy"],
    [-100, "Mistake"],
    [-200, "Blunder"],
  ] as const)("maps a %p cp drop from equality into %s", (moveScore, expected) => {
    expect(
      classifyMove({
        bestMoveSan: "Nf3",
        bestScore: 0,
        moveScore,
        playedMoveSan: "a3",
        player: "w",
      }).label,
    ).toBe(expected);
  });

  it("marks an only-move queen sacrifice that wins from equality as Brilliant", () => {
    const input = {
      alternativeLines: [line("Qxh7+", 260, 1), line("Bc4", -120, 2), line("Re1", -90, 3)],
      bestMoveSan: "Qxh7+",
      bestScore: 0,
      moveScore: 260,
      playedMoveSan: "Qxh7+",
      player: "w" as const,
    };

    expect(shouldProbeOnlyMove(input)).toBe(true);
    expect(classifyMove(input).label).toBe("Brilliant");
  });

  it("uses the relaxed only-move threshold for Great", () => {
    expect(
      classifyMove({
        alternativeLines: [line("Rxe6", 180, 1), line("h3", -55, 2), line("a3", -60, 3)],
        bestMoveSan: "Rxe6",
        bestScore: 0,
        moveScore: 180,
        playedMoveSan: "Rxe6",
        player: "w",
      }).label,
    ).toBe("Great");
  });

  it("inverts scores for black before applying win-probability thresholds", () => {
    expect(
      classifyMove({
        bestMoveSan: "Nf6",
        bestScore: -100,
        moveScore: -90,
        playedMoveSan: "Bc5",
        player: "b",
      }).label,
    ).toBe("Excellent");
  });
});
