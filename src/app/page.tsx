"use client";

import { useState, useEffect } from "react";
import { CinematicSequence } from "@/components/cinematic/CinematicSequence";
import { SmoothScroller } from "@/components/layout/SmoothScroller";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main suppressHydrationWarning className="knightowl-landing bg-black min-h-screen">
      <SmoothScroller>
        {mounted && <CinematicSequence />}
      </SmoothScroller>
    </main>
  );
}
