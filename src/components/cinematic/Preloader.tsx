"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PreloaderProps {
  onComplete: () => void;
}

export function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 15;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsHiding(true);
            setTimeout(onComplete, 1000); // Wait for fade out
          }, 500);
          return 100;
        }
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [onComplete]);

  if (isHiding && progress >= 100) {
    // We don't unmount immediately to allow CSS transition
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white transition-opacity duration-1000",
        isHiding ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      <div className="flex flex-col items-center gap-8 w-full max-w-md px-8">
        <h1 className="text-2xl font-bold tracking-[0.5em] uppercase text-white/90">
          ChessFork
        </h1>
        
        {/* Progress Line */}
        <div className="w-full h-[1px] bg-white/10 relative overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-white transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-[10px] tracking-[0.3em] uppercase text-white/50 animate-pulse">
          {progress >= 100 ? "Entering Experience" : "Loading Assets"}
        </div>
      </div>
    </div>
  );
}
