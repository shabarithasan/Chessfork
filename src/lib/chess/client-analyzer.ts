import { Chess } from "chess.js";

import { parsePgn } from "@/lib/chess/pgn";
import { capsFromEvaluations } from "@/lib/chess/rating";
import { classifyMove, shouldProbeOnlyMove } from "@/lib/chess/advanced-classifier";
import { lookupOpeningBook } from "@/lib/opening-book";
import type { AnalysisDepth, MoveEvaluation, MoveGrade } from "@/types/platform";

export type MoveAnalysisProgress = {
  move: MoveEvaluation;
  moveIndex: number;
  totalMoves: number;
};
import { enginePool } from "@/lib/chess/engine-pool";

class StockfishClientSession {
  private worker: Worker;
  private currentSearchId = 0;

  constructor() {
    this.worker = enginePool.getHeavyWorker();
  }

  analyzeFen(
    fen: string,
    options: { depth: number; multiPV: number }
  ): Promise<{ bestMove: string; score: number; lines: any[]; depth: number }> {
    return new Promise((resolve, reject) => {
      this.currentSearchId++;
      const sid = this.currentSearchId;

      const timeout = setTimeout(() => {
        this.worker.removeEventListener("message", listener);
        console.error("[UI] Stockfish timeout hit after 60s for FEN:", fen);
        reject(new Error("Stockfish timeout"));
      }, 60000); // 60s timeout just in case

      const listener = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.searchId === sid && msg.type === "bestmove") {
          clearTimeout(timeout);
          this.worker.removeEventListener("message", listener);

          const topPv = msg.lines?.[0];
          
          // engineWorker divides by 100 to give pawns, so we multiply by 100 to restore centipawns.
          const getCpScore = (evaluation: any) => {
            if (!evaluation) return 0;
            if (evaluation.type === "cp") {
              return Math.round(evaluation.value * 100);
            }
            // Mate scores
            return evaluation.value > 0 ? 30000 - evaluation.value * 100 : -30000 - evaluation.value * 100;
          };

          resolve({
            bestMove: msg.bestmove,
            score: getCpScore(topPv?.evaluation),
            lines: (msg.lines || []).map((l: any) => ({
              depth: options.depth,
              line: l.pv,
              nodes: 0,
              rank: l.multiPv,
              san: l.pv[0], // it's actually UCI, but we can map it to SAN if needed, or just leave it for classifier
              score: getCpScore(l.evaluation),
            })),
            depth: options.depth,
          });
        }
      };

      this.worker.addEventListener("message", listener);
      this.worker.postMessage({
        command: "start",
        fen,
        depth: options.depth,
        multiPV: options.multiPV,
        searchId: sid,
      });
    });
  }

  dispose() {
    this.worker.postMessage({ command: "stop" });
  }
}

function normalizeCpLoss(rawDiff: number) {
  return Math.min(Math.max(0, rawDiff), 2000);
}

function determinePhase(ply: number, moveCount: number): MoveEvaluation["phase"] {
  if (ply <= 16) return "opening";
  if (moveCount - ply <= 12) return "endgame";
  return "middlegame";
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
    Miss: "A missed opportunity to find a much better line.",
  };
  return messages[grade];
}

