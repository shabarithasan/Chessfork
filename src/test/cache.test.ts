import { describe, expect, it } from "vitest";

import { createAnalysisCacheKey } from "@/lib/chess/cache";

describe("analysis cache key", () => {
  it("is stable across equivalent FEN strings", () => {
    const a = createAnalysisCacheKey({
      fen: "8/8/8/8/8/8/8/K6k w - - 0 1",
      depth: 12,
      engineVersion: "lite-1",
    });
    const b = createAnalysisCacheKey({
      fen: "8/8/8/8/8/8/8/K6k w - - 24 48",
      depth: 12,
      engineVersion: "lite-1",
    });

    expect(a).toBe(b);
  });
});
