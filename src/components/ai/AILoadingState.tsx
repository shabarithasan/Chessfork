"use client";

import { useEffect, useRef, useState } from "react";

const TASK_SEQUENCES = [
  {
    status: "Analyzing your position",
    lines: [
      "Reading the position...",
      "Evaluating material balance...",
      "Checking king safety...",
      "Scanning for tactics...",
      "Generating candidate moves...",
    ],
  },
  {
    status: "Consulting Stockfish 18",
    lines: [
      "Loading Stockfish 18...",
      "Setting search depth...",
      "Evaluating candidate moves...",
      "Computing centipawn scores...",
      "Comparing best continuations...",
      "Finalizing engine analysis...",
    ],
  },
  {
    status: "Preparing your answer",
    lines: [
      "Organizing insights...",
      "Writing your explanation...",
      "Formatting variations...",
      "Checking for accuracy...",
      "Adding training tips...",
      "Finalizing answer...",
    ],
  },
];

const LoadingAnimation = ({ progress }: { progress: number }) => (
  <div className="relative h-6 w-6">
    <svg
      aria-label={`Loading progress: ${Math.round(progress)}%`}
      className="h-full w-full"
      fill="none"
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Loading Progress Indicator</title>

      <defs>
        <mask id="ai-loading-progress-mask">
          <rect fill="black" height="240" width="240" />
          <circle
            cx="120"
            cy="120"
            fill="white"
            r="120"
            strokeDasharray={`${(progress / 100) * 754}, 754`}
            transform="rotate(-90 120 120)"
          />
        </mask>
      </defs>

      <style>{`
        @keyframes ai-loading-rotate-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ai-loading-rotate-ccw {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .ai-loading-spin circle {
          transform-origin: 120px 120px;
        }
        .ai-loading-spin circle:nth-child(1) { animation: ai-loading-rotate-cw 8s linear infinite; }
        .ai-loading-spin circle:nth-child(2) { animation: ai-loading-rotate-ccw 8s linear infinite; }
        .ai-loading-spin circle:nth-child(3) { animation: ai-loading-rotate-cw 8s linear infinite; }
        .ai-loading-spin circle:nth-child(4) { animation: ai-loading-rotate-ccw 8s linear infinite; }
        .ai-loading-spin circle:nth-child(5) { animation: ai-loading-rotate-cw 8s linear infinite; }
        .ai-loading-spin circle:nth-child(6) { animation: ai-loading-rotate-ccw 8s linear infinite; }

        .ai-loading-spin circle:nth-child(2n) { animation-delay: 0.2s; }
        .ai-loading-spin circle:nth-child(3n) { animation-delay: 0.3s; }
      `}</style>

      <g
        className="ai-loading-spin"
        mask="url(#ai-loading-progress-mask)"
        strokeDasharray="18% 40%"
        strokeWidth="16"
      >
        <circle cx="120" cy="120" opacity="0.95" r="150" stroke="#00d4aa" />
        <circle cx="120" cy="120" opacity="0.95" r="130" stroke="#3b82f6" />
        <circle cx="120" cy="120" opacity="0.95" r="110" stroke="#f3c53d" />
        <circle cx="120" cy="120" opacity="0.95" r="90" stroke="#f97316" />
        <circle cx="120" cy="120" opacity="0.95" r="70" stroke="#a855f7" />
        <circle cx="120" cy="120" opacity="0.95" r="50" stroke="#22c55e" />
      </g>
    </svg>
  </div>
);

export function AILoadingState() {
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState<Array<{ text: string; number: number }>>([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const lineHeight = 28;

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      rootMargin: "100px",
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const currentSequence = TASK_SEQUENCES[sequenceIndex];
  const totalLines = currentSequence.lines.length;

  useEffect(() => {
    const initialLines = [];
    for (let i = 0; i < Math.min(5, totalLines); i++) {
      initialLines.push({
        text: currentSequence.lines[i],
        number: i + 1,
      });
    }
    setVisibleLines(initialLines);
    setScrollPosition(0);
  }, [sequenceIndex, currentSequence.lines, totalLines]);

  useEffect(() => {
    if (!isVisible) return;

    const advanceTimer = setInterval(() => {
      const firstVisibleLineIndex = Math.floor(scrollPosition / lineHeight);
      const nextLineIndex = (firstVisibleLineIndex + 3) % totalLines;

      if (nextLineIndex < firstVisibleLineIndex && nextLineIndex !== 0) {
        setSequenceIndex((prevIndex) => (prevIndex + 1) % TASK_SEQUENCES.length);
        return;
      }

      if (nextLineIndex >= visibleLines.length && nextLineIndex < totalLines) {
        setVisibleLines((prevLines) => [
          ...prevLines,
          {
            text: currentSequence.lines[nextLineIndex],
            number: nextLineIndex + 1,
          },
        ]);
      }

      setScrollPosition((prevPosition) => prevPosition + lineHeight);
    }, 2000);

    return () => clearInterval(advanceTimer);
  }, [isVisible, scrollPosition, visibleLines, totalLines, sequenceIndex, currentSequence.lines, lineHeight]);

  useEffect(() => {
    if (codeContainerRef.current) {
      codeContainerRef.current.scrollTop = scrollPosition;
    }
  }, [scrollPosition]);

  return (
    <div className="flex min-h-full w-full items-center justify-center" ref={rootRef}>
      <div className="w-full space-y-4">
        <div className="ml-2 flex items-center space-x-2 font-medium text-neutral-400">
          <LoadingAnimation progress={(sequenceIndex / TASK_SEQUENCES.length) * 100} />
          <span className="text-sm">{currentSequence.status}...</span>
        </div>

        <div className="relative">
          <div
            className="relative h-[84px] w-full overflow-hidden rounded-lg font-mono text-xs"
            ref={codeContainerRef}
            style={{ scrollBehavior: "smooth" }}
          >
            <div>
              {visibleLines.map((line, index) => (
                <div className="flex h-[28px] items-center px-2" key={`${line.number}-${line.text}`}>
                  <div className="w-6 select-none pr-3 text-right text-neutral-600">{line.number}</div>
                  <div className="ml-1 flex-1 text-neutral-300">{line.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 top-0 rounded-lg from-black/90 via-black/50 to-transparent"
            style={{
              background:
                "linear-gradient(to bottom, var(--tw-gradient-from) 0%, var(--tw-gradient-via) 30%, var(--tw-gradient-to) 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
