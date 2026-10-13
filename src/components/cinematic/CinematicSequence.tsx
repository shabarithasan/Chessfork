"use client";

import { useState } from "react";
import { CinematicOverlay } from "@/components/ui/CinematicOverlay";
import { HomepageCanvasSlider } from "@/components/cinematic/HomepageCanvasSlider";
import { SlideTextOverlay } from "@/components/cinematic/SlideTextOverlay";
import { cinematicTimeline } from "@/data/timeline";

export function CinematicSequence() {
  const [activeSlide, setActiveSlide] = useState(0);

  return (
    <>
      <div className="opacity-100">
        {/* Three.js WebGL Canvas — renders 3D cylinder of video planes */}
        <HomepageCanvasSlider
          slides={cinematicTimeline.media.map((slide) => ({
            videoUrl: slide.videoUrl,
            hasDarkOverlay: true,
          }))}
          onSlideChange={setActiveSlide}
          startIndex={0}
        />

        {/* HTML Text Overlay — CSS opacity transitions on top of canvas */}
        <SlideTextOverlay
          slides={cinematicTimeline.media}
          activeIndex={activeSlide}
        />

        {/* Pagination & Navigation Overlay */}
        <CinematicOverlay
          chapters={cinematicTimeline.chapters.map((c) => c.name)}
          activeChapter={activeSlide}
        />

        {/* FILM GRAIN */}
        <svg
          className="fixed inset-0 pointer-events-none z-[90] opacity-[0.03] w-full h-full"
          style={{ isolation: "isolate" }}
        >
          <filter id="noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>
    </>
  );
}
