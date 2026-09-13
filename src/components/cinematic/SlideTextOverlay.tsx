"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

interface SlideContent {
  id: string;
  title: string;
  subtitle: string;
  cta?: string;
  ctaUrl?: string;
}

interface SlideTextOverlayProps {
  slides: SlideContent[];
  activeIndex: number;
}

/**
 * Pure HTML/CSS text overlay that sits on top of the Three.js canvas.
 * Text transitions use simple CSS opacity with staggered delays,
 * matching Rimac's exact pattern:
 *   - Title:   opacity 0.5s, delay 0.3s
 *   - Content: opacity 0.5s, delay 0.5s
 *   - CTA:     opacity 0.5s, delay 0.6s (fade in) / 0.2s (fade out)
 */
export function SlideTextOverlay({ slides, activeIndex }: SlideTextOverlayProps) {
  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
      {slides.map((slide, i) => {
        const isActive = i === activeIndex;

        return (
          <div
            key={slide.id}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-full max-w-4xl text-center px-4 flex flex-col items-center">
              {/* Title */}
              <h2
                tabIndex={isActive ? -1 : undefined}
                className={cn(
                  "text-4xl md:text-5xl lg:text-[4rem] font-medium tracking-[0.15em] uppercase text-white mb-6 leading-tight whitespace-pre-line",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                )}
                style={{
                  opacity: isActive ? 1 : 0,
                  transition: isActive
                    ? "opacity 0.5s ease 0.3s"
                    : "opacity 0.2s ease 0s",
                }}
              >
                {slide.title.split(" ").join("\n")}
              </h2>

              {/* Subtitle */}
              <p
                className="text-sm md:text-base font-semibold leading-relaxed text-white mb-12 max-w-xl mx-auto"
                style={{
                  opacity: isActive ? 1 : 0,
                  transition: isActive
                    ? "opacity 0.5s ease 0.5s"
                    : "opacity 0.2s ease 0s",
                }}
              >
                {slide.subtitle}
              </p>

              {/* CTA */}
              {slide.cta && (
                <Link
                  href={slide.ctaUrl || "#"}
                  className={cn(
                    "relative inline-flex items-center justify-center text-xs tracking-[0.2em] uppercase font-bold group overflow-hidden",
                    "py-4 w-64 border-t border-b border-white/30",
                    "pointer-events-auto transition-colors duration-300",
                    "focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
                  )}
                  style={{
                    opacity: isActive ? 1 : 0,
                    transition: isActive
                      ? "opacity 0.5s ease 0.6s"
                      : "opacity 0.2s ease 0s",
                  }}
                >
                  {/* The text, positioned above the sliding background */}
                  <span className="relative z-10 text-white transition-colors duration-300 group-hover:text-black">
                    {slide.cta}
                  </span>
                  
                  {/* Animated Background Fill */}
                  <span className="absolute inset-0 bg-white scale-y-0 origin-bottom transition-transform duration-300 ease-out group-hover:scale-y-100" />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
