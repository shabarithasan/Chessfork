import { describe, expect, it } from "vitest";

import { createPositionEvaluation } from "@/lib/chess/analysis";
import { analyzePosition, evaluateFenMaterial, getEngineSearchSettings } from "@/lib/chess/engine";
import { samplePuzzles } from "@/data/sample-data";

describe("search engine", () => {
  it("finds the forced mate in one puzzle", () => {
    const result = analyzePosition(samplePuzzles[0].fen, getEngineSearchSettings("quick", "position"));

    expect(result.bestMove).toBe("Qf8#");
    expect(result.line[0]).toBe("Qf8#");
  });

  it("searches deeper for deep position requests", () => {
    const quick = createPositionEvaluation(samplePuzzles[0].fen, "quick");
    const deep = createPositionEvaluation(samplePuzzles[0].fen, "deep");

    expect(deep.cacheKey).not.toBe(quick.cacheKey);
    expect(deep.bestMove).toBe("Qf8#");
  });

  it("keeps the starting position near equal after the full evaluation blend", () => {
    const score = evaluateFenMaterial("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

    expect(Math.abs(score)).toBeLessThan(60);
  });

  it("returns searched principal variations from legal move generation", () => {
    const result = analyzePosition("8/8/8/8/8/8/4K3/7k w - - 0 1", {
      maxNodes: 80,
      principalVariationCount: 3,
      principalVariationLength: 3,
      quiescenceDepth: 1,
      searchDepth: 1,
    });

    expect(result.nodes).toBeGreaterThan(0);
    expect(result.engineLines.length).toBeGreaterThan(1);
    expect(result.engineLines.every((line) => line.line[0] === line.san)).toBe(true);
  });
});
