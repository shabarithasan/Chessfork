"use client";

import { Chess, type Square } from "chess.js";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { ChessBoard, type BoardArrow, type BoardHighlight } from "@/components/analysis/chess-board";
import type { AnalysisDepth, EngineLine } from "@/types/platform";

interface EvaluationResponse {
  bestMove: string;
  cacheKey: string;
  depth: number;
  engineLines?: EngineLine[];
  mode: string;
  nodes: number;
  principalVariation: string[];
  score: number;
  tablebaseHits?: number;
}

const liveModes = new Set<PositionWorkbenchMode>(["board", "next-move"]);

type PositionWorkbenchMode = "board" | "editor" | "next-move";

function formatEngineScore(score: number) {
  if (Math.abs(score) >= 100_000) {
    return score > 0 ? "+M" : "-M";
  }

  const pawns = score / 100;
  const sign = pawns > 0 ? "+" : "";
  return `${sign}${pawns.toFixed(Math.abs(pawns) >= 10 ? 1 : 2)}`;
}

function loadChess(fen: string) {
  try {
    return new Chess(fen);
  } catch {
    return null;
  }
}

function arrowToneForLine(rank: number): BoardArrow["tone"] {
  if (rank === 1) return "best";
  if (rank === 2) return "candidate";
  return "candidateSoft";
}

function deriveArrowFromSan(fen: string, san: string, tone: BoardArrow["tone"]): BoardArrow | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move(san);

    return {
      from: move.from,
      to: move.to,
      tone,
    };
  } catch {
    return null;
  }
}

function describePosition(chess: Chess | null) {
  if (!chess) return "Invalid FEN";
  if (chess.isCheckmate()) return "Checkmate";
  if (chess.isStalemate()) return "Stalemate";
  if (chess.isDraw()) return "Drawn position";
  if (chess.isCheck()) return "Check";
  return chess.turn() === "w" ? "White to move" : "Black to move";
}

function formatNodes(nodes: number) {
  if (nodes >= 1_000_000) return `${(nodes / 1_000_000).toFixed(1)}M`;
  if (nodes >= 1_000) return `${Math.round(nodes / 1_000)}K`;
  return nodes.toString();
}

function lineLabel(rank: number) {
  if (rank === 1) return "Best";
  if (rank === 2) return "Alternative";
  return "Playable idea";
}

