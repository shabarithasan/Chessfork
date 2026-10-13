"use client";

import { useState, useEffect } from "react";
import { CinematicSequence } from "@/components/cinematic/CinematicSequence";
import { SmoothScroller } from "@/components/layout/SmoothScroller";
import EnteringExperience from "@/components/ui/entering-experience";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLoadingComplete = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setShowLoading(false);
    }, 1200); // Wait slightly longer than the 1s transition to prevent any snapping
  };

  return (
    <>
      {showLoading && (
        <div 
          className={`fixed inset-0 z-[9999] transition-opacity duration-1000 ease-in-out bg-[#f8f8f8] ${
            isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <EnteringExperience onComplete={handleLoadingComplete} />
        </div>
      )}

      <main suppressHydrationWarning className="knightowl-landing bg-black min-h-screen">
        <SmoothScroller>
          {mounted && <CinematicSequence />}
        </SmoothScroller>
      </main>
    </>
  );
}
