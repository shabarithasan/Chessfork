import { describe, expect, it } from "vitest";

import { detectOpening, formatOpeningName } from "@/lib/chess/openings";

describe("opening detection", () => {
  it("prefers PGN opening headers over the fallback opening book", () => {
    const opening = detectOpening(["e4", "c5"], {
      ECO: "B22",
      Opening: "Sicilian Defense: Alapin Variation",
    });

    expect(opening).toEqual({
      eco: "B22",
      name: "Sicilian Defense",
      variation: "Alapin Variation",
    });
    expect(formatOpeningName(opening)).toBe("Sicilian Defense: Alapin Variation");
  });

  it("derives readable names from Chess.com ECO URLs", () => {
    const opening = detectOpening(["e4", "c6"], {
      ECO: "B10",
      ECOUrl: "https://www.chess.com/openings/Caro-Kann-Defense",
    });

    expect(opening).toEqual({
      eco: "B10",
      name: "Caro-Kann Defense",
      variation: undefined,
    });
  });
});
