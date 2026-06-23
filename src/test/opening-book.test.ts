import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { findOpeningBookMoves, polyglotHashFen } from "@/server/chess/opening-book";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function encodePolyglotMove(uci: string) {
  const files = "abcdefgh";
  const fromFile = files.indexOf(uci[0]);
  const fromRank = Number(uci[1]) - 1;
  const toFile = files.indexOf(uci[2]);
  const toRank = Number(uci[3]) - 1;
  const promotionPieces: Record<string, number> = {
    n: 1,
    b: 2,
    r: 3,
    q: 4,
  };
  const promotion = promotionPieces[uci[4]] ?? 0;

  return toFile | (toRank << 3) | (fromFile << 6) | (fromRank << 9) | (promotion << 12);
}

function createPolyglotRecord(params: { key: bigint; move: string; weight: number }) {
  const buffer = Buffer.alloc(16);
  buffer.writeBigUInt64BE(params.key, 0);
  buffer.writeUInt16BE(encodePolyglotMove(params.move), 8);
  buffer.writeUInt16BE(params.weight, 10);
  buffer.writeUInt32BE(0, 12);

  return buffer;
}

describe("polyglot opening book", () => {
  it("computes the standard starting-position Polyglot hash", () => {
    expect(polyglotHashFen(START_FEN).toString(16)).toBe("463b96181691fc9c");
  });

  it("finds a played move inside a Polyglot book file", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "chessfork-book-"));
    const bookPath = path.join(tempRoot, "tiny.bin");

    try {
      await writeFile(bookPath, createPolyglotRecord({ key: polyglotHashFen(START_FEN), move: "e2e4", weight: 42 }));

      const moves = await findOpeningBookMoves(START_FEN, bookPath);

      expect(moves).toEqual([{ learn: 0, uci: "e2e4", weight: 42 }]);
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
