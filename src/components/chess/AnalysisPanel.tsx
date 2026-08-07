"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export interface AnalysisPanelMove {
  san: string;
  from: string;
  to: string;
  eval: number;
  mate: number | null;
  line: string[];
}

interface AnalysisPanelProps {
  bestMove: string;
  evalScore: number;
  mate: number | null;
  topMoves: AnalysisPanelMove[];
  selectedLineIndex: number | null;
  onSelectLine: (index: number) => void;
  onSeeBestMove: () => void;
  onExplain?: () => void;
  explanation?: string | null;
  isExplaining?: boolean;
  depth?: number;
  isAnalyzing?: boolean;
  onGoDeeper?: () => void;
  onToggleEngine?: () => void;
  engineOn?: boolean;
}

function formatEval(eval_: number): string {
  if (Math.abs(eval_) > 5000) {
    const mateIn = eval_ > 0 ? Math.round((100000 - eval_) / 100) : Math.round((100000 + eval_) / 100);
    return `M${mateIn}`;
  }
  return `${eval_ >= 0 ? "+" : ""}${(eval_ / 100).toFixed(2)}`;
}

function evalLabel(eval_: number, san: string): string {
  if (eval_ > 300) return `${san} is crushing`;
  if (eval_ > 100) return `${san} is dominant`;
  if (eval_ > 50) return `${san} is strong`;
  if (eval_ > -50) return `Balanced position`;
  if (eval_ > -100) return `${san} is inaccurate`;
  if (eval_ > -300) return `${san} is a mistake`;
  return `${san} is clown`;
}

