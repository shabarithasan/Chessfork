"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MoveNavBarProps {
  moves: string[];
  currentIndex: number;
  onGoTo: (index: number) => void;
  onStepBack: () => void;
  onStepForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

export function MoveNavBar({ moves, currentIndex, onGoTo, onStepBack, onStepForward, canGoBack, canGoForward }: MoveNavBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const active = scrollRef.current.querySelector("[data-active=true]");
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [currentIndex]);

  return (
    <div
      style={{ backgroundColor: "#333537" }}
      className="flex w-full max-w-[560px] items-center gap-1 rounded-xl px-2 py-2"
    >
      <button
        type="button"
        disabled={!canGoBack}
        onClick={onStepBack}
        className="flex shrink-0 items-center justify-center rounded-lg px-2.5 py-1.5 text-sm font-bold text-gray-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
      >
        &lt;
      </button>

      <div
        ref={scrollRef}
        className="flex flex-1 items-center gap-1 overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "thin" }}
      >
        <AnimatePresence mode="popLayout">
          {moves.length === 0 && (
            <motion.span
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-2 text-sm text-gray-500 italic"
            >
              Make a move to begin
            </motion.span>
          )}
          {moves.map((san, i) => {
            const isActive = i === currentIndex;
            const moveLabel = `${Math.floor(i / 2) + 1}${i % 2 === 0 ? "." : "..."}${san}`;
            return (
              <motion.button
                key={i}
                type="button"
                layout
                layoutId={isActive ? "active-move" : undefined}
                data-active={isActive}
                onClick={() => onGoTo(i)}
                className="whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold transition shrink-0"
                style={{
                  backgroundColor: isActive ? "#fecb00" : "transparent",
                  color: isActive ? "#000" : "#b0b3b8",
                }}
                animate={
                  isActive
                    ? {
                        boxShadow: [
                          "0 0 14px rgba(254, 203, 0, 0.55)",
                          "0 0 24px rgba(254, 203, 0, 0.85)",
                          "0 0 14px rgba(254, 203, 0, 0.55)",
                        ],
                      }
                    : { boxShadow: "0 0 0px rgba(254, 203, 0, 0)" }
                }
                transition={{
                  layout: { type: "spring", stiffness: 300, damping: 28 },
                  boxShadow: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                }}
              >
                {moveLabel}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      <button
        type="button"
        disabled={!canGoForward}
        onClick={onStepForward}
        className="flex shrink-0 items-center justify-center rounded-lg px-2.5 py-1.5 text-sm font-bold text-gray-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
      >
        &gt;
      </button>
    </div>
  );
}
