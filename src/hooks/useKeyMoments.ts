import { useMemo } from "react";
import type { MoveEvaluation, MoveGrade } from "@/types/platform";

export type KeyMomentType =
  | "turning-point"
  | "blunder"
  | "brilliant"
  | "missed-win"
  | "critical";

export interface KeyMoment {
  id: string;
  ply: number;
  moveNumber: number;
  side: "white" | "black";
  san: string;
  grade: MoveGrade;
  cpLoss: number;
  scoreBefore: number;
  scoreAfter: number;
  bestMove: string;
  type: KeyMomentType;
  badgeText: string;
  headline: string;
  hikaruQuote: string;
  magnusQuote: string;
  emotion: "blunder" | "brilliant" | "critical" | "thinking" | "neutral";
  fenBefore: string;
  fenAfter: string;
}

function formatEval(cp: number): string {
  if (Math.abs(cp) >= 9000) return cp > 0 ? "+M" : "-M";
  const pawns = (cp / 100).toFixed(1);
  return cp > 0 ? `+${pawns}` : `${pawns}`;
}

function generateHikaruQuote(
  type: KeyMomentType,
  san: string,
  bestMove: string,
  scoreBefore: number,
  scoreAfter: number,
  moveNumber: number
): string {
  const best = bestMove && bestMove !== "the engine move" ? bestMove : "the best move";
  switch (type) {
    case "turning-point":
      return `Wait chat... CHAT! Look at the eval bar right here! The game was completely in your hands at ${formatEval(scoreBefore)}, and ${san} caused a massive swing to ${formatEval(scoreAfter)}! This is literally the exact moment the match flipped!`;
    case "blunder":
      return `Oh my god... literally a disaster on move ${moveNumber}! You played ${san}?? That hands over the entire game, chat! ${best} was right there and you're completely chilling! Takes, takes, takes and it's just GG!`;
    case "brilliant":
      return `BOOM! Okay, that is actually INSANE! You found ${san}?! Literally a 200 IQ move right there, chat! You saw the deep tactical idea—pure genius!`;
    case "missed-win":
      return `Chat, wait... you had the knockout right there with ${best}! Look at the board, why ${san}?! You had an overwhelming win and let them stay alive!`;
    case "critical":
    default:
      return `Chat, this position was razor-sharp! You had to be super precise here. ${san} was played, but ${best} kept maximum pressure on the opponent!`;
  }
}

function generateMagnusQuote(
  type: KeyMomentType,
  san: string,
  bestMove: string,
  scoreBefore: number,
  scoreAfter: number,
  moveNumber: number
): string {
  const best = bestMove && bestMove !== "the engine move" ? bestMove : "the top engine move";
  switch (type) {
    case "turning-point":
      return `Honestly, this was the critical crossroad of the whole match. You were standing great at ${formatEval(scoreBefore)}, but after ${san} the evaluation dropped to ${formatEval(scoreAfter)}. You let the momentum slip completely away.`;
    case "blunder":
      return `Yeah... I really don't understand what you were seeing here. In this kind of position, just play simple and solid like ${best}. Instead, ${san} is a major blunder that gives away the game on a silver platter.`;
    case "brilliant":
      return `Very nice intuition. Honestly, most club players wouldn't find ${san}. It's clean, aesthetic, and completely winning. That is how chess should be played.`;
    case "missed-win":
      return `You had a forced win with ${best}. Instead, ${san} complicates things unnecessarily. When you have the opponent on the ropes, you have to be clinical.`;
    case "critical":
    default:
      return `A very tense moment on move ${moveNumber}. In positions like this, intuition matters. ${best} was the humanly practical choice to maintain full control.`;
  }
}

