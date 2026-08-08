import { X } from "lucide-react";
import { PandaMascot } from "@/components/mascot/PandaMascot";

interface TrainerPanelProps {
  totalMistakes: number;
  currentIndex: number;
  mistakeSan: string;
  targetBestMove: string;
  status: "playing" | "success" | "failed" | "finished";
  userAttemptSan: string | null;
  onNext: () => void;
  onRetry: () => void;
  onExit: () => void;
}

export function TrainerPanel({
  totalMistakes,
  currentIndex,
  mistakeSan,
  targetBestMove,
  status,
  userAttemptSan,
  onNext,
  onRetry,
  onExit,
}: TrainerPanelProps) {
  if (status === "finished") {
    return (
      <div className="flex flex-col h-full bg-[#242321] rounded-xl p-6 text-center items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <PandaMascot size={120} />
        <h2 className="mt-4 text-xl font-bold text-white">Trainer Complete!</h2>
        <p className="mt-2 text-[14px] text-neutral-400">
          You reviewed all {totalMistakes} mistakes. Keep learning!
        </p>
        <button
          onClick={onExit}
          className="mt-6 rounded-lg bg-amber-400 px-6 py-2.5 font-semibold text-neutral-900 transition-transform active:scale-[0.98] hover:bg-amber-500"
        >
          Return to Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#242321] rounded-xl overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-[#171717]">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#2c2b29] px-4 py-3 border-b border-white/[0.05]">
        <div className="text-sm font-semibold text-neutral-300">
          Mistake {currentIndex + 1} of {totalMistakes}
        </div>
        <button
          onClick={onExit}
          className="text-neutral-400 hover:text-white transition-colors"
          aria-label="Exit Trainer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 gap-6">
        <div className="flex items-start gap-3">
          <div className="shrink-0 drop-shadow-[0_5px_12px_rgba(0,0,0,.45)]">
            <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
              <PandaMascot size={80} />
            </div>
          </div>
          <div className="relative self-center rounded-xl bg-[#f5f5f4] px-4 py-3 text-[14px] font-medium leading-[1.5] text-neutral-800">
            <span className="absolute -left-[5px] top-6 h-3 w-3 -translate-y-1/2 rotate-45 rounded-[2px] bg-[#f5f5f4]" />
            {status === "playing" && (
              <span>
                You played <strong className="font-mono">{mistakeSan}</strong> here, which was a mistake. Can you find the best move instead?
              </span>
            )}
            {status === "success" && (
              <span>
                Excellent! <strong className="font-mono text-emerald-600">{targetBestMove}</strong> is the best continuation.
              </span>
            )}
            {status === "failed" && (
              <span>
                Not quite. <strong className="font-mono text-rose-600">{userAttemptSan}</strong> isn't the best move. Keep looking!
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-auto flex justify-end">
          {status === "success" && (
            <button
              onClick={onNext}
              className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-white transition-transform active:scale-[0.98] hover:bg-emerald-600"
            >
              {currentIndex + 1 < totalMistakes ? "Next Mistake" : "Finish Trainer"}
            </button>
          )}
          {status === "failed" && (
            <button
              onClick={onRetry}
              className="w-full rounded-lg bg-amber-400 px-4 py-3 font-semibold text-neutral-900 transition-transform active:scale-[0.98] hover:bg-amber-500"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
