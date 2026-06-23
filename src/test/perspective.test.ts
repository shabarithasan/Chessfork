import { describe, expect, it } from "vitest";

import { resolveReviewSide, scoreForSide, sideForPlayerName } from "@/lib/chess/perspective";
import type { AnalysisRun } from "@/types/platform";

describe("analysis perspective", () => {
  it("resolves the reviewed player from the imported username", () => {
    expect(
      sideForPlayerName({
        black: "Mr-demon-only",
        subject: "mr-demon-only",
        white: "m0kujin",
      }),
    ).toBe("black");
  });

  it("shows engine scores from the reviewed player's side", () => {
    expect(scoreForSide(220, "white")).toBe(220);
    expect(scoreForSide(220, "black")).toBe(-220);
  });

  it("falls back to the first critical move for older saved reports without a subject", () => {
    const run = {
      black: "Player",
      criticalMoments: [{ cpLoss: 120, grade: "Mistake", insight: "Dropped control.", ply: 2, san: "e5" }],
      moveEvaluations: [{ ply: 2, side: "black" }],
      white: "Opponent",
    } as AnalysisRun;

    expect(resolveReviewSide(run)).toBe("black");
  });
});
