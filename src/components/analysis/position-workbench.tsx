"use client";

import { Chess, type Square } from "chess.js";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Chessboard } from "react-chessboard";

import { ChessBoard, type BoardArrow, type BoardHighlight } from "@/components/analysis/chess-board";
import { useEngine } from "@/hooks/useEngine";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [fen, setFen] = useState(() => {
    const urlFen = searchParams.get("fen");
    if (urlFen && loadChess(urlFen)) {
      return urlFen;
    }
    return initialFen;
  });

  useEffect(() => {
    if (mode !== "board") return;
    const urlFen = searchParams.get("fen");
    if (fen && fen !== urlFen) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("fen", fen);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [fen, mode, pathname, router, searchParams]);

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
  
  const { analysis: engineAnalysis, startAnalysis, stopAnalysis } = useEngine();
  
  useEffect(() => {
    if (isLiveMode && fen) {
      startAnalysis(fen, { depth: 22, multiPV: 3 });
    }
  }, [fen, isLiveMode, startAnalysis]);

  useEffect(() => {
    return () => stopAnalysis();
  }, [stopAnalysis]);
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
  const engineLines = useMemo(() => {
    if (isLiveMode) {
      if (engineAnalysis.fen !== deferredFen || !engineAnalysis.lines.length) return [];
      const sign = chess?.turn() === "b" ? -1 : 1;
      return engineAnalysis.lines.map((l) => {
        const c = loadChess(engineAnalysis.fen);
        let san = l.pv[0];
        let from = "";
        let to = "";
        const lineSan: string[] = [];
        try {
          for (const moveUci of l.pv) {
            const move = c!.move({
              from: moveUci.slice(0, 2),
              to: moveUci.slice(2, 4),
              promotion: moveUci.slice(4, 5) || undefined,
            });
            lineSan.push(move.san);
          }
          if (lineSan.length > 0) san = lineSan[0];
        } catch {}
        
        return {
          rank: l.multiPv,
          san,
          score: l.evaluation.type === "cp"
            ? l.evaluation.value * sign
            : (l.evaluation.value > 0 ? 30000 : -30000) * sign,
          depth: engineAnalysis.depth,
          mate: l.evaluation.type === "mate" ? l.evaluation.value * sign : undefined,
          line: lineSan,
          nodes: 0,
        };
      });
    }

    return result?.engineLines?.length
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
        : [];
  }, [isLiveMode, engineAnalysis, deferredFen, result, chess]);
  const boardArrows = useMemo<BoardArrow[]>(() => {
    if (isLiveMode) {
      if (engineAnalysis.fen !== deferredFen || !engineLines.length) return [];
    } else {
      if (!result || resultFen !== deferredFen) return [];
    }

    const seen = new Set<string>();
    const arrows: BoardArrow[] = [];
    const sourceFen = isLiveMode ? engineAnalysis.fen : resultFen;

    for (const line of engineLines.slice(0, 3)) {
      const arrow = deriveArrowFromSan(sourceFen, line.san, arrowToneForLine(line.rank));
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
  }, [isLiveMode, engineAnalysis.fen, deferredFen, engineLines, result, resultFen]);

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
      {mode === "board" ? (
        <div className="rounded-xl border border-neutral-800 bg-[#121624] flex flex-col overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.28)] xl:order-2 p-4 min-h-[40rem] max-h-[800px]">
          <div className="flex bg-[#0b0d14] p-1 rounded-lg shrink-0">
            <button className="flex-1 bg-[#1c2130] shadow text-white py-1.5 rounded-md text-sm font-semibold">Analysis</button>
            <button className="flex-1 text-neutral-400 py-1.5 text-sm font-semibold hover:bg-white/5 rounded-md transition">Coach</button>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 px-3 py-1 rounded-md font-mono font-bold text-sm">
              {engineLines.length > 0 ? formatEngineScore(engineLines[0].score) : "0.00"}
            </span>
            <span className="text-neutral-400 text-sm font-medium">Depth {engineAnalysis.depth} &bull; SF 18 WASM</span>
          </div>

          <button
            onClick={() => {
              const best = engineLines[0];
              if (!best || !chess) return;
              try {
                const current = loadChess(fen);
                const move = current?.move(best.san);
                if (move && current) {
                  setFenHistory((h) => [...h, fen]);
                  applyFen(current.fen(), `${move.san} played. Engine is updating.`);
                }
              } catch {}
            }}
            className="w-full mt-4 bg-amber-400 hover:bg-amber-500 text-black font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/><path d="m15 6-6 6 6 6"/></svg>
            Follow Best Line
          </button>

          <div className="mt-4 flex-1 overflow-y-auto space-y-1">
            {engineLines.map((line, idx) => (
              <div key={idx} className="flex gap-3 text-sm items-center hover:bg-white/5 p-2 rounded-lg cursor-pointer transition-colors" onClick={() => {
                try {
                  const current = loadChess(fen);
                  const move = current?.move(line.san);
                  if (move && current) {
                    setFenHistory((h) => [...h, fen]);
                    applyFen(current.fen(), `${move.san} played. Engine is updating.`);
                  }
                } catch {}
              }}>
                <span className="w-8 font-mono font-bold text-neutral-200 shrink-0">{line.san}</span>
                <span className="w-12 font-mono text-neutral-400 text-right shrink-0">{formatEngineScore(line.score)}</span>
                {idx === 0 && (
                  <span className="flex items-center gap-1 bg-[#282d3b] text-[#a0aab8] px-2 py-0.5 rounded-full text-[0.65rem] uppercase tracking-wider font-bold shrink-0">
                    <span className="text-amber-400 text-xs">🌟</span> is best
                  </span>
                )}
                <span className="text-neutral-500 truncate min-w-0 flex-1">{line.line.slice(1).join(" ")}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-between gap-2 shrink-0">
            <button onClick={undoMove} disabled={fenHistory.length === 0} className="flex-1 bg-[#282d3b] hover:bg-[#343b4d] disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition">
              Undo
            </button>
            <button onClick={resetBoard} className="flex-1 bg-[#282d3b] hover:bg-[#343b4d] text-white font-semibold py-2 rounded-lg transition">
              Reset
            </button>
          </div>
          
          <div className="mt-4 space-y-4 shrink-0">
            <label className="block">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">FEN</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(fen)}
                  className="text-[0.65rem] font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-400"
                >
                  Copy FEN
                </button>
              </div>
              <textarea
                value={fen}
                onChange={(event) => handleFenChange(event.target.value)}
                className="min-h-16 w-full rounded-lg border border-neutral-800 bg-[#0b0d14] px-4 py-3 font-mono text-xs leading-6 text-neutral-100 outline-none transition focus:border-amber-400/70"
                spellCheck={false}
              />
            </label>
            
            <label className="block">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">PGN</span>
                <button
                  type="button"
                  onClick={() => {
                    if (chess) navigator.clipboard.writeText(chess.pgn());
                  }}
                  className="text-[0.65rem] font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-400"
                >
                  Copy PGN
                </button>
              </div>
              <textarea
                value={chess ? chess.pgn() : ""}
                readOnly
                className="min-h-24 w-full rounded-lg border border-neutral-800 bg-[#0b0d14] px-4 py-3 font-mono text-xs leading-6 text-neutral-400 outline-none"
                spellCheck={false}
              />
            </label>
          </div>
        </div>
      ) : (
      <div className={`rounded-xl border border-neutral-800 bg-[linear-gradient(180deg,rgba(41,41,38,0.96),rgba(24,24,24,0.98))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6 ${mode === "next-move" ? "xl:order-2" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">
              {mode === "editor" ? "Position editor" : "Best move engine"}
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

        <div className="mt-5 space-y-4">
          <label className="block">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">FEN</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(fen)}
                className="text-[0.65rem] font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-400"
              >
                Copy FEN
              </button>
            </div>
            <textarea
              value={fen}
              onChange={(event) => handleFenChange(event.target.value)}
              className="min-h-16 w-full rounded-lg border border-neutral-800 bg-neutral-950/75 px-4 py-3 font-mono text-xs leading-6 text-neutral-100 outline-none transition focus:border-amber-400/70"
              spellCheck={false}
            />
          </label>
        </div>

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
      )}

      <aside className={`space-y-4 ${mode === "next-move" || mode === "board" ? "xl:order-1" : ""}`}>
        <div className="relative overflow-hidden rounded-lg shadow-[0_20px_40px_rgba(0,0,0,.6),0_8px_16px_rgba(0,0,0,.4)] w-full aspect-square max-w-none">
          <Chessboard
            options={{
              position: chess ? deferredFen : initialFen,
              onPieceDrop: ({ sourceSquare, targetSquare }) => {
                const current = loadChess(fen);
                if (!current) return false;
                if (!targetSquare) return false;
                try {
                  const move = current.move({
                    from: sourceSquare,
                    to: targetSquare,
                    promotion: "q",
                  });
                  setFenHistory((history) => [...history, fen]);
                  applyFen(current.fen(), `${move.san} played. Engine is updating from the new position.`);
                  return true;
                } catch {
                  return false;
                }
              },
              arrows: boardArrows.map((a) => ({
                startSquare: a.from,
                endSquare: a.to,
                color: "rgba(59, 130, 246, 0.7)",
              })),
              boardOrientation: "white",
              allowDrawingArrows: true,
              showNotation: true,
              animationDurationInMs: 200,
            }}
          />
        </div>

        {mode !== "board" && (
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
        )}
      </aside>
    </div>
  );
}
