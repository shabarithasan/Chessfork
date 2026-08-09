"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, RotateCw, SkipBack, SkipForward, X } from "lucide-react";

import type { ParsedMove } from "@/lib/pgn-parser";
import { getFenAtMove, getSanAtMove, getMoveNumber, getSide } from "@/lib/pgn-parser";
import type { MoveAnalysis } from "@/lib/game-analyzer";
import { MoveArrowBadge, squareToBoardPos, type MoveArrowInfo } from "./MoveArrow";
import { SquareOverlay } from "./SquareOverlay";

interface AnnotationLabel {
  square: string;
  type: "blunder" | "mistake" | "brilliant" | "great" | "best" | "good";
}

interface FullAnalysisBoardProps {
  moves: ParsedMove[];
  currentMoveIndex: number;
  onNavigate: (index: number) => void;
  bestMoves?: MoveArrowInfo[];
  selectedLineIndex?: number | null;
  altFen?: string | null;
  onClearAlt?: () => void;
  className?: string;
  analysisMoves?: MoveAnalysis[];
  annotations?: AnnotationLabel[];
}

const CLASS_TO_LABEL: Record<string, string> = {
  Brilliant: "brilliant",
  Great: "great_find",
  Best: "best",
  Excellent: "excellent",
  Good: "good",
  Book: "book",
  Inaccuracy: "inaccuracy",
  Mistake: "mistake",
  Blunder: "blunder",
  Miss: "miss",
};

const arrowOpacities = [1.0, 0.6, 0.3];

const neoBoardLight = "#E0E4EC";
const neoBoardDark = "#4B586E";

export function FullAnalysisBoard({
  moves,
  currentMoveIndex,
  onNavigate,
  bestMoves,
  selectedLineIndex,
  altFen: externalAltFen,
  onClearAlt,
  className = "",
  analysisMoves,
  annotations,
}: FullAnalysisBoardProps) {
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [internalAltFen, setInternalAltFen] = useState<string | null>(null);
  const [internalAltFrom, setInternalAltFrom] = useState<string | null>(null);
  const [internalAltTo, setInternalAltTo] = useState<string | null>(null);
  const [altEval, setAltEval] = useState<{ eval: number; bestMove: string } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const gameFen = useMemo(() => getFenAtMove(moves, currentMoveIndex), [moves, currentMoveIndex]);

  const altFen = externalAltFen ?? internalAltFen;

  const displayFen = altFen ?? gameFen;

  /* Reset internal alt state on move navigation */
  const prevMoveRef = useRef(currentMoveIndex);
  if (prevMoveRef.current !== currentMoveIndex) {
    prevMoveRef.current = currentMoveIndex;
    setInternalAltFen(null);
    setInternalAltFrom(null);
    setInternalAltTo(null);
    setAltEval(null);
  }

  const currentSan = getSanAtMove(moves, currentMoveIndex);
  const currentMoveNumber = getMoveNumber(currentMoveIndex);
  const currentSide = getSide(currentMoveIndex);

  const lastMove =
    currentMoveIndex >= 0 && !altFen
      ? { from: moves[currentMoveIndex].from, to: moves[currentMoveIndex].to }
      : internalAltFrom && internalAltTo
        ? { from: internalAltFrom, to: internalAltTo }
        : null;

  /* Build arrows: best move = green, alternatives = blue, selected = cyan */
  const arrows: Array<{ startSquare: string; endSquare: string; color: string }> = [];

  if (bestMoves && bestMoves.length > 0) {
    bestMoves.slice(0, 3).forEach((bm, i) => {
      let color: string;
      if (i === 0) {
        color = "rgba(34, 197, 94, 0.85)"; // green for best
      } else if (selectedLineIndex === i) {
        color = "rgba(34, 211, 238, 0.85)"; // cyan for selected alt
      } else {
        color = `rgba(59, 130, 246, ${arrowOpacities[i] ?? 0.3})`; // blue for others
      }
      arrows.push({
        startSquare: bm.from,
        endSquare: bm.to,
        color,
      });
    });
  }

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: "rgba(34, 211, 238, 0.25)", borderRadius: "2px" };
    squareStyles[lastMove.to] = { backgroundColor: "rgba(34, 211, 238, 0.35)", borderRadius: "2px" };
  }

