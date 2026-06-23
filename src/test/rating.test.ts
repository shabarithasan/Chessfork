import { describe, expect, it } from "vitest";

import {
  accuracyFromAverageCpLoss,
  capsFromEvaluations,
  calculateRatingChange,
  expectedScore,
  winProbabilityFromCentipawns,
} from "@/lib/chess/rating";

describe("rating helpers", () => {
  it("calculates expected score symmetrically", () => {
    expect(expectedScore(1800, 1800)).toBeCloseTo(0.5, 5);
    expect(expectedScore(2000, 1800)).toBeGreaterThan(0.7);
  });

  it("returns positive rating change for a win over a stronger opponent", () => {
    expect(
      calculateRatingChange({
        playerRating: 1800,
        opponentRating: 1920,
        result: 1,
      }),
    ).toBeGreaterThan(0);
  });

  it("maps lower average cp loss to higher accuracy", () => {
    expect(accuracyFromAverageCpLoss(40)).toBeGreaterThan(accuracyFromAverageCpLoss(120));
  });

  it("calculates CAPS from win-probability deltas", () => {
    expect(winProbabilityFromCentipawns(0)).toBeCloseTo(0.5, 5);
    expect(capsFromEvaluations({ bestScore: 120, moveScore: 120 })).toBe(100);
    expect(capsFromEvaluations({ bestScore: 120, moveScore: -400 })).toBe(0);
  });
});
