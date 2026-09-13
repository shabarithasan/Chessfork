"use client";

import { OverlayAction } from "@/data/chapters";
import { cn } from "@/lib/utils";

interface ChapterDirectorProps {
  progress: number;
  actions?: OverlayAction[];
}

export function ChapterDirector({ progress, actions }: ChapterDirectorProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-25">
      {actions.map((action, idx) => {
        // Check if action is currently active based on progress bounds
        const isActive = progress >= action.start && progress <= action.end;
        
        // Calculate a localized progress just for this action (0 to 1 over its duration)
        // Used for fading in/out
        let actionProgress = 0;
        if (isActive) {
          const fadeZone = (action.end - action.start) * 0.15; // 15% of duration is fade
          if (progress < action.start + fadeZone) {
            actionProgress = (progress - action.start) / fadeZone; // fade in
          } else if (progress > action.end - fadeZone) {
            actionProgress = (action.end - progress) / fadeZone; // fade out
          } else {
            actionProgress = 1; // fully active
          }
        }

        if (action.type === 'cut-to-black') {
          return (
            <div 
              key={idx}
              className="absolute inset-0 flex items-center justify-center bg-black transition-opacity"
              style={{
                opacity: isActive ? 1 : 0,
                // Hard cut logic: we don't fade the cut-to-black usually, but we can do a very sharp fade
                transitionDuration: '100ms'
              }}
            >
              <h2 
                className="text-white text-5xl md:text-8xl font-bold tracking-[0.2em] uppercase"
                style={{
                  opacity: isActive ? actionProgress : 0,
                  transform: `scale(${1 + (1 - actionProgress) * 0.05})`,
                  transition: 'opacity 100ms, transform 100ms'
                }}
              >
                {action.text}
              </h2>
            </div>
          );
        }

        if (action.type === 'analysis') {
          return (
            <div
              key={idx}
              className="absolute flex flex-col items-start"
              style={{
                left: `${action.position.x}%`,
                top: `${action.position.y}%`,
                opacity: isActive ? actionProgress : 0,
                transform: `translateY(${isActive ? (1 - actionProgress) * 10 : 10}px)`,
                transition: 'opacity 300ms ease-out, transform 300ms ease-out'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-3xl font-mono font-bold tracking-tighter">
                  {action.evaluation}
                </span>
              </div>
              <div className="text-white/60 text-xs font-mono tracking-widest mt-1 ml-5">
                {action.text}
              </div>
              
              {/* Decorative analysis lines */}
              <div className="absolute top-1/2 -left-32 w-24 h-[1px] bg-gradient-to-r from-transparent to-white/30" />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
