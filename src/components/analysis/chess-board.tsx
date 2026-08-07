"use client";

import { useId, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";

import { expandFenBoard } from "@/lib/chess/fen";
import { clamp, cn } from "@/lib/utils";
import { SquareOverlayInline } from "@/components/chess/SquareOverlay";

const pieceAssetMap: Record<string, string> = {
  p: "/pieces/wikimedia/bP.svg",
  r: "/pieces/wikimedia/bR.svg",
  n: "/pieces/wikimedia/bN.svg",
  b: "/pieces/wikimedia/bB.svg",
  q: "/pieces/wikimedia/bQ.svg",
  k: "/pieces/wikimedia/bK.svg",
  P: "/pieces/wikimedia/wP.svg",
  R: "/pieces/wikimedia/wR.svg",
  N: "/pieces/wikimedia/wN.svg",
  B: "/pieces/wikimedia/wB.svg",
  Q: "/pieces/wikimedia/wQ.svg",
  K: "/pieces/wikimedia/wK.svg",
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const ranks = [8, 7, 6, 5, 4, 3, 2, 1] as const;
const lightSquareColor = "#eeeed2";
const darkSquareColor = "#769656";

const boardThemes = {
  graphite: {
    frame: "bg-[#111118]",
    frameBorder: "border-[#1e1e2e]",
    light: lightSquareColor,
    dark: darkSquareColor,
    gridLine: "rgba(119,184,43,0.08)",
    railDark: "#07070b",
    railLight: "#f1f5f9",
  },
  slate: {
    frame: "bg-[#111118]",
    frameBorder: "border-[#1e1e2e]",
    light: lightSquareColor,
    dark: darkSquareColor,
    gridLine: "rgba(119,184,43,0.07)",
    railDark: "#07070b",
    railLight: "#f1f5f9",
  },
  forest: {
    frame: "bg-[#0f1715]",
    frameBorder: "border-[#1b3b35]",
    light: lightSquareColor,
    dark: darkSquareColor,
    gridLine: "rgba(119,184,43,0.09)",
    railDark: "#06100d",
    railLight: "#e8fff8",
  },
  tournament: {
    frame: "bg-[#121116]",
    frameBorder: "border-[#32283f]",
    light: lightSquareColor,
    dark: darkSquareColor,
    gridLine: "rgba(119,184,43,0.08)",
    railDark: "#08070b",
    railLight: "#f6f0ff",
  },
  warm: {
    frame: "bg-[#151313]",
    frameBorder: "border-[#3a2b2b]",
    light: lightSquareColor,
    dark: darkSquareColor,
    gridLine: "rgba(119,184,43,0.08)",
    railDark: "#0e0808",
    railLight: "#fff3ef",
  },
} as const;

export type BoardTone = keyof typeof boardThemes;
export type BoardPieceTheme = "classic" | "neo";
export type BoardOrientation = "black" | "white";
type BoardHighlightTone = "focus" | "from" | "to";
export type BoardArrowTone = "best" | "candidate" | "candidateSoft" | "played" | "refutation";

export type BoardHighlight = {
  square: string;
  tone?: BoardHighlightTone;
};

export type BoardArrow = {
  from: string;
  to: string;
  tone?: BoardArrowTone;
};

export type BoardSquareBadge = {
  label?: string;
  square: string;
  src: string;
};

export type BoardAnimatedMove = {
  from: string;
  id: string;
  piece: string;
  to: string;
};

export type BoardPlayer = {
  clock?: string;
  meta?: string;
  name: string;
};

const highlightToneClasses: Record<BoardHighlightTone, string> = {
  focus: "border-[#77b82b]/85 bg-[#77b82b]/18",
  from: "border-[#77b82b]/85 bg-[#77b82b]/12",
  to: "border-[#77b82b]/85 bg-[#77b82b]/20",
};

const arrowToneStyles: Record<BoardArrowTone, { glow: string; markerSize: number; opacity: number; stroke: string; width: number }> = {
  best: {
    glow: "drop-shadow-[0_0_7px_rgba(119,184,43,0.24)]",
    markerSize: 7.2,
    opacity: 0.94,
    stroke: "#77b82b",
    width: 8.5,
  },
  candidate: {
    glow: "drop-shadow-[0_0_5px_rgba(119,184,43,0.16)]",
    markerSize: 5.8,
    opacity: 0.56,
    stroke: "#77b82b",
    width: 5.2,
  },
  candidateSoft: {
    glow: "drop-shadow-[0_0_4px_rgba(119,184,43,0.12)]",
    markerSize: 5.2,
    opacity: 0.38,
    stroke: "#77b82b",
    width: 4.6,
  },
  played: {
    glow: "drop-shadow-[0_0_4px_rgba(85,139,47,0.1)]",
    markerSize: 4.2,
    opacity: 0.38,
    stroke: "#558b2f",
    width: 2.25,
  },
  refutation: {
    glow: "drop-shadow-[0_0_7px_rgba(239,68,68,0.18)]",
    markerSize: 5.8,
    opacity: 0.58,
    stroke: "#ef4444",
    width: 4.1,
  },
};

function squareDisplayPosition(square: string, orientation: BoardOrientation) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  const fileIndex = orientation === "white" ? file : 7 - file;
  const rankIndex = orientation === "white" ? 8 - rank : rank - 1;

  return {
    fileIndex,
    rankIndex,
  };
}

function squareCenter(square: string, orientation: BoardOrientation) {
  const { fileIndex, rankIndex } = squareDisplayPosition(square, orientation);

  return {
    x: fileIndex * 100 + 50,
    y: rankIndex * 100 + 50,
  };
}

function squareTopLeft(square: string, orientation: BoardOrientation) {
  const { fileIndex, rankIndex } = squareDisplayPosition(square, orientation);

  return {
    x: `${fileIndex * 12.5}%`,
    y: `${rankIndex * 12.5}%`,
  };
}

function squareMoveDelta(fromSquare: string, toSquare: string, orientation: BoardOrientation) {
  const from = squareDisplayPosition(fromSquare, orientation);
  const to = squareDisplayPosition(toSquare, orientation);

  return {
    x: `${(from.fileIndex - to.fileIndex) * 100}%`,
    y: `${(from.rankIndex - to.rankIndex) * 100}%`,
  };
}

function arrowLinePoints(
  fromSquare: string,
  toSquare: string,
  options: {
    endInset?: number;
    orientation?: BoardOrientation;
    startInset?: number;
  } = {},
) {
  const orientation = options.orientation ?? "white";
  const from = squareCenter(fromSquare, orientation);
  const to = squareCenter(toSquare, orientation);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const startInset = options.startInset ?? 32;
  const endInset = options.endInset ?? 45;

  return {
    x1: from.x + Math.cos(angle) * startInset,
    y1: from.y + Math.sin(angle) * startInset,
    x2: to.x - Math.cos(angle) * endInset,
    y2: to.y - Math.sin(angle) * endInset,
  };
}

function openArrowHeadPoints(
  points: ReturnType<typeof arrowLinePoints>,
  options: {
    headAngle?: number;
    headLength?: number;
  } = {},
) {
  const angle = Math.atan2(points.y2 - points.y1, points.x2 - points.x1);
  const headLength = options.headLength ?? 48;
  const headAngle = options.headAngle ?? 0.72;

  return [
    {
      x: points.x2 - Math.cos(angle - headAngle) * headLength,
      y: points.y2 - Math.sin(angle - headAngle) * headLength,
    },
    {
      x: points.x2 - Math.cos(angle + headAngle) * headLength,
      y: points.y2 - Math.sin(angle + headAngle) * headLength,
    },
  ];
}

function initialsForName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const MATE_DISPLAY_THRESHOLD = 100_000;
const DECISIVE_EVAL_THRESHOLD = 1_200;
const EVAL_BAR_PAWNS_FOR_QUARTER = 3;

function formatEvalLabel(evaluation: number) {
  if (Math.abs(evaluation) >= MATE_DISPLAY_THRESHOLD) {
    return evaluation > 0 ? "+M" : "-M";
  }

  const score = evaluation / 100;
  const sign = score > 0 ? "+" : "";
  return `${sign}${score.toFixed(Math.abs(score) >= 10 ? 1 : 2)}`;
}

function whiteWinPercentFromEval(evaluation?: number) {
  if (typeof evaluation !== "number") {
    return 50;
  }

  if (Math.abs(evaluation) >= MATE_DISPLAY_THRESHOLD) {
    return evaluation > 0 ? 100 : 0;
  }

  const pawns = evaluation / 100;
  return clamp(50 + (pawns / EVAL_BAR_PAWNS_FOR_QUARTER) * 25, 0, 100);
}

function describeEvalBar(evaluation?: number) {
  if (typeof evaluation !== "number") {
    return "Evaluation bar is waiting for engine analysis.";
  }

  if (Math.abs(evaluation) >= MATE_DISPLAY_THRESHOLD) {
    return evaluation > 0 ? "White has a forced win." : "Black has a forced win.";
  }

  if (evaluation >= DECISIVE_EVAL_THRESHOLD) {
    return "White is completely winning.";
  }

  if (evaluation <= -DECISIVE_EVAL_THRESHOLD) {
    return "Black is completely winning.";
  }

  if (Math.abs(evaluation) <= 30) {
    return "The position is roughly balanced.";
  }

  return evaluation > 0 ? "White is better." : "Black is better.";
}

function PlayerStrip({
  clock,
  name,
  meta,
}: BoardPlayer) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-[#1e1e2e] bg-[#111118] px-3 py-2.5 text-white shadow-[0_0_20px_rgba(119,184,43,0.08),inset_0_1px_0_rgba(255,255,255,0.04)] sm:gap-3 sm:px-4 sm:py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#77b82b]/12 text-xs font-semibold tracking-[0.2em] text-[#b8e680] sm:size-9">
          {initialsForName(name) || "P"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{name}</p>
          {meta ? <p className="truncate text-[0.68rem] uppercase tracking-[0.18em] text-slate-300 sm:text-xs sm:tracking-[0.2em]">{meta}</p> : null}
        </div>
      </div>

      {clock ? (
        <div className="shrink-0 rounded-lg border border-[#1e1e2e] bg-black/25 px-2.5 py-2 font-mono text-xs font-semibold tracking-[0.08em] text-slate-100 sm:px-3 sm:text-sm">
          {clock}
        </div>
      ) : null}
    </div>
  );
}

export function ChessBoard({
  fen,
  highlightSquares = [],
  highlights = [],
  badges = [],
  arrows = [],
  animatedMove,
  className,
  evaluation,
  evaluationLabel,
  onBoardContextMenu,
  onSquareClick,
  orientation = "white",
  pieceTheme = "neo",
  showCoordinates = true,
  tone = "slate",
  topPlayer,
  bottomPlayer,
  variant = "simple",
  cornerBrackets = [],
  centerDots = [],
}: {
  fen: string;
  highlightSquares?: string[];
  highlights?: BoardHighlight[];
  badges?: BoardSquareBadge[];
  arrows?: BoardArrow[];
  animatedMove?: BoardAnimatedMove;
  className?: string;
  evaluation?: number;
  evaluationLabel?: string;
  onBoardContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onSquareClick?: (square: string) => void;
  orientation?: BoardOrientation;
  pieceTheme?: BoardPieceTheme;
  showCoordinates?: boolean;
  tone?: BoardTone;
  topPlayer?: BoardPlayer;
  bottomPlayer?: BoardPlayer;
  variant?: "analysis" | "simple";
  cornerBrackets?: string[];
  centerDots?: string[];
}) {
  const board = expandFenBoard(fen);
  const highlightMap = new Map<string, BoardHighlightTone>();
  const badgeMap = new Map<string, BoardSquareBadge>();
  const theme = boardThemes[tone];
  const arrowMarkerId = useId().replace(/:/g, "");
  const whiteAdvantage = whiteWinPercentFromEval(evaluation);
  const evalDisplayLabel =
    typeof evaluation === "number" && evaluationLabel && /^[-+]?(\d|M)/.test(evaluationLabel)
      ? evaluationLabel
      : typeof evaluation === "number"
        ? formatEvalLabel(evaluation)
        : undefined;
  const evalDescription = describeEvalBar(evaluation);

  for (const square of highlightSquares) {
    highlightMap.set(square, "focus");
  }

  for (const highlight of highlights) {
    highlightMap.set(highlight.square, highlight.tone ?? "focus");
  }

  for (const badge of badges) {
    badgeMap.set(badge.square, badge);
  }

  const boardSurface = (
    <div className="relative min-w-0">
      <div
        className="relative grid aspect-square w-full grid-cols-8 overflow-hidden rounded-lg border bg-black/20 shadow-[0_28px_70px_rgba(0,0,0,0.26)] ring-1 ring-white/[0.035]"
        onContextMenu={onBoardContextMenu}
        style={{
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <svg className="pointer-events-none absolute inset-0 z-[26] h-full w-full overflow-visible" viewBox="0 0 800 800">
          <defs>
            {(["best", "candidate", "candidateSoft", "played", "refutation"] as BoardArrowTone[]).map((toneKey) => {
              const style = arrowToneStyles[toneKey];

              return (
                <marker
                  key={toneKey}
                  id={`${arrowMarkerId}-${toneKey}`}
                  markerWidth={style.markerSize}
                  markerHeight={style.markerSize}
                  refX={style.markerSize - 0.42}
                  refY={style.markerSize / 2}
                  orient="auto"
                >
                  <path
                    d={`M0,0 L${style.markerSize},${style.markerSize / 2} L0,${style.markerSize} z`}
                    fill={style.stroke}
                    fillOpacity={style.opacity}
                  />
                </marker>
              );
            })}
          </defs>

          {arrows.map((arrow, index) => {
            const toneKey = arrow.tone ?? "best";
            const style = arrowToneStyles[toneKey];
            const points =
              toneKey === "best"
                ? arrowLinePoints(arrow.from, arrow.to, { endInset: 22, orientation, startInset: 18 })
                : toneKey === "candidate" || toneKey === "candidateSoft"
                  ? arrowLinePoints(arrow.from, arrow.to, { endInset: 34, orientation, startInset: 24 })
                : arrowLinePoints(arrow.from, arrow.to, { orientation });

            if (toneKey === "best" || toneKey === "candidate" || toneKey === "candidateSoft") {
              const [leftHead, rightHead] = openArrowHeadPoints(points, {
                headAngle: toneKey === "best" ? 0.72 : 0.66,
                headLength: toneKey === "best" ? 48 : 34,
              });

              return (
                <g key={`${arrow.from}-${arrow.to}-${index}`} className={style.glow}>
                  <line
                    x1={points.x1}
                    y1={points.y1}
                    x2={points.x2}
                    y2={points.y2}
                    stroke={style.stroke}
                    strokeLinecap="round"
                    strokeOpacity={style.opacity}
                    strokeWidth={style.width}
                  />
                  <line
                    x1={points.x2}
                    y1={points.y2}
                    x2={leftHead.x}
                    y2={leftHead.y}
                    stroke={style.stroke}
                    strokeLinecap="round"
                    strokeOpacity={style.opacity}
                    strokeWidth={style.width}
                  />
                  <line
                    x1={points.x2}
                    y1={points.y2}
                    x2={rightHead.x}
                    y2={rightHead.y}
                    stroke={style.stroke}
                    strokeLinecap="round"
                    strokeOpacity={style.opacity}
                    strokeWidth={style.width}
                  />
                </g>
              );
            }

            return (
              <line
                key={`${arrow.from}-${arrow.to}-${index}`}
                x1={points.x1}
                y1={points.y1}
                x2={points.x2}
                y2={points.y2}
                markerEnd={`url(#${arrowMarkerId}-${toneKey})`}
                stroke={style.stroke}
                strokeLinecap="round"
                strokeOpacity={style.opacity}
                strokeWidth={style.width}
                className={style.glow}
              />
            );
          })}
        </svg>

        {animatedMove && pieceAssetMap[animatedMove.piece] ? (
          <div
            key={animatedMove.id}
            className={cn(
              "analysis-piece-slide pointer-events-none absolute z-20 drop-shadow-[0_8px_10px_rgba(0,0,0,0.28)]",
              variant === "analysis" ? "h-[12.5%] w-[12.5%]" : "h-[12.5%] w-[12.5%]",
            )}
            style={
              {
                "--piece-from-dx": squareMoveDelta(animatedMove.from, animatedMove.to, orientation).x,
                "--piece-from-dy": squareMoveDelta(animatedMove.from, animatedMove.to, orientation).y,
                left: squareTopLeft(animatedMove.to, orientation).x,
                top: squareTopLeft(animatedMove.to, orientation).y,
              } as CSSProperties
            }
          >
            <div className={cn("relative mx-auto h-[78%] w-[78%]", variant === "simple" ? "mt-[11%]" : "mt-[10%]")}>
                <Image
                  alt=""
                  aria-hidden="true"
                  className={cn("object-contain", pieceTheme === "neo" ? "opacity-95 saturate-[0.82] contrast-[1.14]" : "")}
                  draggable={false}
                  fill
                  loading="lazy"
                  sizes="96px"
                  src={pieceAssetMap[animatedMove.piece]}
                  unoptimized
                />
              </div>
          </div>
        ) : null}

        {Array.from({ length: 8 }, (_, displayRankIndex) =>
          Array.from({ length: 8 }, (_, displayFileIndex) => {
            const rankIndex = orientation === "white" ? displayRankIndex : 7 - displayRankIndex;
            const fileIndex = orientation === "white" ? displayFileIndex : 7 - displayFileIndex;
            const piece = board[rankIndex]?.[fileIndex];
            const isLight = (rankIndex + fileIndex) % 2 === 0;
            const square = `${String.fromCharCode(97 + fileIndex)}${8 - rankIndex}`;
            const highlightTone = highlightMap.get(square);
            const badge = badgeMap.get(square);
            const coordinateColor = isLight ? "rgba(55,65,83,0.78)" : "rgba(244,247,255,0.78)";

            return (
              <div
                key={square}
                aria-label={onSquareClick ? `Square ${square}` : undefined}
                className={cn("relative flex items-center justify-center", onSquareClick ? "cursor-pointer" : "")}
                data-board-square={square}
                onClick={onSquareClick ? () => onSquareClick(square) : undefined}
                role={onSquareClick ? "button" : undefined}
                tabIndex={onSquareClick ? 0 : undefined}
                onKeyDown={
                  onSquareClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSquareClick(square);
                        }
                      }
                    : undefined
                }
                style={{
                  backgroundColor: isLight ? theme.light : theme.dark,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.018)",
                }}
              >
                {showCoordinates && displayFileIndex === 0 ? (
                  <span
                    className={cn(
                      "pointer-events-none absolute left-1.5 top-1 text-[0.68rem] font-bold leading-none sm:left-2 sm:top-2 sm:text-[0.82rem]",
                      variant === "simple" ? "text-[0.62rem]" : "",
                    )}
                    style={{ color: coordinateColor }}
                  >
                    {ranks[rankIndex]}
                  </span>
                ) : null}

                {showCoordinates && displayRankIndex === 7 ? (
                  <span
                    className={cn(
                      "pointer-events-none absolute bottom-1 right-1.5 text-[0.68rem] font-bold leading-none sm:bottom-1.5 sm:right-2 sm:text-[0.82rem]",
                      variant === "simple" ? "text-[0.62rem]" : "",
                    )}
                    style={{ color: coordinateColor }}
                  >
                    {files[fileIndex]}
                  </span>
                ) : null}

                {highlightTone ? (
                  <span
                    className={cn(
                      "pointer-events-none absolute inset-[5%] rounded-[0.28rem] border shadow-[inset_0_0_18px_rgba(255,255,255,0.04)]",
                      highlightToneClasses[highlightTone],
                    )}
                  />
                ) : null}

                {piece && pieceAssetMap[piece] ? (
                  <div
                    className={cn(
                      "pointer-events-none relative z-10 select-none drop-shadow-[0_8px_8px_rgba(0,0,0,0.25)]",
                      variant === "analysis" ? "h-[78%] w-[78%] sm:h-[80%] sm:w-[80%]" : "h-[73%] w-[73%]",
                      pieceTheme === "neo" ? "opacity-95 saturate-[0.82] contrast-[1.14] drop-shadow-[0_9px_9px_rgba(0,0,0,0.32)]" : "",
                    )}
                  >
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="object-contain"
                      draggable={false}
                      fill
                      loading="lazy"
                      sizes="96px"
                      src={pieceAssetMap[piece]}
                      unoptimized
                    />
                  </div>
                ) : null}

                {badge ? (
                  <span
                    aria-label={badge.label}
                    className="pointer-events-none absolute right-[3%] top-[3%] z-30 grid size-[31%] place-items-center rounded-full drop-shadow-[0_5px_8px_rgba(0,0,0,0.32)]"
                    role={badge.label ? "img" : undefined}
                  >
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="object-contain"
                      draggable={false}
                      height={36}
                      loading="lazy"
                      src={badge.src}
                      unoptimized
                      width={36}
                    />
                  </span>
                ) : null}

                <SquareOverlayInline
                  square={square}
                  showBrackets={cornerBrackets.includes(square)}
                  showCenterDot={centerDots.includes(square)}
                  bracketType={cornerBrackets.includes(square) && square === cornerBrackets[0] ? "selected" : "legal-target"}
                  dotType={centerDots.includes(square) ? "last-move" : "last-move"}
                />
              </div>
            );
          }),
        )}
      </div>
    </div>
  );

  if (variant === "analysis") {
    return (
      <div
        className={cn(
          "w-full min-w-0 overflow-hidden rounded-xl border p-2 shadow-[0_0_20px_rgba(0,212,170,0.12),0_36px_90px_rgba(0,0,0,0.34)] sm:p-2.5",
          theme.frame,
          theme.frameBorder,
          className,
        )}
      >
        {topPlayer ? <PlayerStrip {...topPlayer} /> : null}

        <div className="mt-2 grid grid-cols-[8px_minmax(0,1fr)] items-stretch gap-1 pb-4">
          <div
            aria-label={`${evalDescription} White bar ${Math.round(whiteAdvantage)} percent.`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(whiteAdvantage)}
            aria-valuetext={evalDisplayLabel}
            className="analysis-eval-rail relative h-full min-h-[16rem] w-2 overflow-visible rounded-[4px] sm:min-h-[19rem]"
            data-eval-percent={whiteAdvantage.toFixed(2)}
            data-testid="analysis-evaluation-bar"
            role="meter"
          >
            <div className="h-full overflow-hidden rounded-[4px] bg-[#1a1a2e]">
              <div
                className="analysis-eval-fill absolute inset-x-0 top-0"
                data-testid="analysis-evaluation-white"
                style={{ height: `${whiteAdvantage}%` }}
              />
            </div>
            {evalDisplayLabel ? (
              <span
                className="absolute left-1/2 top-[calc(100%+4px)] -translate-x-1/2 whitespace-nowrap text-center font-mono text-[10px] leading-none text-slate-400"
                data-testid="analysis-evaluation-label"
              >
                {evalDisplayLabel}
              </span>
            ) : null}
          </div>

          {boardSurface}
        </div>

        {bottomPlayer ? <div className="mt-2"><PlayerStrip {...bottomPlayer} /></div> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full max-w-[25rem] rounded-xl border p-2 shadow-[0_0_20px_rgba(0,212,170,0.1),0_30px_90px_rgba(0,0,0,0.28)]",
        theme.frame,
        theme.frameBorder,
        className,
      )}
    >
      {boardSurface}
    </div>
  );
}