export function AnalysisPanel({
  bestMove,
  evalScore,
  mate,
  topMoves,
  selectedLineIndex,
  onSelectLine,
  onSeeBestMove,
  onExplain,
  explanation,
  isExplaining,
  depth = 0,
  isAnalyzing: isAnalyzingProp = false,
  onGoDeeper,
  onToggleEngine,
  engineOn = true,
}: AnalysisPanelProps) {

  const label = mate !== null
    ? (mate > 0 ? `Forced mate in ${mate}` : `Getting mated in ${Math.abs(mate)}`)
    : evalLabel(evalScore, bestMove);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-xl border border-[#1e1e2e] bg-[#111118] p-4"
    >
      {/* Panda mascot card */}
      <div className="bg-white text-black rounded-xl p-4 shadow-md">
        <div className="flex items-start gap-4">
          <motion.div
            className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden p-0.5"
            style={{
              background: evalScore > 50
                ? "linear-gradient(135deg, #22c55e, #16a34a)"
                : evalScore < -200
                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                  : evalScore < -50
                    ? "linear-gradient(135deg, #f59e0b, #d97706)"
                    : "linear-gradient(135deg, #f3c53d, #d4a51d)"
            }}
            animate={
              evalScore < -200
                ? { x: [0, -3, 3, -3, 3, 0], rotate: [0, -3, 3, -3, 3, 0] }
                : evalScore > 200
                  ? { scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] }
                  : evalScore < -50
                    ? { x: [0, 2, -2, 0] }
                    : { y: [0, -2, 0] }
            }
            transition={{
              duration: evalScore < -200 ? 0.5 :
                        evalScore > 200 ? 0.6 :
                        evalScore < -50 ? 0.4 : 2.5,
              repeat: (evalScore > -50 && evalScore <= 50) ? Infinity : 2,
              ease: "easeInOut"
            }}
            whileHover={{ scale: 1.1 }}
          >
            <div className="w-full h-full rounded-[10px] bg-gradient-to-br from-[#f3c53d] to-[#d4a51d] flex items-center justify-center p-1">
            <svg viewBox="0 0 485.77 626.36" className="w-full h-full">
              <defs>
                <linearGradient id="sa1">
                  <stop offset="0" stopColor="#5aa02c" />
                  <stop offset="1" stopColor="#83e741" />
                </linearGradient>
                <linearGradient id="sa2" y2="1016.9" xlinkHref="#sa1" gradientUnits="userSpaceOnUse" x2="823.33" gradientTransform="matrix(.41806 .067035 -.067035 .41806 -416.58 482.16)" y1="875.7" x1="823.33" />
                <linearGradient id="sa3" y2="1016.9" xlinkHref="#sa1" gradientUnits="userSpaceOnUse" x2="823.33" gradientTransform="matrix(.51096 -.10273 .10273 .51096 -659.4 483.27)" y1="875.7" x1="823.33" />
                <linearGradient id="sa4" y2="1016.9" xlinkHref="#sa1" gradientUnits="userSpaceOnUse" x2="823.33" gradientTransform="matrix(.32275 -.19369 .19369 .32275 -607.55 695.42)" y1="875.7" x1="823.33" />
                <linearGradient id="sa5" y2="1016.9" xlinkHref="#sa1" gradientUnits="userSpaceOnUse" x2="823.33" gradientTransform="matrix(.17316 -.49158 .49158 .17316 -880.15 1100.9)" y1="875.7" x1="823.33" />
              </defs>
              <g transform="translate(402.09 -849.58)">
                <path style={{fill:"#000000"}} d="m53.379 1246.4c14.84 55.607 40.718 120.17 3.5502 149.23-38.657 30.221-149.1 52.424-208.99 52.424-64.809 0-165.24-29.551-201.9-62.935-32.254-29.374-30.803-96.421-6.7759-136.18 47.33-78.313 95.233-161.38 212.71-161.38s186.56 103.23 201.4 158.84z" />
                <path style={{fill:"#ffffff"}} d="m-4.9035 1252.5c10.613 39.767 29.119 85.94 2.5389 106.72-27.645 21.612-106.62 37.49-149.46 37.49-46.347 0-118.17-21.133-144.39-45.007-23.066-21.007-22.028-68.955-4.8457-97.385 33.848-56.005 68.105-115.41 152.12-115.41 84.012 0 133.42 73.824 144.03 113.59z" />
                <path style={{fillRule:"evenodd",fill:"#000000"}} d="m485.71 255.22c0 216.18-211.71 391.43-472.86 391.43-261.14 0-472.85-175.25-472.85-391.43s211.71-391.43 472.86-391.43 472.86 175.25 472.86 391.43z" transform="matrix(.41862 0 0 .40634 -157.85 957.77)" />
                <path style={{fill:"#000000"}} d="m-445.71 125.22c0 74.953-50.528 135.71-112.86 135.71-62.329 0-112.86-60.761-112.86-135.71 0-74.953 50.528-135.71 112.86-135.71 62.329 0 112.86 60.761 112.86 135.71z" transform="matrix(.50815 -.18222 .18222 .50815 -18.804 756.88)" />
                <path style={{fill:"#000000"}} d="m-445.71 125.22c0 74.953-50.528 135.71-112.86 135.71-62.329 0-112.86-60.761-112.86-135.71 0-74.953 50.528-135.71 112.86-135.71 62.329 0 112.86 60.761 112.86 135.71z" transform="matrix(-.47670 -.25333 -.25333 .47670 -261.16 719.14)" />
                <path style={{fillRule:"evenodd",fill:"#ffffff"}} d="m485.71 255.22c0 216.18-211.71 391.43-472.86 391.43-261.14 0-472.85-175.25-472.85-391.43s211.71-391.43 472.86-391.43 472.86 175.25 472.86 391.43z" transform="matrix(.37889 0 0 .36778 -157.34 967.61)" />
                <path style={{fill:"#ffffff"}} d="m-445.71 125.22c0 74.953-50.528 135.71-112.86 135.71-62.329 0-112.86-60.761-112.86-135.71 0-74.953 50.528-135.71 112.86-135.71 62.329 0 112.86 60.761 112.86 135.71z" transform="matrix(-0.375 -.19929 -.19929 0.375 -211.13 762.06)" />
                <path style={{fill:"#ffffff"}} d="m-445.71 125.22c0 74.953-50.528 135.71-112.86 135.71-62.329 0-112.86-60.761-112.86-135.71 0-74.953 50.528-135.71 112.86-135.71 62.329 0 112.86 60.761 112.86 135.71z" transform="matrix(.38521 -.13813 .13813 .38521 -81.953 796.9)" />
                <path style={{fill:"#000000"}} d="m-445.71 125.22c0 74.953-50.528 135.71-112.86 135.71-62.329 0-112.86-60.761-112.86-135.71 0-74.953 50.528-135.71 112.86-135.71 62.329 0 112.86 60.761 112.86 135.71z" transform="matrix(.25408 -.091111 .091111 .25408 -149.31 839.58)" />
                <path style={{fill:"#000000"}} d="m-445.71 125.22c0 74.953-50.528 135.71-112.86 135.71-62.329 0-112.86-60.761-112.86-135.71 0-74.953 50.528-135.71 112.86-135.71 62.329 0 112.86 60.761 112.86 135.71z" transform="matrix(-.25366 -.13480 -.13480 .25366 -151.42 813.27)" />
                <g transform="matrix(.40635 0 0 .40635 -63.653 878.82)">
                  <path style={{fill:"#000000"}} d="m-228.57 325.22c0 49.706-57.563 90-128.57 90-71.008 0-128.57-40.294-128.57-90s57.563-90 128.57-90c71.008 0 128.57 40.294 128.57 90z" transform="matrix(-.95339 .30174 .30174 .95339 -844.34 108.64)" />
                  <g transform="translate(442.86 51.429)">
                    <path style={{fill:"#000000"}} d="m-757.14 290.93c0 40.238-32.619 72.857-72.857 72.857s-72.857-32.619-72.857-72.857 32.619-72.857 72.857-72.857 72.857 32.619 72.857 72.857z" />
                    <path style={{fill:"#ffffff"}} d="m-757.14 290.93c0 40.238-32.619 72.857-72.857 72.857s-72.857-32.619-72.857-72.857 32.619-72.857 72.857-72.857 72.857 32.619 72.857 72.857z" transform="matrix(.76471 0 0 .76471 -195.29 68.455)" />
                    <path style={{fill:"#000000"}} d="m-757.14 290.93c0 40.238-32.619 72.857-72.857 72.857s-72.857-32.619-72.857-72.857 32.619-72.857 72.857-72.857 72.857 32.619 72.857 72.857z" transform="matrix(.21569 0 0 .21569 -639.55 245.33)" />
                  </g>
                </g>
                <g transform="matrix(.40635 0 0 .40635 -63.653 883.46)">
                  <path style={{fill:"#000000"}} d="m-228.57 325.22c0 49.706-57.563 90-128.57 90-71.008 0-128.57-40.294-128.57-90s57.563-90 128.57-90c71.008 0 128.57 40.294 128.57 90z" transform="matrix(.95339 .30174 -.30174 .95339 367.2 94.351)" />
                  <g transform="matrix(-1 0 0 1 -922.86 40)">
                    <path style={{fill:"#000000"}} d="m-757.14 290.93c0 40.238-32.619 72.857-72.857 72.857s-72.857-32.619-72.857-72.857 32.619-72.857 72.857-72.857 72.857 32.619 72.857 72.857z" />
                    <path style={{fill:"#ffffff"}} d="m-757.14 290.93c0 40.238-32.619 72.857-72.857 72.857s-72.857-32.619-72.857-72.857 32.619-72.857 72.857-72.857 72.857 32.619 72.857 72.857z" transform="matrix(.76471 0 0 .76471 -195.29 68.455)" />
                    <path style={{fill:"#000000"}} d="m-757.14 290.93c0 40.238-32.619 72.857-72.857 72.857s-72.857-32.619-72.857-72.857 32.619-72.857 72.857-72.857 72.857 32.619 72.857 72.857z" transform="matrix(.21569 0 0 .21569 -639.55 245.33)" />
                  </g>
                </g>
                <path style={{fill:"#000000"}} d="m-85.714 515.22c0 20.513-35.817 37.143-80 37.143s-80-16.629-80-37.143c0-20.513 35.817-37.143 80-37.143s80 16.629 80 37.143z" transform="matrix(.37732 0 0 .34383 -92.843 906.38)" />
                <path style={{fill:"#000000"}} d="m-85.714 515.22c0 20.513-35.817 37.143-80 37.143s-80-16.629-80-37.143c0-20.513 35.817-37.143 80-37.143s80 16.629 80 37.143z" transform="matrix(.26848 0 0 .21880 -73.148 1054.4)" />
                <path style={{fill:"#000000"}} d="m-74.823 1225.5c-39.726 18.398-63.101 52.363-52.215 75.869 5.6052 12.103 19.198 19.074 40.938 12.214 16.583-11.822 15.638-41.49 57.902-58.619 16.187-6.5604 32.529-10.519 47.418-11.945-0.38398-2.8643-1.1776-5.6353-2.3992-8.273-10.886-23.506-51.917-27.644-91.643-9.2462z" />
                <g transform="matrix(.40635 0 0 .40635 -68.297 878.82)">
                  <path style={{fill:"url(#sa5)"}} d="m-227.42 744.35s12.791 62.364-9.5754 125.86c-22.366 63.494-71.419 104.07-71.419 104.07s-27.062-67.392-4.6962-130.89c22.366-63.494 85.691-99.046 85.691-99.046z" />
                  <path style={{fill:"#803300"}} d="m-333.11 954.9c-50.79 77.537-50.931 162.51-5.0508 192.56 23.623 15.474 2.5704-36.366 6.2864-88.784-9.9609-50.062 9.4569-78.17 59.794-115.8 29.736-22.23 102.42-42.551 127.58-61.783-3.8969-4.7173-8.4255-8.8083-13.574-12.181-45.88-30.053-124.25 8.4499-175.04 85.987z" />
                  <path style={{fill:"url(#sa2)"}} d="m-36.85 952.13s-47.991 19.278-101.99 10.62c-53.998-8.6584-93.555-41.975-93.555-41.975s49.937-31.415 103.93-22.757c53.998 8.6585 91.609 54.112 91.609 54.112z" />
                  <path style={{fill:"url(#sa4)"}} d="m-80.239 797.75s-21.611 40.583-63.299 65.6c-41.688 25.018-87.666 24.996-87.666 24.996s15.988-49.953 57.675-74.971c41.688-25.018 93.289-15.626 93.289-15.626z" />
                  <path style={{fill:"url(#sa3)"}} d="m-19.118 861.68s-47.039 42.898-113.04 56.167c-65.997 13.269-125.96-8.1147-125.96-8.1147s44.057-57.732 110.05-71.002c65.997-13.269 128.94 22.949 128.94 22.949z" />
                </g>
                <path style={{fill:"#000000"}} d="m-221.8 1224.2c39.726 18.398 63.101 52.363 52.215 75.869-5.6052 12.103-19.198 19.074-40.938 12.214-16.583-11.822-15.638-41.49-57.902-58.619-16.187-6.5604-32.529-10.519-47.418-11.945 0.38398-2.8643 1.1776-5.6353 2.3992-8.273 10.886-23.506 51.917-27.644 91.643-9.2462z" />
              </g>
            </svg>
            </div>
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-900 truncate">{label}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {mate !== null
                ? `The engine sees a forced checkmate sequence.`
                : evalScore > 100
                  ? `${bestMove} maintains a strong advantage.`
                  : evalScore > 50
                    ? `${bestMove} keeps the pressure.`
                    : evalScore > -50
                      ? "The position is roughly balanced."
                      : evalScore > -100
                        ? `${bestMove} is the engine's recommendation.`
                        : evalScore > -300
                          ? `The engine prefers alternatives to ${bestMove}.`
                          : `The engine sees this as lost.`}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {evalScore > 0 ? `+${(evalScore / 100).toFixed(1)}` : (evalScore / 100).toFixed(1)} engine evaluation
            </p>
          </div>
        </div>
        {onExplain && (
          <button
            type="button"
            onClick={onExplain}
            disabled={isExplaining}
            className="mt-4 w-full bg-[#302e2c] text-white font-medium py-2.5 rounded-lg hover:bg-black transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isExplaining ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Explain"
            )}
          </button>
        )}
        {explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2 overflow-hidden"
          >
            <div className="rounded-lg border border-yellow-500/15 bg-yellow-500/5 p-2.5">
              <p className="text-xs leading-relaxed text-gray-700">{explanation}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Depth calculation */}
      <div className="flex items-center gap-3 mt-[18px]">
        <div className="relative flex flex-1 items-center h-5">
          <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-neutral-700/70">
            <span className={`absolute inset-0 ${isAnalyzingProp ? "bg-amber-400/50 shadow-[0_0_4px_rgba(251,191,36,0.4)]" : "bg-neutral-700/30"}`} />
          </div>
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-md border border-neutral-700 bg-neutral-800 px-1.5 py-0.5">
            <span className="font-mono font-semibold leading-none tabular-nums text-[11px] text-amber-400">{depth}</span>
            {onGoDeeper && (
              <button
                type="button"
                aria-label="Go deeper"
                onClick={onGoDeeper}
                className="font-mono text-[12px] font-bold leading-none text-amber-400 transition-[color,transform] duration-150 active:scale-[0.96] hover:text-amber-300"
              >
                +
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label={engineOn ? "Turn off live engine" : "Turn on live engine"}
          aria-pressed={engineOn}
          onClick={onToggleEngine}
          className={`group/engine relative flex overflow-hidden rounded-lg p-[1.5px] transition-[background-color,transform] duration-150 active:scale-[0.96] h-9 ${
            engineOn ? "bg-amber-400/50" : "bg-neutral-700/50"
          }`}
        >
          <span aria-hidden="true" className="coach-explain-wave-rotor" />
          <span className={`relative z-10 flex items-center justify-center rounded-[6.5px] px-3 transition-colors duration-150 ${
            engineOn ? "bg-neutral-800 text-amber-400" : "bg-neutral-800 text-neutral-500"
          }`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[17px] w-[17px]">
              <rect x="5" y="5" width="14" height="14" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
            </svg>
          </span>
        </button>
      </div>

      {/* Evaluation graph & engine lines */}
      <div className="bg-[#1e1e1e] rounded-xl p-3 border border-[#3d3b38]">
        <div className="relative h-16 w-full mb-2">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="stroke-[#f3c53d] fill-none stroke-2">
            <path d="M0 80 Q10 70, 20 75 T40 60 T60 90 T80 50 T100 20" />
          </svg>
          <div className="absolute top-[18%] right-[5%] w-2 h-2 bg-green-500 rounded-full"></div>
          <div className="absolute bottom-[10%] left-[20%] w-2 h-2 bg-red-500 rounded-full"></div>
        </div>

        <div className="text-xs font-mono space-y-1">
          {topMoves.length > 0 ? (
            topMoves.slice(0, 3).map((move, i) => {
              const evalText = move.mate !== null
                ? (move.mate > 0 ? `M${move.mate}` : `-M${Math.abs(move.mate)}`)
                : `${move.eval >= 0 ? "+" : ""}${(move.eval / 100).toFixed(1)}`;
              const isPositive = move.eval >= 0;
              const lineText = move.line.slice(0, 4).join(" ");
              return (
                <div key={i} className="flex justify-between text-gray-300">
                  <span className={isPositive ? "text-green-400" : "text-red-400"}>{evalText}</span>
                  <span className="text-gray-300">{move.san} {lineText}</span>
                  <span className={isPositive ? "text-green-400" : "text-red-400"}>{evalText}</span>
                </div>
              );
            })
          ) : (
            <>
              <div className="flex justify-between text-gray-300">
                <span className="text-green-400">+5.1</span>
                <span>25. f4 Qg4 Bd5 Rxe6</span>
                <span className="text-green-400">+5.1</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span className="text-green-400">+5.7</span>
                <span>25. Be4 Qc7 Rd5 Qe7</span>
                <span className="text-green-400">+5.7</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span className="text-red-400">+0.8</span>
                <span>25. Rd7 Rxd7 Bxd7</span>
                <span className="text-red-400">+0.8</span>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onSeeBestMove}
          className="mt-3 w-full bg-[#f3c53d] text-black font-bold py-2 rounded-lg hover:bg-yellow-500 transition"
        >
          See best move
        </button>
      </div>

      {topMoves.length > 0 && (
        <>
          {/* Alternative lines */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Alternative Lines</h4>
            {topMoves.map((move, i) => {
              const isSelected = selectedLineIndex === i;
              const isBest = i === 0;
              const lineText = move.line.slice(0, 6).join(" ");
              const evalText = move.mate !== null
                ? (move.mate > 0 ? `M${move.mate}` : `-M${Math.abs(move.mate)}`)
                : formatEval(move.eval);

              return (
                <motion.button
                  key={`${move.san}-${i}`}
                  layout
                  onClick={() => onSelectLine(i)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${
                    isSelected
                      ? "border border-cyan-500/40 bg-cyan-500/10"
                      : "border border-transparent hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded text-[9px] font-bold ${
                      isBest
                        ? "bg-green-500/20 text-green-400"
                        : i === 1
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-slate-500/20 text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </span>

                  <span
                    className={`w-14 shrink-0 font-mono text-[11px] font-semibold ${
                      move.eval >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {evalText}
                  </span>

                  <span className="text-slate-600">│</span>

                  <span className="flex-1 truncate text-slate-300">
                    <span className="font-semibold text-white">{move.san}</span>
                    {lineText ? ` ${lineText}` : ""}
                  </span>

                  {isSelected && (
                    <motion.span
                      layoutId="line-active"
                      className="size-1.5 shrink-0 rounded-full bg-cyan-400"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

        </>
      )}
    </motion.div>
  );
}