export function PositionWorkbench({
  mode,
  initialFen,
}: {
  mode: PositionWorkbenchMode;
  initialFen: string;
}) {
  const [fen, setFen] = useState(initialFen);
  const [fenHistory, setFenHistory] = useState<string[]>([]);
  const [requestedDepth, setRequestedDepth] = useState<AnalysisDepth>("quick");
  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [resultFen, setResultFen] = useState("");
  const [pending, setPending] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [message, setMessage] = useState("Click a piece, then click a legal destination.");
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const deferredFen = useDeferredValue(fen);
  const chess = useMemo(() => loadChess(deferredFen), [deferredFen]);
  const isLiveMode = liveModes.has(mode);
  const legalMovesFromSelected = useMemo(() => {
    if (!chess || !selectedSquare) {
      return [];
    }

    try {
      return chess.moves({ square: selectedSquare as Square, verbose: true });
    } catch {
      return [];
    }
  }, [chess, selectedSquare]);
  const boardHighlights = useMemo<BoardHighlight[]>(() => {
    const highlights: BoardHighlight[] = [];

    if (selectedSquare) {
      highlights.push({ square: selectedSquare, tone: "from" });
    }

    for (const move of legalMovesFromSelected) {
      highlights.push({ square: move.to, tone: "focus" });
    }

    return highlights;
  }, [legalMovesFromSelected, selectedSquare]);
  const engineLines = useMemo(
    () =>
      result?.engineLines?.length
        ? result.engineLines
        : result
          ? [
              {
                depth: result.depth,
                line: result.principalVariation,
                nodes: result.nodes,
                rank: 1,
                san: result.bestMove,
                score: result.score,
              },
            ]
          : [],
    [result],
  );
  const boardArrows = useMemo<BoardArrow[]>(() => {
    if (!result || resultFen !== deferredFen) {
      return [];
    }

    const seen = new Set<string>();
    const arrows: BoardArrow[] = [];

    for (const line of engineLines.slice(0, 3)) {
      const arrow = deriveArrowFromSan(resultFen, line.san, arrowToneForLine(line.rank));
      if (!arrow) {
        continue;
      }

      const key = `${arrow.from}-${arrow.to}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      arrows.push(arrow);
    }

    return arrows;
  }, [deferredFen, engineLines, result, resultFen]);

  const evaluatePosition = useCallback(async (targetFen = fen, reason: "manual" | "live" = "manual") => {
    const targetChess = loadChess(targetFen);
    if (!targetChess) {
      setError("That FEN is not valid yet.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/positions/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fen: targetChess.fen(), requestedDepth }),
      });

      const data = (await response.json()) as EvaluationResponse | { message?: string };
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!response.ok) {
        throw new Error("message" in data ? data.message : "Evaluation failed.");
      }

      setResult(data as EvaluationResponse);
      setResultFen(targetChess.fen());
      setMessage(reason === "live" ? "Live engine updated from this board position." : "Engine analysis refreshed.");
    } catch (caughtError) {
      if (requestId === requestIdRef.current) {
        setError(caughtError instanceof Error ? caughtError.message : "Evaluation failed.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setPending(false);
      }
    }
  }, [fen, requestedDepth]);

  useEffect(() => {
    if (!isLiveMode) {
      return;
    }

    const targetChess = loadChess(fen);
    if (!targetChess) {
      return;
    }

    const timer = window.setTimeout(() => {
      void evaluatePosition(targetChess.fen(), "live");
    }, 420);

    return () => window.clearTimeout(timer);
  }, [evaluatePosition, fen, isLiveMode, requestedDepth]);

  function applyFen(nextFen: string, nextMessage: string) {
    setFen(nextFen);
    setSelectedSquare(null);
    setError(null);
    setMessage(nextMessage);
  }

  function handleFenChange(value: string) {
    setFen(value);
    setSelectedSquare(null);
    setResult(null);
    setResultFen("");
    setError(loadChess(value) ? null : "That FEN is not valid yet.");
    setMessage("FEN changed. The board updates as soon as the position is valid.");
  }

  function handleSquareClick(square: string) {
    const current = loadChess(fen);
    if (!current) {
      setError("Fix the FEN before moving pieces.");
      return;
    }

    const piece = current.get(square as Square);

    if (!selectedSquare) {
      if (!piece) {
        setMessage("Choose a piece to move.");
        return;
      }

      if (piece.color !== current.turn()) {
        setMessage(`${piece.color === "w" ? "White" : "Black"} piece selected, but it is ${current.turn() === "w" ? "White" : "Black"} to move.`);
        return;
      }

      setSelectedSquare(square);
      setMessage(`Selected ${square}. Choose a legal destination.`);
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      setMessage("Selection cleared.");
      return;
    }

    try {
      const move = current.move({
        from: selectedSquare,
        promotion: "q",
        to: square,
      });

      setFenHistory((history) => [...history, fen]);
      applyFen(current.fen(), `${move.san} played. Engine is updating from the new position.`);
    } catch {
      if (piece?.color === current.turn()) {
        setSelectedSquare(square);
        setMessage(`Selected ${square}. Choose a legal destination.`);
        return;
      }

      setMessage(`That move is not legal from ${selectedSquare} to ${square}.`);
    }
  }

  function undoMove() {
    const previous = fenHistory.at(-1);
    if (!previous) {
      setMessage("No previous board position to restore.");
      return;
    }

    setFenHistory((history) => history.slice(0, -1));
    applyFen(previous, "Moved back one board position.");
  }

  function resetBoard() {
    setFenHistory([]);
    applyFen(initialFen, "Board reset to the starting study position.");
    setResult(null);
    setResultFen("");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,25rem)]">
      <div className="rounded-xl border border-neutral-800 bg-[linear-gradient(180deg,rgba(41,41,38,0.96),rgba(24,24,24,0.98))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">
              {mode === "board" ? "Live analysis board" : mode === "editor" ? "Position editor" : "Best move engine"}
            </p>
            <h2 className="text-2xl font-semibold text-white">Move pieces and watch the engine respond.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-300">
              Click a legal move on the board. The position updates, Stockfish/fallback analysis refreshes, and the top candidate
              arrows come only from the returned engine lines.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["quick", "deep"] as const).map((depth) => (
              <button
                key={depth}
                type="button"
                onClick={() => setRequestedDepth(depth)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  requestedDepth === depth
                    ? "bg-amber-400 text-[#0a0a0a]"
                    : "border border-neutral-800 bg-neutral-800/30 text-neutral-200 hover:bg-neutral-700/40"
                }`}
              >
                {depth === "quick" ? "Quick" : "Deep"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 min-[520px]:grid-cols-3">
          <div className="rounded-lg border border-neutral-800 bg-black/18 px-4 py-3">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">Position</p>
            <p className="mt-1 font-semibold text-white">{describePosition(chess)}</p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-black/18 px-4 py-3">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">Engine</p>
            <p className="mt-1 font-semibold text-white">{pending ? "Analyzing..." : result ? result.mode : isLiveMode ? "Live ready" : "Manual"}</p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-black/18 px-4 py-3">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">Eval</p>
            <p className="mt-1 font-semibold text-white">{result ? formatEngineScore(result.score) : "Waiting"}</p>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">FEN</span>
          <textarea
            value={fen}
            onChange={(event) => handleFenChange(event.target.value)}
            className="mt-2 min-h-24 w-full rounded-lg border border-neutral-800 bg-neutral-950/75 px-4 py-4 font-mono text-xs leading-6 text-neutral-100 outline-none transition focus:border-amber-400/70"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !chess}
            onClick={() => void evaluatePosition(fen, "manual")}
            className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-[#0a0a0a] transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Analyzing..." : "Analyze now"}
          </button>
          <button
            type="button"
            onClick={undoMove}
            className="rounded-full border border-neutral-800 bg-neutral-800/30 px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:bg-neutral-700/40"
          >
            Undo move
          </button>
          <button
            type="button"
            onClick={resetBoard}
            className="rounded-full border border-neutral-800 bg-neutral-800/30 px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:bg-neutral-700/40"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900/30 px-4 py-3 text-sm leading-6 text-neutral-300">
          {error ?? message}
        </div>
      </div>

      <aside className="space-y-4">
        <ChessBoard
          fen={chess ? deferredFen : initialFen}
          arrows={boardArrows}
          evaluation={result?.score}
          evaluationLabel={result ? formatEngineScore(result.score) : undefined}
          highlights={boardHighlights}
          onSquareClick={handleSquareClick}
          className="mx-auto max-w-none"
        />

        <div className="rounded-lg border border-neutral-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.035))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lime-300">Engine lines</p>
              <p className="mt-1 text-sm text-neutral-400">Best line is solid, alternatives are lighter.</p>
            </div>
            {result ? (
              <span className="rounded-full border border-neutral-800 bg-black/20 px-3 py-1 text-xs font-semibold text-neutral-300">
                Depth {result.depth} / {formatNodes(result.nodes)} nodes
              </span>
            ) : null}
          </div>

          <div className="mt-4 space-y-2">
            {engineLines.length > 0 ? (
              engineLines.slice(0, 5).map((line) => (
                <div key={`${line.rank}-${line.san}`} className="rounded-[1rem] border border-neutral-800 bg-black/16 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">{lineLabel(line.rank)}</p>
                      <p className="mt-1 truncate text-lg font-semibold text-white">{line.san}</p>
                    </div>
                    <span className="rounded-full border border-neutral-800 bg-neutral-800/30 px-2 py-1 text-xs font-semibold text-neutral-300">
                      {formatEngineScore(line.score)}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm text-neutral-400">{line.line.join(" ") || "No stored continuation"}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-neutral-800 bg-black/16 px-3 py-3 text-sm leading-6 text-neutral-400">
                {pending ? "Waiting for engine output..." : "Move a piece or click Analyze now to generate engine lines."}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
