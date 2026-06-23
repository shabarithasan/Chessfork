import { describe, expect, it } from "vitest";

import { analyzePgn } from "@/lib/chess/analysis";
import { samplePgn } from "@/data/sample-data";

const shortPgn = `[Event "Short Test"]
[White "A"]
[Black "B"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6`;

describe("pgn analysis", () => {
  it("builds a report with move evaluations and opening tags", () => {
    const report = analyzePgn(samplePgn, {
      requestedDepth: "quick",
    });

    expect(report.moveEvaluations.length).toBeGreaterThan(10);
    expect(report.opening.name.length).toBeGreaterThan(0);
    expect(report.summary).toContain("analyzed");
  });

  it("uses a stronger search depth for deep reports", () => {
    const quick = analyzePgn(shortPgn, {
      requestedDepth: "quick",
    });
    const deep = analyzePgn(shortPgn, {
      requestedDepth: "deep",
    });

    expect(deep.moveEvaluations[0]?.depth).toBeGreaterThan(quick.moveEvaluations[0]?.depth ?? 0);
    expect(deep.bestMoveChain.length).toBeGreaterThanOrEqual(quick.bestMoveChain.length);
  }, 10000);
});
