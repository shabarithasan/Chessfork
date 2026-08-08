import { Chess } from "chess.js";

import { createAnalysisCacheKey } from "@/lib/chess/cache";
import { analyzePgn, createPositionEvaluation } from "@/lib/chess/analysis";
import { detectOpening } from "@/lib/chess/openings";
import { parsePgn, readHeaders } from "@/lib/chess/pgn";
import { sideForPlayerName } from "@/lib/chess/perspective";
import { buildAnalysisStory, normalizeCpLoss } from "@/lib/chess/report-helpers";
import { accuracyFromCaps, capsFromEvaluations } from "@/lib/chess/rating";
import { chooseAnalysisMode } from "@/lib/chess/router";
import { clamp, hashString, slugify } from "@/lib/utils";
import { classifyMove, shouldProbeOnlyMove } from "@/server/chess/move-classifier";
import { lookupOpeningBookMove, openingBookCacheSignature } from "@/server/chess/opening-book";
import { withStockfishSession, getStockfishSearchSettings, stockfishAvailable, STOCKFISH_ENGINE_VERSION } from "@/server/chess/stockfish";
import type { AnalysisDepth, AnalysisRun, MoveEvaluation, MoveGrade } from "@/types/platform";

const globalForStockfishReportCache = globalThis as typeof globalThis & {
  __knightowlStockfishReports?: Map<string, AnalysisRun>;
};

const MAX_ONLY_MOVE_PROBE_MULTIPV_BY_DEPTH: Record<AnalysisDepth, number> = {
  deep: 6,
  quick: 4,
};

export type MoveAnalysisProgress = {
  move: MoveEvaluation;
  moveIndex: number;
  totalMoves: number;
};

const PRINCIPLED_OPENING_MOVES = new Set([
  "a3",
  "a6",
  "Ba4",
  "Bb3",
  "Bb4",
  "Bb5",
  "Bb7",
  "Bc4",
  "Bc5",
  "Bd3",
  "Be2",
  "Be7",
  "Bg2",
  "Bg7",
  "b3",
  "b5",
  "b6",
  "c3",
  "c4",
  "c5",
  "c6",
  "d3",
  "d4",
  "d5",
  "d6",
  "e4",
  "e5",
  "e6",
  "f4",
  "g3",
  "g6",
  "h3",
  "h6",
  "Na3",
  "Na6",
  "Nc3",
  "Nc6",
  "Nf3",
  "Nf6",
  "Nh3",
  "Nh6",
  "Nbd2",
  "Nbd7",
  "O-O",
  "O-O-O",
  "Re1",
]);

function getReportCache() {
  if (!globalForStockfishReportCache.__knightowlStockfishReports) {
    globalForStockfishReportCache.__knightowlStockfishReports = new Map();
  }

  return globalForStockfishReportCache.__knightowlStockfishReports;
}

function cloneReport(report: AnalysisRun) {
  return {
    ...report,
    story: [...report.story],
    bestMoveChain: [...report.bestMoveChain],
    criticalMoments: report.criticalMoments.map((moment) => ({ ...moment })),
    moveEvaluations: report.moveEvaluations.map((move) => ({
      ...move,
      engineLines: move.engineLines?.map((line) => ({ ...line, line: [...line.line] })),
      principalVariation: [...move.principalVariation],
      refutationLine: move.refutationLine ? { ...move.refutationLine, line: [...move.refutationLine.line] } : undefined,
    })),
  };
}

function moveToUci(move: ReturnType<typeof parsePgn>[number]) {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

function uciToSan(fen: string, uci: string) {
  const chess = new Chess(fen);

  try {
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
    });

    return move?.san ?? uci;
  } catch {
    return uci;
  }
}

function buildComment(grade: MoveGrade, cpLoss: number) {
  const messages: Record<MoveGrade, string> = {
    Best: "Best move. It lines up with the engine's preferred continuation.",
    Brilliant: "You found the cleanest continuation and kept full pressure on the position.",
    Excellent: "Excellent move. It stays very close to the engine's preferred path.",
    Great: "Great find. You found a difficult resource when alternatives dropped winning chances.",
    Good: "Playable and practical, though not the sharpest option in the position.",
    Book: "Book move: a typical opening move from known theory.",
    Inaccuracy: `You gave away roughly ${cpLoss} centipawns and drifted from the best plan.`,
    Mistake: "This changes the character of the game and gives your opponent real chances.",
    Blunder: "A decisive swing. This is the kind of moment your training queue should revisit.",
  };

  return messages[grade];
}

function determinePhase(ply: number, moveCount: number): MoveEvaluation["phase"] {
  if (ply <= 16) {
    return "opening";
  }

  if (moveCount - ply <= 12) {
    return "endgame";
  }

  return "middlegame";
}

