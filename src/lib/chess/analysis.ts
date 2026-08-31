import { Chess } from "chess.js";

import { createAnalysisCacheKey } from "@/lib/chess/cache";
import { analyzePosition, ENGINE_VERSION, evaluateFenMaterial, getEngineSearchSettings } from "@/lib/chess/engine";
import { detectOpening } from "@/lib/chess/openings";
import { parsePgn, readHeaders } from "@/lib/chess/pgn";
import { sideForPlayerName } from "@/lib/chess/perspective";
import { buildAnalysisStory, normalizeCpLoss } from "@/lib/chess/report-helpers";
import { accuracyFromCaps, capsFromEvaluations } from "@/lib/chess/rating";
import { chooseAnalysisMode } from "@/lib/chess/router";
import { clamp, hashString, slugify } from "@/lib/utils";
import type { AnalysisRun, AnalysisDepth, MoveEvaluation, MoveGrade } from "@/types/platform";

const globalForAnalysisCache = globalThis as typeof globalThis & {
  __knightowlComputedReports?: Map<string, AnalysisRun>;
};

function getAnalysisCache() {
  if (!globalForAnalysisCache.__knightowlComputedReports) {
    globalForAnalysisCache.__knightowlComputedReports = new Map();
  }

  return globalForAnalysisCache.__knightowlComputedReports;
}

function gradeMove(cpLoss: number, moveNumber: number): MoveGrade {
  if (moveNumber <= 8 && cpLoss < 20) return "Book";
  if (moveNumber > 12 && cpLoss <= 2) return "Brilliant";
  if (cpLoss <= 5) return "Best";
  if (cpLoss <= 15) return "Excellent";
  if (cpLoss <= 30) return "Great";
  if (cpLoss <= 60) return "Good";
  if (cpLoss <= 120) return "Inaccuracy";
  if (cpLoss <= 250) return "Mistake";
  return "Blunder";
}

function buildComment(grade: MoveGrade, cpLoss: number) {
  const messages: Record<MoveGrade, string> = {
    Best: "Best move. It lines up with the engine's preferred continuation.",
    Nice: "A solid, sensible move that doesn't lose your advantage.",
    Brilliant: "You found the cleanest continuation and kept full pressure on the position.",
    Excellent: "Excellent move. It stays very close to the engine's preferred path.",
    Great: "Solid move. It keeps your plan coherent and preserves the evaluation.",
    Good: "Playable and practical, though not the sharpest option in the position.",
    Book: "Book move: a typical opening move from known theory.",
    Inaccuracy: `You gave away roughly ${cpLoss} centipawns and drifted from the best plan.`,
    Mistake: `This changes the character of the game and gives your opponent real chances.`,
    Blunder: `This completely changes the evaluation and loses the position.`,
    Miss: `A missed opportunity to find a much better line.`,
  };

  return messages[grade];
}

function buildMoveOutcome(
  best: ReturnType<typeof analyzePosition>,
  moveSan: string,
  turn: "w" | "b",
  fenAfter: string,
) {
  const actualScore = best.moveScores[moveSan] ?? evaluateFenMaterial(fenAfter);
  const bestMoverScore = turn === "w" ? best.score : -best.score;
  const actualMoverScore = turn === "w" ? actualScore : -actualScore;
  const cpLoss = normalizeCpLoss(bestMoverScore - actualMoverScore);
  const caps = capsFromEvaluations({
    bestScore: bestMoverScore,
    moveScore: actualMoverScore,
  });

  return {
    actualScore,
    caps,
    cpLoss,
  };
}

function shouldDeepenMove(params: {
  index: number;
  move: ReturnType<typeof parsePgn>[number];
  cpLoss: number;
}) {
  return (
    params.index < 2 ||
    params.cpLoss >= 90 ||
    (params.move.isCapture() && params.cpLoss >= 45) ||
    params.move.san.includes("+") ||
    params.move.san.includes("#")
  );
}

