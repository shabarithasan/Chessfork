"use client";

import Image from "next/image";
import { memo, useMemo, type CSSProperties } from "react";
import { Chessboard, type Arrow, type PieceRenderObject } from "react-chessboard";

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
const boardLightSquare = "#eeeed2";
const boardDarkSquare = "#769656";
const reviewPieceAssets: Record<string, string> = {
  bB: "/pieces/wikimedia/bB.svg",
  bK: "/pieces/wikimedia/bK.svg",
  bN: "/pieces/wikimedia/bN.svg",
  bP: "/pieces/wikimedia/bP.svg",
  bQ: "/pieces/wikimedia/bQ.svg",
  bR: "/pieces/wikimedia/bR.svg",
  wB: "/pieces/wikimedia/wB.svg",
  wK: "/pieces/wikimedia/wK.svg",
  wN: "/pieces/wikimedia/wN.svg",
  wP: "/pieces/wikimedia/wP.svg",
  wQ: "/pieces/wikimedia/wQ.svg",
  wR: "/pieces/wikimedia/wR.svg",
};

const reviewBoardPieces: PieceRenderObject = Object.fromEntries(
  Object.entries(reviewPieceAssets).map(([piece, src]) => [
    piece,
    ({ svgStyle } = {}) => (
      <span
        aria-hidden="true"
        style={{
          display: "block",
          filter: "drop-shadow(0 8px 7px rgba(0,0,0,0.28))",
          height: "100%",
          position: "relative",
          width: "100%",
          ...svgStyle,
        }}
      >
        <Image
          alt=""
          draggable={false}
          fill
          loading="lazy"
          sizes="96px"
          src={src}
          style={{ objectFit: "contain", padding: "6%" }}
          unoptimized
        />
      </span>
    ),
  ]),
) as PieceRenderObject;

function boardFiles(orientation: "black" | "white") {
  return orientation === "white" ? files : [...files].reverse();
}

function boardRanks(orientation: "black" | "white") {
  return orientation === "white" ? ranks : [...ranks].reverse();
}

export type ReviewBoardMove = {
  from: string;
  to: string;
};

export const ReviewBoard = memo(function ReviewBoard({
  currentMove,
  fen,
  flipped,
  onOpenContextMenu,
  arrows,
}: {
  arrows: Arrow[];
  currentMove?: ReviewBoardMove;
  fen: string;
  flipped: boolean;
  onOpenContextMenu: (x: number, y: number, square: string | null) => void;
}) {
  const orientation = flipped ? "black" : "white";
  const squareStyles = useMemo<Record<string, CSSProperties>>(() => {
    if (!currentMove) {
      return {};
    }

    return {
      [currentMove.from]: { backgroundColor: "rgba(119, 184, 43, 0.36)" },
      [currentMove.to]: { backgroundColor: "rgba(119, 184, 43, 0.42)" },
    };
  }, [currentMove]);

  const topFiles = boardFiles(orientation);
  const sideRanks = boardRanks(orientation);

  return (
    <div
      className="review-board-shell relative rounded-xl border border-[#1e1e2e] bg-[linear-gradient(135deg,#111118,#0a0a0f)] p-3 shadow-[0_0_20px_rgba(119,184,43,0.12),0_28px_90px_rgba(0,0,0,0.38)]"
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenContextMenu(event.clientX, event.clientY, null);
      }}
    >
      <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] grid-rows-[1.25rem_minmax(0,1fr)_1.25rem] gap-1">
        <div />
        <div className="grid grid-cols-8 text-center font-mono text-xs font-semibold text-slate-500">
          {topFiles.map((file) => (
            <span key={`top-${file}`}>{file}</span>
          ))}
        </div>
        <div />

        <div className="grid grid-rows-8 place-items-center font-mono text-xs font-semibold text-slate-500">
          {sideRanks.map((rank) => (
            <span key={`left-${rank}`}>{rank}</span>
          ))}
        </div>
        <div className="review-board-viewport min-w-0 overflow-hidden rounded-lg ring-1 ring-black/40">
          <Chessboard
            options={{
              allowDragging: false,
              allowDrawingArrows: false,
              animationDurationInMs: 140,
              arrows,
              boardOrientation: orientation,
              boardStyle: {
                borderRadius: "0.75rem",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04), 0 16px 44px rgba(0,0,0,0.35)",
              },
              darkSquareStyle: {
                backgroundColor: boardDarkSquare,
              },
              lightSquareStyle: {
                backgroundColor: boardLightSquare,
              },
              onSquareRightClick: ({ square }) => onOpenContextMenu(window.innerWidth / 2, window.innerHeight / 2, square),
              pieces: reviewBoardPieces,
              position: fen,
              showNotation: false,
              squareStyles,
            }}
          />
        </div>
        <div className="grid grid-rows-8 place-items-center font-mono text-xs font-semibold text-slate-500">
          {sideRanks.map((rank) => (
            <span key={`right-${rank}`}>{rank}</span>
          ))}
        </div>

        <div />
        <div className="grid grid-cols-8 text-center font-mono text-xs font-semibold text-slate-500">
          {topFiles.map((file) => (
            <span key={`bottom-${file}`}>{file}</span>
          ))}
        </div>
        <div />
      </div>
    </div>
  );
});