function isPrincipledOpeningMove(move: ReturnType<typeof parsePgn>[number]) {
  const normalizedSan = move.san.replace(/[+#?!]/g, "");
  return !move.isCapture() && PRINCIPLED_OPENING_MOVES.has(normalizedSan);
}

function countLegalMoves(fen: string) {
  return new Chess(fen).moves().length;
}

function positionAnalysisCacheKey(
  fen: string,
  settings: {
    depth: number;
    hashMb: number;
    moveTimeMs: number;
    principalVariationCount: number;
    principalVariationLength: number;
    searchLimit: "depth" | "movetime";
    threads: number;
  },
) {
  return JSON.stringify({
    fen,
    depth: settings.depth,
    hashMb: settings.hashMb,
    moveTimeMs: settings.moveTimeMs,
    principalVariationCount: settings.principalVariationCount,
    principalVariationLength: settings.principalVariationLength,
    searchLimit: settings.searchLimit,
    threads: settings.threads,
  });
}

function logMoveAnalysis(params: {
  bookUsed: boolean;
  caps: number;
  depth: number;
  elapsedMs: number;
  label: MoveGrade;
  mode: AnalysisDepth;
  ply: number;
  san: string;
  tablebaseHits: number;
}) {
  console.info(
    `[analysis] mode=${params.mode} ply=${params.ply} san=${params.san} label=${params.label} depth=${params.depth} timeMs=${params.elapsedMs} syzygyHits=${params.tablebaseHits} book=${params.bookUsed} caps=${params.caps.toFixed(2)}`,
  );
}

function buildReport(params: {
  evaluations: MoveEvaluation[];
  headers: Record<string, string>;
  moveCount: number;
  pgn: string;
  requestedDepth: AnalysisDepth;
  sans: string[];
  source?: AnalysisRun["source"];
  subject?: string;
  bestMoveChain: string[];
}): AnalysisRun {
  const capsWhite = params.evaluations.filter((move) => move.side === "white").map((move) => move.caps);
  const capsBlack = params.evaluations.filter((move) => move.side === "black").map((move) => move.caps);
  const criticalMoments = params.evaluations
    .filter((move) => move.cpLoss >= 90)
    .slice(0, 6)
    .map((move) => ({
      ply: move.ply,
      san: move.san,
      grade: move.grade,
      cpLoss: move.cpLoss,
      insight: `${move.side === "white" ? "White" : "Black"} lost control after ${move.san}.`,
    }));
  const accuracyWhite = accuracyFromCaps(capsWhite);
  const accuracyBlack = accuracyFromCaps(capsBlack);
  const opening = detectOpening(params.sans, params.headers);
  const title = params.headers.Event || `${params.headers.White ?? "White"} vs ${params.headers.Black ?? "Black"}`;
  const subject = params.subject ?? params.headers.White ?? "Anonymous player";
  const subjectColor = sideForPlayerName({
    black: params.headers.Black ?? "Black",
    subject,
    white: params.headers.White ?? "White",
  });
  const mode = chooseAnalysisMode({
    isAnonymous: !subject || subject === "Anonymous player",
    prefersDeep: params.requestedDepth === "deep",
  });
  const shareSlug = slugify(`${title}-${hashString(params.pgn)}`);

  return {
    id: shareSlug,
    source: params.source ?? "pgn",
    title,
    white: params.headers.White ?? "White",
    black: params.headers.Black ?? "Black",
    result: params.headers.Result ?? "*",
    timeControl: params.headers.TimeControl ?? "600+0",
    playedAt: params.headers.Date ?? "2026.05.18",
    opening,
    accuracyWhite: clamp(accuracyWhite, 0, 100),
    accuracyBlack: clamp(accuracyBlack, 0, 100),
    moveCount: params.moveCount,
    pgn: params.pgn,
    mode,
    depth: params.requestedDepth,
    status: "complete",
    subject,
    subjectColor,
    createdAt: new Date().toISOString(),
    summary: `${opening.name} analyzed over ${params.moveCount} plies. ${criticalMoments.length} critical moments, ${Math.round(
      accuracyWhite,
    )}% vs ${Math.round(accuracyBlack)}% accuracy.`,
    story: buildAnalysisStory({
      criticalMoments,
      evaluations: params.evaluations,
      moveCount: params.moveCount,
      openingName: opening.name,
      subject,
      white: params.headers.White ?? "White",
      black: params.headers.Black ?? "Black",
    }),
    moveEvaluations: params.evaluations,
    criticalMoments,
    bestMoveChain: params.bestMoveChain,
    shareSlug,
  };
}

export async function analyzePgnWithBestEngine(
  pgn: string,
  options?: {
    onMoveAnalyzed?: (progress: MoveAnalysisProgress) => Promise<void> | void;
    requestedDepth?: AnalysisDepth;
    subject?: string;
    source?: AnalysisRun["source"];
  },
) {
  if (!(await stockfishAvailable())) {
    const fallbackReport = analyzePgn(pgn, options);

    for (const [moveIndex, move] of fallbackReport.moveEvaluations.entries()) {
      await options?.onMoveAnalyzed?.({
        move,
        moveIndex,
        totalMoves: fallbackReport.moveEvaluations.length,
      });
    }

    return fallbackReport;
  }

  const requestedDepth = options?.requestedDepth ?? "quick";
  const cacheKey = JSON.stringify({
    pgnHash: hashString(pgn),
    requestedDepth,
    source: options?.source ?? "pgn",
    subject: options?.subject ?? "",
    engine: STOCKFISH_ENGINE_VERSION,
    openingBook: openingBookCacheSignature(),
    scoring: "caps-classifier-1",
  });
  const cached = getReportCache().get(cacheKey);
  if (cached) {
    for (const [moveIndex, move] of cached.moveEvaluations.entries()) {
      await options?.onMoveAnalyzed?.({
        move,
        moveIndex,
        totalMoves: cached.moveEvaluations.length,
      });
    }

    return cloneReport(cached);
  }

  const headers = readHeaders(pgn);
  const moves = parsePgn(pgn);
  const replay = new Chess();
  const sans = moves.map((move) => move.san);
  const bestMoveChain: string[] = [];
  const evaluations: MoveEvaluation[] = [];
  const settings = getStockfishSearchSettings(requestedDepth, "report");

  const report = await withStockfishSession(async (session) => {
    const positionAnalysisCache = new Map<string, Awaited<ReturnType<typeof session.analyzeFen>>>();
    const analyzeFenCached = async (
      fen: string,
      analysisSettings: Parameters<typeof session.analyzeFen>[1] = settings,
    ) => {
      const analysisCacheKey = positionAnalysisCacheKey(fen, analysisSettings);
      const cachedAnalysis = positionAnalysisCache.get(analysisCacheKey);
      if (cachedAnalysis) {
        return cachedAnalysis;
      }

      const analysis = await session.analyzeFen(fen, analysisSettings);
      positionAnalysisCache.set(analysisCacheKey, analysis);
      return analysis;
    };

    for (let index = 0; index < moves.length; index += 1) {
      const moveStartedAt = Date.now();
      const move = moves[index];
      const fenBefore = replay.fen();
      const turn = replay.turn();
      replay.move(move);
      const fenAfter = replay.fen();
      const phase = determinePhase(index + 1, moves.length);
      const bookLookup = await lookupOpeningBookMove({
        fen: fenBefore,
        playedUci: moveToUci(move),
        ply: index + 1,
      });

      if (bookLookup.hit) {
        const bestBookSan = bookLookup.bestMove ? uciToSan(fenBefore, bookLookup.bestMove.uci) : move.san;
        const bookCandidateMoves =
          bookLookup.moves.length > 0
            ? bookLookup.moves.slice(0, 3)
            : bookLookup.matchingMove
              ? [bookLookup.matchingMove]
              : [];
        const bookLines = bookCandidateMoves.map((bookMove, rank) => {
          const san = uciToSan(fenBefore, bookMove.uci);

          return {
            depth: 0,
            line: [san],
            nodes: 0,
            rank: rank + 1,
            san,
            score: 0,
            tablebaseHits: 0,
          };
        });

        if (index < 3) {
          bestMoveChain.push(bestBookSan);
        }

        console.info(
          `[opening-book] Book hit at ply ${index + 1}: ${move.san} from ${bookLookup.bookPath ?? "configured book"}`,
        );
        logMoveAnalysis({
          bookUsed: true,
          caps: 100,
          depth: 0,
          elapsedMs: Date.now() - moveStartedAt,
          label: "Book",
          mode: requestedDepth,
          ply: index + 1,
          san: move.san,
          tablebaseHits: 0,
        });

        const bookEvaluation = {
          ply: index + 1,
          moveNumber: Math.floor(index / 2) + 1,
          side: turn === "w" ? "white" : "black",
          san: move.san,
          from: move.from,
          to: move.to,
          fenBefore,
          fenAfter,
          score: 0,
          caps: 100,
          cpLoss: 0,
          grade: "Book",
          label: "Book",
          comment: buildComment("Book", 0),
          bestMove: bestBookSan,
          engineLines: bookLines,
          principalVariation: [move.san],
          depth: 0,
          nodes: 0,
          isCapture: move.isCapture(),
          isCheck: replay.isCheck(),
          isCheckmate: replay.isCheckmate(),
          phase,
        } satisfies MoveEvaluation;

        evaluations.push(bookEvaluation);
        await options?.onMoveAnalyzed?.({
          move: bookEvaluation,
          moveIndex: index,
          totalMoves: moves.length,
        });
        continue;
      }

      const best = await analyzeFenCached(fenBefore, settings);
      const actual = await analyzeFenCached(fenAfter, {
        ...settings,
        depth: settings.actualMoveDepth,
      });

      const bestMoverScore = turn === "w" ? best.score : -best.score;
      const actualMoverScore = turn === "w" ? actual.score : -actual.score;
      let actualScore = actual.score;
      let caps = capsFromEvaluations({
        bestScore: bestMoverScore,
        moveScore: actualMoverScore,
      });
      let cpLoss = normalizeCpLoss(bestMoverScore - actualMoverScore);

      if (index < 3) {
        bestMoveChain.push(best.bestMove);
      }

      const classificationInput = {
        bestMoveSan: best.bestMove,
        bestScore: bestMoverScore,
        moveScore: actualMoverScore,
        playedMoveSan: move.san,
      };
      const needsOnlyMoveProbe = shouldProbeOnlyMove(classificationInput);
      const needsRefutationLines = cpLoss >= 90;
      const needsDeepAlternativeLines = requestedDepth === "deep" && needsRefutationLines;
      const alternativeLines = needsOnlyMoveProbe
        ? await analyzeFenCached(fenBefore, {
            ...settings,
            principalVariationCount: Math.min(
              countLegalMoves(fenBefore),
              MAX_ONLY_MOVE_PROBE_MULTIPV_BY_DEPTH[requestedDepth],
            ),
          })
        : needsDeepAlternativeLines
          ? await analyzeFenCached(fenBefore, {
              ...settings,
              principalVariationCount: 3,
            })
          : best;
      const classification = classifyMove({
        ...classificationInput,
        alternativeLines: alternativeLines.engineLines.map(line => ({
          ...line,
          score: turn === "w" ? line.score : -line.score,
        })),
      });
      const grade = classification.label;
      const tablebaseHits =
        best.tablebaseHits +
        actual.tablebaseHits +
        (needsOnlyMoveProbe || needsDeepAlternativeLines ? alternativeLines.tablebaseHits : 0);
      const refutationLine =
        needsRefutationLines && actual.line.length > 0
          ? {
              depth: actual.depth,
              line: actual.line,
              nodes: actual.nodes,
              rank: 1,
              san: actual.line[0],
              score: actual.score,
              tablebaseHits: actual.tablebaseHits,
            }
          : undefined;

      logMoveAnalysis({
        bookUsed: false,
        caps,
        depth: Math.max(best.depth, actual.depth),
        elapsedMs: Date.now() - moveStartedAt,
        label: grade,
        mode: requestedDepth,
        ply: index + 1,
        san: move.san,
        tablebaseHits,
      });

      const evaluation = {
        ply: index + 1,
        moveNumber: Math.floor(index / 2) + 1,
        side: turn === "w" ? "white" : "black",
        san: move.san,
        from: move.from,
        to: move.to,
        fenBefore,
        fenAfter,
        score: actualScore,
        caps,
        cpLoss,
        grade,
        label: grade,
        comment: buildComment(grade, cpLoss),
        bestMove: best.bestMove,
        engineLines: alternativeLines.engineLines,
        principalVariation: best.line,
        refutationLine,
        depth: best.depth,
        nodes: best.nodes,
        isCapture: move.isCapture(),
        isCheck: replay.isCheck(),
        isCheckmate: replay.isCheckmate(),
        phase,
      } satisfies MoveEvaluation;

      evaluations.push(evaluation);
      await options?.onMoveAnalyzed?.({
        move: evaluation,
        moveIndex: index,
        totalMoves: moves.length,
      });
    }

    return buildReport({
      evaluations,
      headers,
      moveCount: moves.length,
      pgn,
      requestedDepth,
      sans,
      source: options?.source,
      subject: options?.subject,
      bestMoveChain,
    });
  });

  getReportCache().set(cacheKey, report);
  return cloneReport(report);
}

export async function createPositionEvaluationWithBestEngine(fen: string, requestedDepth: AnalysisDepth = "quick") {
  if (!(await stockfishAvailable())) {
    return createPositionEvaluation(fen, requestedDepth);
  }

  const settings = getStockfishSearchSettings(requestedDepth, "position");
  const analysis = await withStockfishSession((session) => session.analyzeFen(fen, settings));

  return {
    cacheKey: createAnalysisCacheKey({
      fen,
      depth: settings.depth,
      engineVersion: STOCKFISH_ENGINE_VERSION,
    }),
    mode: chooseAnalysisMode({ isAnonymous: true }),
    bestMove: analysis.bestMove,
    score: analysis.score,
    depth: analysis.depth,
    engineLines: analysis.engineLines,
    nodes: analysis.nodes,
    principalVariation: analysis.line,
    tablebaseHits: analysis.tablebaseHits,
  };
}
