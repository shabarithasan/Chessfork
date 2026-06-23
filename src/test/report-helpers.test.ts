import { describe, expect, it } from "vitest";

import { buildAnalysisStory, formatCpLossLabel, normalizeCpLoss } from "@/lib/chess/report-helpers";
import type { AnalysisRun, MoveEvaluation } from "@/types/platform";

function createMove(overrides: Partial<MoveEvaluation> = {}): MoveEvaluation {
  return {
    ply: 1,
    moveNumber: 1,
    side: "white",
    san: "Qh5",
    from: "d1",
    to: "h5",
    fenBefore: "start",
    fenAfter: "after",
    score: 120,
    caps: 88,
    cpLoss: 42,
    grade: "Good",
    comment: "Playable and practical.",
    bestMove: "e4",
    principalVariation: ["e4", "e5"],
    depth: 12,
    nodes: 1200,
    isCapture: false,
    isCheck: false,
    isCheckmate: false,
    phase: "opening",
    ...overrides,
  };
}

describe("report helpers", () => {
  it("caps impossible centipawn swings for stored evaluations", () => {
    expect(normalizeCpLoss(188_944)).toBe(999);
  });

  it("formats raw mate leaks without dumping giant CPL values into the UI", () => {
    expect(formatCpLossLabel(188_944)).toBe("Mate swing");
  });

  it("rewrites story copy from evaluation data instead of echoing raw mate scores", () => {
    const story = buildAnalysisStory({
      criticalMoments: [
        {
          ply: 1,
          san: "Qh5",
          grade: "Blunder",
          cpLoss: 188_944,
          insight: "White lost control after Qh5.",
        },
      ] satisfies AnalysisRun["criticalMoments"],
      evaluations: [createMove({ cpLoss: 188_944, grade: "Blunder" })],
      moveCount: 1,
      openingName: "Wayward Queen Attack",
      subject: "White",
      white: "White",
      black: "Black",
    });

    expect(story[1]).toContain("mating sequence slipped");
    expect(story[1]).not.toContain("188944");
  });
});
