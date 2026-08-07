"use client";

interface MoveScrubberProps {
  history: { san: string; from: string; to: string }[];
  currentMoveIndex: number;
  onNavigate: (index: number) => void;
  moveClassifications?: Record<number, string>;
  boardWidth?: number;
}

const CLASS_TO_CDN: Record<string, string> = {
  best: "best",
  excellent: "excellent",
  good: "good",
  inaccuracy: "inaccuracy",
  mistake: "mistake",
  blunder: "blunder",
};

export default function MoveScrubber({
  history,
  currentMoveIndex,
  onNavigate,
  moveClassifications = {},
  boardWidth = 440,
}: MoveScrubberProps) {
  if (history.length === 0) return null;

  return (
    <div style={{ width: boardWidth, marginLeft: 28 }}>
      <div className="relative flex items-stretch h-11 rounded-lg border border-neutral-700/50 bg-[#1f1f1f] w-full">
        <button
          type="button"
          aria-label="Previous move"
          onClick={() => onNavigate(Math.max(-1, currentMoveIndex - 1))}
          disabled={currentMoveIndex <= -1}
          className="flex shrink-0 items-center justify-center transition-[background-color,transform] active:scale-[0.96] disabled:active:scale-100 w-11 rounded-l-lg border-r border-black/10 bg-amber-400 text-[#171717] hover:bg-amber-500 active:bg-amber-500 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M14 6l-6 6 6 6" />
          </svg>
        </button>

        <div
          className="relative flex h-full flex-1 items-center gap-0.5 overflow-x-auto px-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ touchAction: "pan-x" }}
        >
          {history.map((move, idx) => {
            const isActive = idx === currentMoveIndex;
            const grade = moveClassifications[idx];
            const cdnFile = grade ? CLASS_TO_CDN[grade] : null;
            return (
              <button
                key={idx}
                type="button"
                aria-label={`Move ${move.san}${isActive ? " (current)" : ""}`}
                aria-current={isActive ? "true" : undefined}
                data-current={isActive ? "true" : undefined}
                onClick={() => onNavigate(idx)}
                className={`relative flex items-center gap-[5px] whitespace-nowrap rounded px-[7px] py-1 font-mono text-sm transition-[background-color,color,transform] duration-150 active:scale-[0.96] ${
                  isActive
                    ? "bg-amber-400 font-semibold text-[#171717]"
                    : "text-neutral-200 hover:bg-neutral-700"
                }`}
              >
                {move.san}
                {cdnFile && (
                  <img
                    alt={grade!}
                    src={`https://cdn.chessigma.dev/moves/${cdnFile}.png`}
                    className="size-4 shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Next move"
          onClick={() => onNavigate(Math.min(history.length - 1, currentMoveIndex + 1))}
          disabled={currentMoveIndex >= history.length - 1}
          className="flex shrink-0 items-center justify-center transition-[background-color,transform] active:scale-[0.96] disabled:active:scale-100 w-11 rounded-r-lg border-l border-black/10 bg-amber-400 text-[#171717] hover:bg-amber-500 active:bg-amber-500 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M10 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
