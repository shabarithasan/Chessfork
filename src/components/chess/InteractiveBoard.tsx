"use client";

import { useCallback, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCcw, Undo2 } from "lucide-react";

import { EvalBar } from "./EvalBar";
import { BestMoves } from "./BestMoves";
import { ExplanationPanel } from "./ExplanationPanel";

interface MoveRecord {
  san: string;
  from: string;
  to: string;
  fen: string;
  prevFen: string;
  analysis: {
    eval: number;
    mate: number | null;
    bestMove: string;
    bestLine: string[];
    depth: number;
  } | null;
  explanation: {
    explanation: string;
    moveClassification: string;
    evalChange: number;
  } | null;
}

export function InteractiveBoard() {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  const currentRecord = moves[currentMoveIndex] ?? null;
  const boardOrientation = "white" as const;

  const executeMove = useCallback((from: string, to: string): MoveRecord | null => {
    const game = gameRef.current;
    const prevFen = game.fen();

    try {
      const move = game.move({ from, to, promotion: "q" });
      if (!move) return null;

      const newFen = game.fen();
      const record: MoveRecord = {
        san: move.san,
        from: move.from,
        to: move.to,
        fen: newFen,
        prevFen,
        analysis: null,
        explanation: null,
      };

      setFen(newFen);
      setLastMove({ from: move.from, to: move.to });
      setSelectedSquare(null);
      setMoves((prev) => [...prev.slice(0, currentMoveIndex + 1), record]);
      setCurrentMoveIndex((prev) => prev + 1);

      return record;
    } catch {
      return null;
    }
  }, [currentMoveIndex]);

  const analyzeMove = useCallback(async (record: MoveRecord) => {
    setIsAnalyzing(true);
    try {
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: record.fen, depth: 18 }),
      });
      const analysisData = await analyzeRes.json();
      record.analysis = analysisData;

      try {
        const explainRes = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fen: record.prevFen,
            move: record.san,
            evalScore: analysisData.eval,
          }),
        });
        const explainData = await explainRes.json();
        record.explanation = explainData;
      } catch {
        console.warn("[board] Explanation fetch failed");
        record.explanation = {
          explanation: "Move played. AI explanation unavailable.",
          moveClassification: "Good",
          evalChange: analysisData.eval,
        };
      }

      setMoves((prev) => [...prev]);
    } catch {
      console.warn("[board] Analysis fetch failed");
      record.analysis = { eval: 0, mate: null, bestMove: "", bestLine: [], depth: 0 };
    }
    setIsAnalyzing(false);
  }, []);

  const makeMove = useCallback((from: string, to: string): boolean => {
    if (isAnalyzing) return false;
    const record = executeMove(from, to);
    if (!record) return false;
    analyzeMove(record);
    return true;
  }, [isAnalyzing, executeMove, analyzeMove]);

  const handleSquareClick = useCallback(({ square: sq }: { piece: unknown; square: string }) => {
    if (isAnalyzing) return;

    if (selectedSquare) {
      makeMove(selectedSquare, sq);
    } else {
      const game = gameRef.current;
      const piece = game.get(sq as unknown as import("chess.js").Square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(sq);
      }
    }
  }, [isAnalyzing, selectedSquare, makeMove]);

  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (isAnalyzing) return false;
      return makeMove(sourceSquare, targetSquare);
    },
    [isAnalyzing, makeMove],
  );

  const goToMove = useCallback((index: number) => {
    const game = gameRef.current;
    game.reset();
    const targetMoves = moves.slice(0, index + 1);
    for (const m of targetMoves) {
      try {
        game.move({ from: m.from, to: m.to, promotion: "q" });
      } catch {
        break;
      }
    }
    setFen(game.fen());
    setCurrentMoveIndex(index);
    setLastMove(targetMoves.length > 0 ? { from: targetMoves[targetMoves.length - 1].from, to: targetMoves[targetMoves.length - 1].to } : null);
    setSelectedSquare(null);
  }, [moves]);

  const undo = useCallback(() => {
    if (currentMoveIndex < 0) return;
    const game = gameRef.current;
    try {
      game.undo();
    } catch {}
    setFen(game.fen());
    setCurrentMoveIndex((prev) => prev - 1);
    setLastMove(currentMoveIndex > 0 && moves[currentMoveIndex - 1] ? { from: moves[currentMoveIndex - 1].from, to: moves[currentMoveIndex - 1].to } : null);
    setSelectedSquare(null);
  }, [currentMoveIndex, moves]);

  const reset = useCallback(() => {
    gameRef.current.reset();
    setFen(gameRef.current.fen());
    setMoves([]);
    setCurrentMoveIndex(-1);
    setSelectedSquare(null);
    setLastMove(null);
  }, []);

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: "rgba(0, 200, 0, 0.3)" };
    squareStyles[lastMove.to] = { backgroundColor: "rgba(0, 200, 0, 0.35)" };
  }
  if (selectedSquare) {
    squareStyles[selectedSquare] = { backgroundColor: "rgba(0, 100, 255, 0.35)" };
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-2 shadow-lg sm:p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={undo}
                disabled={currentMoveIndex < 0 || isAnalyzing}
                className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#3a3a3a] hover:text-white disabled:opacity-40"
              >
                <Undo2 className="size-3.5" />
                Undo
              </button>
              <button
                onClick={reset}
                disabled={moves.length === 0 || isAnalyzing}
                className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#3a3a3a] hover:text-white disabled:opacity-40"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => goToMove(currentMoveIndex - 1)}
                disabled={currentMoveIndex < 0 || isAnalyzing}
                className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-1.5 text-slate-300 transition hover:border-[#3a3a3a] hover:text-white disabled:opacity-40"
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="min-w-[4rem] text-center text-xs font-medium text-slate-400">
                {currentMoveIndex >= 0
                  ? `${Math.floor(currentMoveIndex / 2) + 1}${currentMoveIndex % 2 === 0 ? "." : "..."} ${moves[currentMoveIndex]?.san ?? ""}`
                  : "Start"}
              </span>
              <button
                onClick={() => goToMove(currentMoveIndex + 1)}
                disabled={currentMoveIndex >= moves.length - 1 || isAnalyzing}
                className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-1.5 text-slate-300 transition hover:border-[#3a3a3a] hover:text-white disabled:opacity-40"
              >
                <ArrowRight className="size-4" />
              </button>
              <button
                onClick={() => goToMove(moves.length - 1)}
                disabled={currentMoveIndex >= moves.length - 1 || isAnalyzing}
                className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#3a3a3a] hover:text-white disabled:opacity-40"
              >
                Last
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <EvalBar
              evaluation={currentRecord?.analysis?.eval ?? 0}
              mate={currentRecord?.analysis?.mate ?? null}
              depth={currentRecord?.analysis?.depth ?? 0}
              isAnalyzing={isAnalyzing}
            />

            <div className="flex-1">
              <Chessboard
                options={{
                  position: fen,
                  boardOrientation,
                  onSquareClick: handleSquareClick,
                  onPieceDrop: (args) =>
                    handlePieceDrop(args.sourceSquare, args.targetSquare ?? ""),
                  squareStyles,
                  allowDragging: !isAnalyzing,
                  showNotation: true,
                  animationDurationInMs: 200,
                }}
              />
            </div>
          </div>

          {moves.length > 0 && (
            <div className="mt-3 flex max-h-24 flex-wrap gap-1 overflow-y-auto rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-2">
              {moves.map((m, i) => (
                <button
                  key={i}
                  onClick={() => goToMove(i)}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                    i === currentMoveIndex
                      ? "bg-[#77b82b]/20 text-[#b8e680]"
                      : "text-slate-400 hover:bg-[#1a1a1a] hover:text-slate-200"
                  }`}
                >
                  {Math.floor(i / 2) + 1}{i % 2 === 0 ? "." : "..."}{m.san}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {currentRecord?.analysis && (
          <BestMoves
            bestMove={currentRecord.analysis.bestMove}
            bestLine={currentRecord.analysis.bestLine}
            eval={currentRecord.analysis.eval}
            depth={currentRecord.analysis.depth}
          />
        )}

        <ExplanationPanel
          explanation={currentRecord?.explanation?.explanation ?? null}
          classification={currentRecord?.explanation?.moveClassification ?? null}
          evalChange={currentRecord?.explanation?.evalChange ?? null}
          isLoading={isAnalyzing}
        />
      </div>
    </div>
  );
}
