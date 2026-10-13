import React from "react";

export function CoachPawnIcon({ className }: { className?: string }) {
  return (
    <img 
      src="/images/coach-pawn.png" 
      alt="AI Coach" 
      className={`object-cover object-center translate-y-[10%] ${className}`} 
    />
  );
}