function moveToUci(move: any) {
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

export async function analyzePgnClientSide(
  pgn: string,
  options: {
    depth: AnalysisDepth;
    onProgress: (progress: MoveAnalysisProgress) => void;
    abortSignal?: AbortSignal;
  }
) {
  const moves = parsePgn(pgn);
  const replay = new Chess();
  const session = new StockfishClientSession();
  const moveEvaluations: MoveEvaluation[] = [];

  // We use the optimized single-threaded Stockfish 17.1 Lite build which easily hits 500k-1M nps.
  const searchDepth = options.depth === "deep" ? 18 : 14;

  try {
    for (let index = 0; index < moves.length; index++) {
      if (options.abortSignal?.aborted) break;

      const move = moves[index];
      const fenBefore = replay.fen();
      const turn = replay.turn();
      replay.move(move);
      const fenAfter = replay.fen();
      const phase = determinePhase(index + 1, moves.length);

      // Book lookup
      if (phase === "opening") {
        const bookLines = await lookupOpeningBook(fenBefore);
        if (bookLines && bookLines.some((b) => b.uci === moveToUci(move))) {
          const bestBookSan = uciToSan(fenBefore, bookLines[0].uci);
          const evaluation: MoveEvaluation = {
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
            engineLines: bookLines.map((l, rank) => ({
              depth: 0,
              line: [uciToSan(fenBefore, l.uci)],
              nodes: 0,
              rank: rank + 1,
              san: uciToSan(fenBefore, l.uci),
              score: 0,
              tablebaseHits: 0,
            })),
            principalVariation: [move.san],
            depth: 0,
            nodes: 0,
            isCapture: move.isCapture(),
            isCheck: replay.isCheck(),
            isCheckmate: replay.isCheckmate(),
            phase,
          };

          moveEvaluations.push(evaluation);
          options.onProgress({ move: evaluation, moveIndex: index, totalMoves: moves.length });
          continue;
        }
      }

      const best = await session.analyzeFen(fenBefore, { depth: searchDepth, multiPV: 3 });

      const playedUci = moveToUci(move);
      const playedLine = best.lines.find((l) => l.san === playedUci);

      let actualMoverScore: number;
      let actualDepth: number;
      let actualScoreForWhite: number;

      if (playedLine) {
        // We found the move in the top 3! No need to search fenAfter.
        actualMoverScore = playedLine.score;
        actualDepth = playedLine.depth;
        actualScoreForWhite = turn === "w" ? playedLine.score : -playedLine.score;
      } else {
        // Move was not in top 3. We must search fenAfter.
        const actual = await session.analyzeFen(fenAfter, { depth: Math.max(10, searchDepth - 2), multiPV: 1 });
        // actual.score is from the opponent's perspective (since fenAfter is opponent's turn).
        // So the mover's score is -actual.score.
        actualMoverScore = -actual.score;
        actualDepth = actual.depth;
        actualScoreForWhite = turn === "w" ? actualMoverScore : -actualMoverScore;
      }

      const bestMoverScore = best.score; // best.score is from mover's perspective.
      const materialCount = fenBefore.split(" ")[0].replace(/[^a-zA-Z]/g, "").length;

      const caps = capsFromEvaluations({ bestScore: bestMoverScore, moveScore: actualMoverScore });
      const cpLoss = normalizeCpLoss(bestMoverScore - actualMoverScore);
      const actualScore = actualScoreForWhite; // Keep in White's perspective for UI

      const bestMoveSan = uciToSan(fenBefore, best.bestMove);
      const classificationInput = {
        bestMoveSan,
        bestScore: bestMoverScore,
        moveScore: actualMoverScore,
        playedMoveSan: move.san,
        materialCount,
      };

      const needsOnlyMoveProbe = shouldProbeOnlyMove(classificationInput);
      
      let alternativeLines = best;
      if (needsOnlyMoveProbe && best.lines.length < 4) {
        alternativeLines = await session.analyzeFen(fenBefore, {
          depth: searchDepth,
          multiPV: 4,
        });
      }

      const engineLines = alternativeLines.lines.map((l) => ({
        ...l,
        san: uciToSan(fenBefore, l.san),
        line: [uciToSan(fenBefore, l.san)],
      }));

      const isBookMove = (Math.floor(index / 2) + 1) <= 8 && cpLoss < 20;

      const classification = classifyMove({
        ...classificationInput,
        isBookMove,
        alternativeLines: engineLines.map(line => ({
          ...line,
          score: line.score, // already mover's perspective
        })),
      });

      const evaluation: MoveEvaluation = {
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
        grade: classification.label,
        label: classification.label,
        comment: buildComment(classification.label, cpLoss),
        bestMove: bestMoveSan,
        engineLines,
        principalVariation: playedLine ? playedLine.line : [move.san], // Simplification: we don't have full PV from UCI mapped properly yet
        depth: actualDepth,
        nodes: 0,
        isCapture: move.isCapture(),
        isCheck: replay.isCheck(),
        isCheckmate: replay.isCheckmate(),
        phase,
      };

      moveEvaluations.push(evaluation);
      options.onProgress({ move: evaluation, moveIndex: index, totalMoves: moves.length });
    }
  } catch (error: any) {
    if (!options.abortSignal?.aborted) {
      throw error;
    }
  } finally {
    session.dispose();
  }

  return moveEvaluations;
}

import { accuracyFromCaps } from "@/lib/chess/rating";
import { detectOpening } from "@/lib/chess/openings";
import { readHeaders } from "@/lib/chess/pgn";
import { buildAnalysisStory } from "@/lib/chess/report-helpers";
import { clamp, hashString, slugify } from "@/lib/utils";
import type { AnalysisRun } from "@/types/platform";

export function buildClientReport(
  evaluations: MoveEvaluation[],
  pgn: string,
  depth: AnalysisDepth
): AnalysisRun {
  const headers = readHeaders(pgn);
  const sans = evaluations.map((m) => m.san);
  const capsWhite = evaluations.filter((m) => m.side === "white").map((m) => m.caps);
  const capsBlack = evaluations.filter((m) => m.side === "black").map((m) => m.caps);
  
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
  const subject = headers.White ?? "Anonymous player";
  const shareSlug = slugify(`${title}-${hashString(pgn)}-v2`);

  return {
    id: shareSlug,
    source: "pgn",
    title,
    white: headers.White ?? "White",
    black: headers.Black ?? "Black",
    result: headers.Result ?? "*",
    timeControl: headers.TimeControl ?? "600+0",
    playedAt: headers.Date ?? new Date().toISOString().split("T")[0],
    opening,
    accuracyWhite: clamp(accuracyWhite, 0, 100),
    accuracyBlack: clamp(accuracyBlack, 0, 100),
    moveCount: evaluations.length,
    pgn,
    mode: "browser",
    depth,
    status: "complete",
    subject,
    subjectColor: "white", // Simplified
    createdAt: new Date().toISOString(),
    summary: `${opening.name} analyzed over ${evaluations.length} plies. ${criticalMoments.length} critical moments, ${Math.round(accuracyWhite)}% vs ${Math.round(accuracyBlack)}% accuracy.`,
    story: buildAnalysisStory({
      criticalMoments,
      evaluations,
      moveCount: evaluations.length,
      openingName: opening.name,
      subject,
      white: headers.White ?? "White",
      black: headers.Black ?? "Black",
    }),
    moveEvaluations: evaluations,
    criticalMoments,
    bestMoveChain: [],
    shareSlug,
  };
}
