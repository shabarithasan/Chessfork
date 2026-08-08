"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Chess } from "chess.js";
import type { AnalysisState } from "@/hooks/useEngine";
import type { WhatIfSnapshot } from "@/lib/whatif-snapshot";
import type { TopMoveEntry } from "@/lib/analysis-engine";
import { classifyWhatIfMove } from "@/lib/whatif-grader";
import type { MoveGrade } from "@/lib/move-classifier";
import type { Square } from "chess.js";

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function detectSacrifice(fenBefore: string, from: string, to: string): boolean {
  try {
    const c = new Chess(fenBefore);
    const ourColor = c.turn();
    const opponent = ourColor === "w" ? "b" : "w";
    
    const move = c.move({ from, to, promotion: "q" });
    if (!move) return false;
    
    const movingValue = PIECE_VALUE[move.piece] ?? 0;
    const capturedValue = move.captured ? (PIECE_VALUE[move.captured] ?? 0) : 0;
    
    if (movingValue <= capturedValue) return false;
    if (!c.isAttacked(move.to as Square, opponent)) return false;
    
    const opponentMoves = c.moves({ verbose: true }) as { to: string; piece: string }[];
    const attackers = opponentMoves.filter(m => m.to === to);
    if (attackers.length === 0) return false;
    
    const minAttackerValue = Math.min(...attackers.map(m => PIECE_VALUE[m.piece] ?? 0));
    const isDefended = c.isAttacked(move.to as Square, ourColor);
    
    if (isDefended) {
      return (capturedValue - movingValue + minAttackerValue) < 0;
    } else {
      return (capturedValue - movingValue) < 0;
    }
  } catch {
    return false;
  }
}

interface UseWhatIfSessionsOptions {
  engineAnalysis: AnalysisState;
  startAnalysis: (fen: string, options?: { multiPV?: number; depth?: number }) => void;
  stopAnalysis: () => void;
  targetDepth: number;
}

// Publish useful feedback before a deep browser MultiPV search has completed.
const INTERACTIVE_READY_DEPTH = 14;

function scoreSignForFen(fen: string): 1 | -1 {
  return new Chess(fen).turn() === "w" ? 1 : -1;
}

function normalizeEvaluationForWhite(
  fen: string,
  evaluation: { type: "cp" | "mate"; value: number },
): { type: "cp" | "mate"; value: number } {
  const sign = scoreSignForFen(fen);
  return { ...evaluation, value: evaluation.value * sign };
}

function mateToDisplayCentipawns(mate: number): number {
  return Math.sign(mate || 1) * (100_000 - Math.min(Math.abs(mate), 100) * 100);
}

function buildTopMoves(fen: string, lines: AnalysisState["lines"]): TopMoveEntry[] {
  const sign = scoreSignForFen(fen);
  return lines.slice(0, 3).map((l) => {
    const c = new Chess(fen);
    let san = "", from = "", to = "";
    if (l.pv.length > 0) {
      try {
        const m = c.move({ from: l.pv[0].slice(0, 2), to: l.pv[0].slice(2, 4), promotion: l.pv[0].slice(4, 5) || "q" });
        san = m.san; from = m.from; to = m.to;
      } catch {}
    }
    const lineSan: string[] = [];
    try {
      const c2 = new Chess(fen);
      for (const uci of l.pv) {
        const m = c2.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || "q" });
        lineSan.push(m.san);
      }
    } catch {}
    const evalValue = l.evaluation.type === "cp"
      ? l.evaluation.value * 100 * sign
      : mateToDisplayCentipawns(l.evaluation.value) * sign;
    return { san, from, to, eval: evalValue, mate: l.evaluation.type === "mate" ? l.evaluation.value * sign : null, line: lineSan };
  });
}

function toCentipawns(evalValue: number, type: "cp" | "mate"): number {
  return type === "cp" ? evalValue * 100 : (evalValue > 0 ? 100 : -100);
}

