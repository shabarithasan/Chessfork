"use client";

interface EvalBarProps {
  evaluation: { type: "cp" | "mate"; value: number } | null;
  height?: number;
  width?: number;
}

export default function EvalBar({ evaluation, height = 440, width = 20 }: EvalBarProps) {
  let evalPercent = 50;
  let displayScore = "0.0";

  if (evaluation) {
    if (evaluation.type === "mate") {
      evalPercent = evaluation.value > 0 ? 90 : 10;
      displayScore = evaluation.value > 0 ? `+M${evaluation.value}` : `-M${Math.abs(evaluation.value)}`;
    } else {
      evalPercent = 50 + 40 * Math.tanh(evaluation.value * 0.8);
      evalPercent = Math.max(10, Math.min(90, evalPercent));
      const sign = evaluation.value >= 0 ? "+" : "";
      displayScore = `${sign}${evaluation.value.toFixed(2)}`;
    }
  }

  const scaleY = evalPercent / 100;

  return (
    <div
      className="relative overflow-hidden rounded-md bg-[#3a3a3a] shrink-0"
      style={{ height, width }}
    >
      <div
        className="absolute inset-0 bg-[#f5f5f4] transition-transform duration-500 ease-out"
        style={{ transform: `scaleY(${scaleY})`, transformOrigin: "center bottom" }}
      />
      <div className="absolute inset-x-0 top-1/2 h-px bg-[rgba(115,115,115,.7)]" />
      <span className="absolute inset-x-0 bottom-1 text-center font-mono text-[9px] font-semibold tabular-nums tracking-[-0.5px] text-[#171717]">
        {displayScore}
      </span>
    </div>
  );
}