/* Annotation label for the currently viewed move: renders a pop-up circle above the square */
const currentAnnotation = useMemo(() => {
  if (annotations && annotations.length > 0) {
    const lastAnn = annotations[annotations.length - 1];
    return lastAnn;
  }
  if (!analysisMoves || currentMoveIndex < 0 || currentMoveIndex >= moves.length) return null;
  const a = analysisMoves[currentMoveIndex];
  if (!a) return null;
  const labelType = CLASS_TO_LABEL[a.classification];
  if (!labelType) return null;
  const move = moves[currentMoveIndex];
  if (!move) return null;
  return { square: move.to, type: labelType } as AnnotationLabel;
}, [analysisMoves, currentMoveIndex, moves, annotations]);

/* Error dots: yellow/orange/red badges on piece destination squares for blunders/mistakes/inaccuracies */
  const errorSquares = useMemo(() => {
    if (!analysisMoves || analysisMoves.length === 0) return {};
    const map: Record<string, { classification: string; diff: number; bestMove: string }> = {};
    const maxErrorIndex = Math.min(analysisMoves.length, moves.length);
    for (let i = 0; i < maxErrorIndex; i++) {
      const a = analysisMoves[i];
      if (a && (a.classification === "Blunder" || a.classification === "Mistake" || a.classification === "Inaccuracy")) {
        const move = moves[i];
        if (move?.to) {
          map[move.to] = { classification: a.classification, diff: a.diff, bestMove: a.bestMove };
        }
      }
    }
    return map;
  }, [analysisMoves, moves]);

  const handleBestMoveClick = useCallback(
    (san: string) => {
      const chess = new Chess(gameFen);
      try {
        const move = chess.move(san);
        if (!move) return;
        setInternalAltFen(chess.fen());
        setInternalAltFrom(move.from);
        setInternalAltTo(move.to);
      } catch {
        // ignore invalid clicks
      }
    },
    [gameFen],
  );

  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (isAnalyzing) return false;

      const chess = new Chess(gameFen);
      try {
        const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
        if (!move) return false;

        const newFen = chess.fen();
        setInternalAltFen(newFen);
        setInternalAltFrom(sourceSquare);
        setInternalAltTo(targetSquare);
        setIsAnalyzing(true);

        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fen: newFen, depth: 18 }),
        })
          .then((r) => {
            if (!r.ok) throw new Error(`Analysis failed: ${r.statusText}`);
            return r.json();
          })
          .then((data) => {
            setAltEval({ eval: data.eval ?? 0, bestMove: data.bestMove ?? move.san });
          })
          .catch(() => {
            setAltEval({ eval: 0, bestMove: move.san });
          })
          .finally(() => {
            setIsAnalyzing(false);
          });

        return true;
      } catch {
        return false;
      }
    },
    [gameFen, isAnalyzing],
  );

  const handleClearAlt = useCallback(() => {
    setInternalAltFen(null);
    setInternalAltFrom(null);
    setInternalAltTo(null);
    setAltEval(null);
    onClearAlt?.();
  }, [onClearAlt]);

  const moveBarScrollRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={boardRef}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`w-full ${className}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">
            {altFen ? "What-if" : currentSide === "white" ? "White" : "Black" + " to move"}
          </span>
          {altFen ? (
            altEval && (
              <span className={`rounded px-2 py-0.5 font-mono text-sm font-semibold ${(altEval.eval ?? 0) >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                {(altEval.eval ?? 0) > 0 ? "+" : ""}{((altEval.eval ?? 0) / 100).toFixed(2)}
              </span>
            )
          ) : currentSan ? (
            <span className="rounded bg-cyan-500/10 px-2 py-0.5 font-mono text-sm font-semibold text-cyan-400">
              {currentMoveNumber}{currentSide === "white" ? "." : "..."}{currentSan}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {altFen && (
            <button
              onClick={handleClearAlt}
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-1.5 text-red-400 transition hover:bg-red-500/20"
              title="Back to game"
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
            className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-1.5 text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400"
            title="Flip board"
          >
            <RotateCw className="size-4" />
          </button>
        </div>
      </div>

      <div className="relative" style={{ maxWidth: 500, margin: "0 auto" }}>
        <Chessboard
          options={{
            position: displayFen,
            boardOrientation: orientation,
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!targetSquare) return false;
              return handlePieceDrop(sourceSquare, targetSquare);
            },
            squareStyles,
            arrows,
            allowDragging: !isAnalyzing,
            showNotation: true,
            animationDurationInMs: 200,
            clearArrowsOnPositionChange: false,
            darkSquareStyle: { backgroundColor: neoBoardDark },
            lightSquareStyle: { backgroundColor: neoBoardLight },
            boardStyle: {
              borderRadius: "12px",
            },
          }}
        />

        {!altFen && bestMoves && bestMoves.length > 0 && (
          <SquareOverlay
            orientation={orientation}
            cornerBrackets={[
              { square: bestMoves[0].from, type: "selected" as const },
              { square: bestMoves[0].to, type: "selected" as const },
            ]}
          />
        )}

        {!altFen && bestMoves && bestMoves.length > 0 && (
          <div className="pointer-events-none absolute inset-0">
            {bestMoves.slice(0, 3).map((bm, i) => (
              <MoveArrowBadge
                key={bm.san}
                move={bm}
                rank={i}
                opacity={arrowOpacities[i] ?? 0.3}
                onClick={handleBestMoveClick}
                orientation={orientation}
              />
            ))}
          </div>
        )}

        {/* Error dot badges for blunders, mistakes, inaccuracies */}
        {!altFen && Object.keys(errorSquares).length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {Object.entries(errorSquares).map(([square, info]) => {
              const pos = squareToBoardPos(square, orientation);
              const colorMap: Record<string, string> = {
                Blunder: "#ef4444",
                Mistake: "#f97316",
                Inaccuracy: "#eab308",
              };
              const dotColor = colorMap[info.classification] ?? "#eab308";
              return (
                <div
                  key={square}
                  className="absolute pointer-events-auto group"
                  style={{
                    left: `${(pos.x + 1 / 16) * 100}%`,
                    top: `${(pos.y + 1 / 16) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 40,
                  }}
                  title={`${info.classification} — swing: ${(Math.abs(info.diff) / 100).toFixed(1)} pawns — best: ${info.bestMove}`}
                >
                  <div
                    className="size-2.5 animate-pulse rounded-full ring-2 ring-black/50"
                    style={{ backgroundColor: dotColor }}
                  />
                  <div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#111] px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                  >
                    {info.classification} · {(Math.abs(info.diff) / 100).toFixed(1)} pawns
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Move annotation label above the current square */}
          {!altFen && currentAnnotation && (() => {
            const filename = currentAnnotation.type;
            return (
              <div
                className="pointer-events-none"
                style={{
                  position: "absolute",
                  left: `${(squareToBoardPos(currentAnnotation.square, orientation).x + 1 / 8) * 100}%`,
                  top: `${squareToBoardPos(currentAnnotation.square, orientation).y * 100}%`,
                  transform: "translate(-100%, 0)",
                  zIndex: 20,
                }}
              >
                <img
                  src={`/images/brilliance_v2/svg/${filename}.svg`}
                  alt=""
                  className="size-8"
                  style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }}
                />
              </div>
            );
          })()}

        {isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 rounded-lg bg-[#111118] px-4 py-3 shadow-lg">
              <Loader2 className="size-5 animate-spin text-cyan-400" />
              <span className="text-xs text-slate-400">Analyzing...</span>
            </div>
          </div>
        )}

        {altFen && altEval && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-2 left-2 right-2 rounded-lg border border-cyan-500/20 bg-[#111118]/90 p-2 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {altEval.bestMove} &middot; <button onClick={handleClearAlt} className="text-cyan-400 underline">Back to game</button>
              </span>
              <span className={`font-mono font-semibold ${altEval.eval >= 0 ? "text-green-400" : "text-red-400"}`}>
                {altEval.eval > 0 ? "+" : ""}{(altEval.eval / 100).toFixed(2)}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        <button
          onClick={() => onNavigate(-1)}
          disabled={currentMoveIndex < 0}
          className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-2 text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-30"
          title="First move"
        >
          <SkipBack className="size-4" />
        </button>
        <button
          onClick={() => onNavigate(Math.max(-1, currentMoveIndex - 1))}
          disabled={currentMoveIndex < 0}
          className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-2 text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-30"
          title="Previous move"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="mx-2 min-w-[6rem] text-center">
          <span className="text-xs text-slate-500">
            {altFen ? altEval?.bestMove ?? "Analysis" : currentMoveIndex < 0 ? "Start" : `${currentMoveNumber}${currentSide === "white" ? "." : "..."}${currentSan}`}
          </span>
        </div>

        <button
          onClick={() => onNavigate(Math.min(moves.length - 1, currentMoveIndex + 1))}
          disabled={currentMoveIndex >= moves.length - 1}
          className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-2 text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-30"
          title="Next move"
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          onClick={() => onNavigate(moves.length - 1)}
          disabled={currentMoveIndex >= moves.length - 1}
          className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-2 text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-30"
          title="Last move"
        >
          <SkipForward className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}