export function detectKeyMoments(
  moves: MoveEvaluation[],
  subjectColor: "white" | "black" = "white"
): KeyMoment[] {
  if (!moves || moves.length === 0) return [];

  const candidates: KeyMoment[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const prevMove = i > 0 ? moves[i - 1] : null;

    const scoreBefore = prevMove ? prevMove.score : 0;
    const scoreAfter = move.score;
    const cpLoss = Math.abs(move.cpLoss || 0);
    const grade = move.grade;

    // Detect Turning Points:
    // 1. Brilliant / Great moves
    if (grade === "Brilliant" || grade === "Great") {
      candidates.push({
        id: `km-${move.ply}`,
        ply: move.ply,
        moveNumber: move.moveNumber,
        side: move.side,
        san: move.san,
        grade,
        cpLoss,
        scoreBefore,
        scoreAfter,
        bestMove: move.bestMove || move.san,
        type: "brilliant",
        badgeText: "💎 MASTERSTROKE",
        headline: `${move.side === "white" ? "White" : "Black"} found brilliance!`,
        hikaruQuote: generateHikaruQuote("brilliant", move.san, move.bestMove, scoreBefore, scoreAfter, move.moveNumber),
        magnusQuote: generateMagnusQuote("brilliant", move.san, move.bestMove, scoreBefore, scoreAfter, move.moveNumber),
        emotion: "brilliant",
        fenBefore: move.fenBefore,
        fenAfter: move.fenAfter,
      });
      continue;
    }

    // 2. Severe turning point / Eval lead change (cpLoss >= 180 or eval swing across 0)
    const isPlayer = move.side === subjectColor;
    const wasWinning = move.side === "white" ? scoreBefore > 120 : scoreBefore < -120;
    const isNowLosingOrEqual = move.side === "white" ? scoreAfter < 50 : scoreAfter > -50;
    const isBigSwing = wasWinning && isNowLosingOrEqual && cpLoss >= 150;

    if (isBigSwing) {
      candidates.push({
        id: `km-${move.ply}`,
        ply: move.ply,
        moveNumber: move.moveNumber,
        side: move.side,
        san: move.san,
        grade: grade || "Blunder",
        cpLoss,
        scoreBefore,
        scoreAfter,
        bestMove: move.bestMove || "",
        type: "turning-point",
        badgeText: "⚡ GAME TURNING POINT",
        headline: `The momentum swung completely!`,
        hikaruQuote: generateHikaruQuote("turning-point", move.san, move.bestMove, scoreBefore, scoreAfter, move.moveNumber),
        magnusQuote: generateMagnusQuote("turning-point", move.san, move.bestMove, scoreBefore, scoreAfter, move.moveNumber),
        emotion: "critical",
        fenBefore: move.fenBefore,
        fenAfter: move.fenAfter,
      });
      continue;
    }

    // 3. Decisive Blunder (cpLoss >= 200 or Blunder grade)
    if (grade === "Blunder" || cpLoss >= 220) {
      candidates.push({
        id: `km-${move.ply}`,
        ply: move.ply,
        moveNumber: move.moveNumber,
        side: move.side,
        san: move.san,
        grade: "Blunder",
        cpLoss,
        scoreBefore,
        scoreAfter,
        bestMove: move.bestMove || "",
        type: "blunder",
        badgeText: "🚨 CRITICAL BLUNDER",
        headline: `Disaster strikes on move ${move.moveNumber}!`,
        hikaruQuote: generateHikaruQuote("blunder", move.san, move.bestMove, scoreBefore, scoreAfter, move.moveNumber),
        magnusQuote: generateMagnusQuote("blunder", move.san, move.bestMove, scoreBefore, scoreAfter, move.moveNumber),
        emotion: "blunder",
        fenBefore: move.fenBefore,
        fenAfter: move.fenAfter,
      });
      continue;
    }

    // 4. Missed Win / Missed Tactic (had >= +300 cp and dropped by >= 150)
    const hadBigLead = move.side === "white" ? scoreBefore >= 250 : scoreBefore <= -250;
    if (hadBigLead && cpLoss >= 150 && (grade === "Mistake" || grade === "Inaccuracy")) {
      candidates.push({
        id: `km-${move.ply}`,
        ply: move.ply,
        moveNumber: move.moveNumber,
        side: move.side,
        san: move.san,
        grade,
        cpLoss,
        scoreBefore,
        scoreAfter,
        bestMove: move.bestMove || "",
        type: "missed-win",
        badgeText: "🎯 MISSED KNOCKOUT",
        headline: `A winning opportunity slipped away!`,
        hikaruQuote: generateHikaruQuote("missed-win", move.san, move.bestMove, scoreBefore, scoreAfter, move.moveNumber),
        magnusQuote: generateMagnusQuote("missed-win", move.san, move.bestMove, scoreBefore, scoreAfter, move.moveNumber),
        emotion: "critical",
        fenBefore: move.fenBefore,
        fenAfter: move.fenAfter,
      });
    }
  }

  // Prioritize and cap to the most important 3 to 6 key moments
  // Sort by priority: brilliant first, then biggest turning points / cpLoss
  const scored = [...candidates].sort((a, b) => {
    const scoreA = (a.type === "turning-point" ? 3000 : a.type === "brilliant" ? 2500 : 1000) + a.cpLoss;
    const scoreB = (b.type === "turning-point" ? 3000 : b.type === "brilliant" ? 2500 : 1000) + b.cpLoss;
    return scoreB - scoreA;
  });

  // Pick top 5 and sort back chronologically by ply
  const topMoments = scored.slice(0, 5).sort((a, b) => a.ply - b.ply);

  return topMoments;
}

export function useKeyMoments(
  moves: MoveEvaluation[],
  selectedPly: number,
  subjectColor: "white" | "black" = "white"
) {
  const keyMoments = useMemo(
    () => detectKeyMoments(moves, subjectColor),
    [moves, subjectColor]
  );

  const currentKeyMoment = useMemo(
    () => keyMoments.find((km) => km.ply === selectedPly) || null,
    [keyMoments, selectedPly]
  );

  const activeIndex = useMemo(
    () => keyMoments.findIndex((km) => km.ply === selectedPly),
    [keyMoments, selectedPly]
  );

  const nextMoment = useMemo(() => {
    return keyMoments.find((km) => km.ply > selectedPly) || keyMoments[0] || null;
  }, [keyMoments, selectedPly]);

  const prevMoment = useMemo(() => {
    return [...keyMoments].reverse().find((km) => km.ply < selectedPly) || keyMoments[keyMoments.length - 1] || null;
  }, [keyMoments, selectedPly]);

  return {
    keyMoments,
    currentKeyMoment,
    activeIndex,
    nextMoment,
    prevMoment,
    hasKeyMoments: keyMoments.length > 0,
  };
}