function snapshotToPreviousEval(snapshot: WhatIfSnapshot) {
  const turn = new Chess(snapshot.fen).turn();
  const cpScore = snapshot.evaluation
    ? toCentipawns(snapshot.evaluation.value, snapshot.evaluation.type)
    : (snapshot.topMoves[0]?.eval ?? 0);

  return {
    fen: snapshot.fen,
    cpScore,
    side: turn === "w" ? "black" as const : "white" as const,
    bestMove: snapshot.topMoves[0]?.san ?? "",
    bestEval: snapshot.topMoves[0]?.eval ?? cpScore,
    mateInN: snapshot.topMoves[0]?.mate ?? (snapshot.evaluation?.type === "mate" ? snapshot.evaluation.value : null),
    allBestEvals: snapshot.topMoves.map((m) => m.eval),
  };
}

export function useWhatIfSessions(options: UseWhatIfSessionsOptions) {
  const { engineAnalysis, startAnalysis, stopAnalysis } = options;
  const [sessions, setSessions] = useState<Map<string, WhatIfSnapshot>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "searching" | "ready">("idle");
  const [pendingFen, setPendingFen] = useState<string | null>(null);

  const sessionCounterRef = useRef(0);
  const moveCountRef = useRef(0);
  const pendingRef = useRef<{
    id: string;
    fen: string;
    san: string;
    from: string;
    to: string;
    moveIdx: number;
    previous: { fen: string; cpScore: number; side: "white" | "black"; bestMove: string; bestEval: number; mateInN: number | null; allBestEvals: number[] } | null;
    published: boolean;
    lastPublishedDepth: number;
  } | null>(null);
  const prevSessionEvalRef = useRef<{ fen: string; cpScore: number; side: "white" | "black"; bestMove: string; bestEval: number; mateInN: number | null; allBestEvals: number[] } | null>(null);

  const currentSession = selectedId ? sessions.get(selectedId) ?? null : null;

  const createSession = useCallback((fen: string, san: string, from: string, to: string, gameCtx?: { fenBefore: string; scoreBefore: number } | null) => {
    sessionCounterRef.current++;
    const id = `w${sessionCounterRef.current}`;
    const moveIdx = moveCountRef.current;
    moveCountRef.current = moveIdx + 1;

    /* ── Seed prev eval from game position for first what-if ── */
    const selectedSnapshot = selectedId ? sessions.get(selectedId) : null;
    if (selectedSnapshot) {
      prevSessionEvalRef.current = snapshotToPreviousEval(selectedSnapshot);
    } else if (!prevSessionEvalRef.current && gameCtx) {
      const turn = new Chess(fen).turn();
      prevSessionEvalRef.current = {
        fen: gameCtx.fenBefore,
        cpScore: gameCtx.scoreBefore,
        side: turn === "w" ? "black" : "white",
        bestMove: "",
        bestEval: gameCtx.scoreBefore,
        mateInN: null,
        allBestEvals: [gameCtx.scoreBefore],
      };
    }

    /* ── Show FEN immediately on the board, start engine ── */
    setPendingFen(fen);
    setSelectedId(id);
    setStatus("searching");
    // Keep the pre-move evaluation for every refinement of this position.
    // Otherwise later engine updates would be graded against themselves.
    pendingRef.current = {
      id, fen, san, from, to, moveIdx,
      previous: prevSessionEvalRef.current,
      published: false,
      lastPublishedDepth: 0,
    };

    // Live analysis is intentionally bounded: a fast, stable depth-14
    // result is more useful during board interaction than a 45-second deep
    // search. Other analysis modes may still request a deeper engine level.
    startAnalysis(fen, { multiPV: 3, depth: INTERACTIVE_READY_DEPTH });
    return id;
  }, [startAnalysis, selectedId, sessions]);

  const selectSession = useCallback((id: string | null) => {
    setSelectedId(id);
    setPendingFen(null);
  }, []);

  const clearAll = useCallback(() => {
    pendingRef.current = null;
    prevSessionEvalRef.current = null;
    moveCountRef.current = 0;
    sessionCounterRef.current = 0;
    setSelectedId(null);
    setSessions(new Map());
    setStatus("idle");
    setPendingFen(null);
    stopAnalysis();
  }, [stopAnalysis]);

  /* ── Pipeline: ignore engine until TARGET_DEPTH, then freeze ── */
  useEffect(() => {
    if (status !== "searching" && status !== "ready") return;
    const pending = pendingRef.current;
    if (!pending) return;
    if (selectedId !== pending.id) return;

    const analysis = engineAnalysis;
    if (!analysis?.evaluation || analysis.lines.length === 0) return;
    if (analysis.fen && analysis.fen !== pending.fen) return;
    if (analysis.depth < INTERACTIVE_READY_DEPTH) return;
    if (analysis.depth <= pending.lastPublishedDepth) return;

    const topMoves = buildTopMoves(pending.fen, analysis.lines);
    const normalizedEvaluation = normalizeEvaluationForWhite(pending.fen, analysis.evaluation);
    const arrows = topMoves.map((m, i) => ({
      from: m.from,
      to: m.to,
      color: i === 0 ? "rgba(34, 197, 94, 0.6)" : "rgba(59, 130, 246, 0.35)",
    }));

    /* ── Determine which side made this move from the FEN active color ── */
    const moveSide = pending.fen.split(' ')[1] === 'w' ? "black" : "white";

    /* ── Detect forced move (only one legal move) ── */
    let isOnlyMove = false;
    try {
      isOnlyMove = new Chess(pending.fen).moves().length === 1;
    } catch {}

    /* ── Compute grade vs previous session ── */
    let grade: MoveGrade | null = null;
    const prev = pending.previous;

    if (prev) {
      const evalAfter = toCentipawns(normalizedEvaluation.value, normalizedEvaluation.type);
      const isCapture = pending.san.includes("x");
      const isCheck = pending.san.includes("+") || pending.san.includes("#");
      const isPromotion = pending.san.includes("=");
      const isCastle = pending.san.startsWith("O-O");
      const isSacrifice = detectSacrifice(prev.fen, pending.from, pending.to);
      const result = classifyWhatIfMove({
        bestEval: prev.bestEval,
        playedEval: evalAfter,
        bestMove: prev.bestMove,
        playedMove: pending.san,
        bestMateInN: prev.mateInN,
        playedMateInN: normalizedEvaluation.type === "mate" ? normalizedEvaluation.value : null,
        isOnlyMove,
        allBestEvals: prev.allBestEvals,
        side: moveSide,
        isCapture,
        isCheck,
        isPromotion,
        isCastle,
        isSacrifice,
        depth: analysis.depth,
      });
      grade = result.grade;
    }

    /* ── Store current analysis data for next session's grade ── */
    const currentCpScore = toCentipawns(normalizedEvaluation.value, normalizedEvaluation.type);
    const allBestEvals = topMoves.map((m) => m.eval);
    prevSessionEvalRef.current = {
      fen: pending.fen,
      cpScore: currentCpScore,
      side: moveSide,
      bestMove: topMoves[0]?.san ?? "",
      bestEval: topMoves[0]?.eval ?? currentCpScore,
      mateInN: topMoves[0]?.mate ?? (normalizedEvaluation.type === "mate" ? normalizedEvaluation.value : null),
      allBestEvals,
    };

    const snapshot: WhatIfSnapshot = {
      moveId: pending.id,
      fen: pending.fen,
      san: pending.san,
      from: pending.from,
      to: pending.to,
      evaluation: normalizedEvaluation,
      grade,
      depth: analysis.depth,
      topMoves,
      arrows,
      coach: null,
      status: "ready" as const,
      createdAt: performance.now(),
    };

    setSessions(prev => {
      const next = new Map(prev);
      next.set(pending.id, snapshot);
      return next;
    });
    // Interactive analysis stops at depth 14 to keep the board responsive.
    pending.published = true;
    pending.lastPublishedDepth = analysis.depth;
    setStatus("ready");
    if (analysis.depth >= INTERACTIVE_READY_DEPTH) {
      pendingRef.current = null;
      stopAnalysis();
    }
  }, [engineAnalysis, selectedId, status, stopAnalysis]);

  return {
    sessions,
    selectedId,
    currentSession,
    pendingFen,
    status,
    createSession,
    selectSession,
    clearAll,
  };
}