function shouldRefineQuickMove(params: {
  move: ReturnType<typeof parsePgn>[number];
  cpLoss: number;
}) {
  return (
    params.cpLoss >= 70 ||
    params.move.san.includes("+") ||
    params.move.san.includes("#")
  );
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

function isPrincipledOpeningMove(move: ReturnType<typeof parsePgn>[number]) {
  const normalizedSan = move.san.replace(/[+#?!]/g, "");
  return !move.isCapture() && PRINCIPLED_OPENING_MOVES.has(normalizedSan);
}

export function analyzePgn(
  pgn: string,
  options?: {
    requestedDepth?: AnalysisDepth;
    subject?: string;
    source?: AnalysisRun["source"];
  },
) {
  const cacheKey = JSON.stringify({
    pgnHash: hashString(pgn),
    requestedDepth: options?.requestedDepth ?? "quick",
    source: options?.source ?? "pgn",
    subject: options?.subject ?? "",
    engineVersion: ENGINE_VERSION,
    scoring: "caps-1",
  });
  const cached = getAnalysisCache().get(cacheKey);
  if (cached) {
    return {
      ...cached,
      story: [...cached.story],
      bestMoveChain: [...cached.bestMoveChain],
      criticalMoments: cached.criticalMoments.map((moment) => ({ ...moment })),
      moveEvaluations: cached.moveEvaluations.map((move) => ({
        ...move,
        engineLines: move.engineLines?.map((line) => ({ ...line, line: [...line.line] })),
        principalVariation: [...move.principalVariation],
        refutationLine: move.refutationLine ? { ...move.refutationLine, line: [...move.refutationLine.line] } : undefined,
      })),
    };
  }

  const headers = readHeaders(pgn);
  const moves = parsePgn(pgn);
  const replay = new Chess();
  const sans = moves.map((move) => move.san);
  const evaluations: MoveEvaluation[] = [];
  const capsWhite: number[] = [];
  const capsBlack: number[] = [];
  const bestLine: string[] = [];
  const requestedDepth = options?.requestedDepth ?? "quick";
  const quickEngineSettings = getEngineSearchSettings("quick", "report");
  const refinedQuickEngineSettings = {
    maxNodes: 120,
    searchDepth: 2,
    quiescenceDepth: 3,
    principalVariationCount: 5,
    principalVariationLength: 4,
  };
  const deepEngineSettings = getEngineSearchSettings("deep", "report");

  for (let index = 0; index < moves.length; index += 1) {
    const move = moves[index];
    const fenBefore = replay.fen();
    const turn = replay.turn();
    replay.move(move);
    const fenAfter = replay.fen();
    let best = analyzePosition(
      fenBefore,
      requestedDepth === "deep" ? refinedQuickEngineSettings : quickEngineSettings,
    );
    let outcome = buildMoveOutcome(best, move.san, turn, fenAfter);

    if (
      requestedDepth === "quick" &&
      best.depth < refinedQuickEngineSettings.searchDepth &&
      shouldRefineQuickMove({
        move,
        cpLoss: outcome.cpLoss,
      })
    ) {
      best = analyzePosition(fenBefore, refinedQuickEngineSettings);
      outcome = buildMoveOutcome(best, move.san, turn, fenAfter);
    }

    if (
      requestedDepth === "deep" &&
      best.depth < deepEngineSettings.searchDepth &&
      shouldDeepenMove({
        index,
        move,
        cpLoss: outcome.cpLoss,
      })
    ) {
      best = analyzePosition(fenBefore, deepEngineSettings);
      outcome = buildMoveOutcome(best, move.san, turn, fenAfter);
    }

    const actualScore = outcome.actualScore;
    const caps = outcome.caps;
    const cpLoss = outcome.cpLoss;
    const phase = determinePhase(index + 1, moves.length);
    const grade = gradeMove(cpLoss, Math.floor(index / 2) + 1);

    if (turn === "w") {
      capsWhite.push(caps);
    } else {
      capsBlack.push(caps);
    }

    if (index < 3) {
      bestLine.push(best.bestMove);
    }

    const refutation =
      cpLoss >= 90
        ? analyzePosition(
            fenAfter,
            requestedDepth === "deep" ? refinedQuickEngineSettings : quickEngineSettings,
          ).engineLines[0]
        : undefined;

    evaluations.push({
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
      engineLines: best.engineLines,
      principalVariation: best.line,
      refutationLine: refutation,
      depth: best.depth,
      nodes: best.nodes,
      isCapture: move.isCapture(),
      isCheck: replay.isCheck(),
      isCheckmate: replay.isCheckmate(),
      phase,
    });
  }

  const criticalMoments = evaluations
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
  const opening = detectOpening(sans, headers);
  const title = headers.Event || `${headers.White ?? "White"} vs ${headers.Black ?? "Black"}`;
  const moveCount = moves.length;
  const subject = options?.subject ?? headers.White ?? "Anonymous player";
  const subjectColor = sideForPlayerName({
    black: headers.Black ?? "Black",
    subject,
    white: headers.White ?? "White",
  });
  const depth = requestedDepth;
  const mode = chooseAnalysisMode({
    isAnonymous: !subject || subject === "Anonymous player",
    prefersDeep: depth === "deep",
  });
  const shareSlug = slugify(`${title}-${hashString(pgn)}`);
  const id = shareSlug;

  const report = {
    id,
    source: options?.source ?? "pgn",
    title,
    white: headers.White ?? "White",
    black: headers.Black ?? "Black",
    result: headers.Result ?? "*",
    timeControl: headers.TimeControl ?? "600+0",
    playedAt: headers.Date ?? "2026.05.18",
    opening,
    accuracyWhite: clamp(accuracyWhite, 0, 100),
    accuracyBlack: clamp(accuracyBlack, 0, 100),
    moveCount,
    pgn,
    mode,
    depth,
    status: "complete",
    subject,
    subjectColor,
    createdAt: new Date().toISOString(),
    summary: `${opening.name} analyzed over ${moveCount} plies. ${criticalMoments.length} critical moments, ${Math.round(
      accuracyWhite,
    )}% vs ${Math.round(accuracyBlack)}% accuracy.`,
    story: buildAnalysisStory({
      criticalMoments,
      evaluations,
      moveCount,
      openingName: opening.name,
      subject,
      white: headers.White ?? "White",
      black: headers.Black ?? "Black",
    }),
    moveEvaluations: evaluations,
    criticalMoments,
    bestMoveChain: bestLine,
    shareSlug,
  } satisfies AnalysisRun;

  getAnalysisCache().set(cacheKey, report);
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

export function createPositionEvaluation(fen: string, requestedDepth: AnalysisDepth = "quick") {
  const settings = getEngineSearchSettings(requestedDepth, "position");
  const best = analyzePosition(fen, settings);
  return {
    cacheKey: createAnalysisCacheKey({
      fen,
      depth: settings.searchDepth,
      engineVersion: ENGINE_VERSION,
    }),
    mode: chooseAnalysisMode({ isAnonymous: true }),
    bestMove: best.bestMove,
    score: best.score,
    depth: best.depth,
    engineLines: best.engineLines,
    nodes: best.nodes,
    principalVariation: best.line,
  };
}
