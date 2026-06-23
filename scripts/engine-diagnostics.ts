import { detectOpening } from "@/lib/chess/openings";
import { parsePgn, readHeaders } from "@/lib/chess/pgn";
import { analyzePgnWithBestEngine } from "@/server/chess/stockfish-report";
import { getOpeningBookStatus } from "@/server/chess/opening-book";
import {
  getStockfishSearchSettings,
  resolveStockfishBinaryPath,
  stockfishAvailable,
  withStockfishSession,
} from "@/server/chess/stockfish";
import { env } from "@/server/env";

const diagnosticPgn = `[Event "Engine Diagnostic"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 *`;
const tablebaseProbeFen = "7k/8/8/8/8/8/8/K6Q w - - 0 1";

function tablebaseHitsForMove(move: Awaited<ReturnType<typeof analyzePgnWithBestEngine>>["moveEvaluations"][number]) {
  return move.engineLines?.reduce((total, line) => total + (line.tablebaseHits ?? 0), 0) ?? 0;
}

const available = await stockfishAvailable();
const binaryPath = await resolveStockfishBinaryPath();
const settings = getStockfishSearchSettings("deep", "report");
const headers = readHeaders(diagnosticPgn);
const moves = parsePgn(diagnosticPgn);
const opening = detectOpening(moves.map((move) => move.san), headers);
const openingBook = await getOpeningBookStatus();
const tablebaseProbe =
  available && env.STOCKFISH_SYZYGY_PATH
    ? await withStockfishSession((session) =>
        session.analyzeFen(tablebaseProbeFen, {
          ...getStockfishSearchSettings("quick", "position"),
          depth: 4,
          moveTimeMs: env.QUICK_MOVETIME,
          principalVariationCount: 1,
        }),
      )
    : null;
const report = await analyzePgnWithBestEngine(diagnosticPgn, {
  requestedDepth: "deep",
  source: "pgn",
  subject: "White",
});

const diagnostics = {
  engine: {
    available,
    binaryPath,
    configuredDepth: settings.depth,
    actualMoveDepth: settings.actualMoveDepth,
    moveTimeMs: settings.moveTimeMs,
    searchLimit: settings.searchLimit,
    hashMb: settings.hashMb,
    multiPvBestMove: settings.principalVariationCount,
    threads: settings.threads,
  },
  syzygy: {
    configured: env.STOCKFISH_SYZYGY_PATH.length > 0,
    path: env.STOCKFISH_SYZYGY_PATH || null,
    probeDepth: env.STOCKFISH_SYZYGY_PROBE_DEPTH,
    probeLimit: env.STOCKFISH_SYZYGY_PROBE_LIMIT,
    probeHits: report.moveEvaluations.reduce((total, move) => total + tablebaseHitsForMove(move), 0),
    verificationFen: tablebaseProbeFen,
    verificationProbeHits: tablebaseProbe?.tablebaseHits ?? 0,
  },
  openingBook: {
    ...openingBook,
    engineOverrideEnabled: openingBook.exists,
    bookHits: report.moveEvaluations.filter((move) => move.depth === 0 && move.grade === "Book").length,
    detectedOpening: opening,
  },
  moves: report.moveEvaluations.map((move) => ({
    ply: move.ply,
    san: move.san,
    label: move.label ?? move.grade,
    bookHit: move.depth === 0 && move.grade === "Book",
    score: move.score,
    depth: move.depth,
    caps: Number(move.caps.toFixed(2)),
    cpLoss: move.cpLoss,
    bestMove: move.bestMove,
    tablebaseHits: tablebaseHitsForMove(move),
    principalVariation: move.principalVariation,
  })),
};

console.log(JSON.stringify(diagnostics, null, 2));
