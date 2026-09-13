"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { X, ArrowUpRight } from "lucide-react";

interface CinematicOverlayProps {
  chapters: string[];
  activeChapter: number;
}

export function CinematicOverlay({ chapters, activeChapter }: CinematicOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-40 text-white" style={{ isolation: "isolate" }}>
        {/* Top Left: Logo */}
        <div className="absolute top-8 left-8 md:left-12 flex items-center gap-3">
          {/* Placeholder for shield icon */}
          <div className="w-8 h-10 border-2 border-white rounded-b-full flex items-center justify-center">
            <span className="font-bold text-lg leading-none">C</span>
          </div>
          <h1 className="text-xl font-bold tracking-[0.3em] uppercase hidden md:block">CHESSFORK</h1>
        </div>

        {/* Top Right: Hamburger Menu (Opens Menu) */}
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="absolute top-10 right-8 md:right-12 pointer-events-auto cursor-pointer hover:opacity-70 transition-opacity flex flex-col gap-2 w-8 focus:outline-none"
        >
          <div className="w-full h-[1px] bg-white"></div>
          <div className="w-full h-[1px] bg-white"></div>
        </button>

        {/* Left Side: Pagination Nav (Rimac full-list style) */}
        <div className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 flex gap-4">
          {/* Vertical Track */}
          <div className="relative w-[1px] md:w-[2px] bg-white/20 h-auto">
            {/* Active Highlight Line */}
            <div
              className="absolute left-0 w-full bg-white transition-all duration-700 ease-out"
              style={{
                top: `${(activeChapter / chapters.length) * 100}%`,
                height: `${100 / chapters.length}%`,
              }}
            />
          </div>

          {/* Chapter List */}
          <div className="flex flex-col justify-center gap-3 md:gap-4 py-1">
            {chapters.map((chapter, i) => {
              const isActive = activeChapter === i;
              return (
                <div
                  key={chapter}
                  className={cn(
                    "text-[8px] md:text-[10px] tracking-[0.2em] uppercase font-bold transition-all duration-700 ease-out leading-none",
                    isActive ? "text-white opacity-100" : "text-white/40 opacity-40 hover:opacity-70 cursor-pointer pointer-events-auto"
                  )}
                >
                  {String(i + 1).padStart(2, "0")} {chapter}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Center: Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 mix-blend-difference flex flex-col items-center">
          <div className="w-[2px] h-[50px] relative overflow-hidden bg-white/20">
            <div className="absolute inset-0 bg-white animate-scroll-indicator" />
          </div>
        </div>
      </div>

      {/* Fullscreen Liquid Glass Menu Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Liquid Glass Background */}
        <div className="absolute inset-0 bg-[#061218]/80 backdrop-blur-2xl transition-opacity duration-1000" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.04),_transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,_rgba(11,33,45,0.8),_transparent_70%)] pointer-events-none" />

        {/* Menu Top Header */}
        <div className="absolute top-8 left-8 md:left-12 flex items-center gap-3 text-white">
          <div className="w-8 h-10 border-2 border-white rounded-b-full flex items-center justify-center">
            <span className="font-bold text-lg leading-none">C</span>
          </div>
          <h1 className="text-xl font-bold tracking-[0.3em] uppercase hidden md:block">CHESSFORK</h1>
        </div>

        <button 
          onClick={() => setIsMenuOpen(false)}
          className="absolute top-8 right-8 md:right-12 flex items-center gap-3 text-white/60 hover:text-white transition-colors focus:outline-none group"
        >
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Close</span>
          <X strokeWidth={1} className="size-8 transition-transform group-hover:rotate-90 duration-500 ease-out" />
        </button>

        {/* Menu Links */}
        <div className="relative z-10 w-full max-w-3xl px-6 flex flex-col justify-center h-full">
          {/* Main Links */}
          <nav className="flex flex-col gap-6 w-full max-w-lg mx-auto">
            {[
              { num: "01", label: "ANALYZE GAME", href: "/analyze" },
              { num: "02", label: "AI COACH", href: "/coach" },
              { num: "03", label: "PUZZLES & TACTICS", href: "/puzzles" },
              { num: "04", label: "PLAY LOCAL", href: "/play/local" },
            ].map((link, idx) => (
              <Link 
                key={link.num}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="group flex items-baseline gap-6 text-white hover:text-white transition-colors duration-300 w-fit"
                style={{ 
                  transform: isMenuOpen ? "translateY(0)" : "translateY(20px)",
                  opacity: isMenuOpen ? 1 : 0,
                  transitionDelay: isMenuOpen ? `${idx * 75 + 200}ms` : "0ms",
                  transitionProperty: "opacity, transform, color",
                  transitionDuration: "700ms",
                  transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)"
                }}
              >
                <span className="text-[11px] font-bold tracking-[0.1em] text-white/30 group-hover:text-amber-400 transition-colors w-6 text-right font-mono">
                  {link.num}
                </span>
                <span className="text-3xl md:text-[40px] font-medium tracking-wider uppercase group-hover:text-amber-400 transition-colors">
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>

          {/* Secondary Links */}
          <nav className="flex flex-col gap-[18px] w-full max-w-lg mx-auto mt-16 pl-12">
            {[
              { label: "LEADERBOARDS", href: "/leaderboards/puzzles", external: false },
              { label: "SAVED GAMES", href: "/games", external: false },
              { label: "SHOP", href: "/shop", external: true },
              { label: "BLOG", href: "/blog", external: true },
              { label: "CONTACT", href: "/contact", external: false },
            ].map((link, idx) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="group flex items-center gap-2 text-[13px] font-semibold tracking-[0.15em] text-white/60 hover:text-white uppercase transition-colors w-fit"
                style={{
                  transform: isMenuOpen ? "translateY(0)" : "translateY(15px)",
                  opacity: isMenuOpen ? 1 : 0,
                  transitionDelay: isMenuOpen ? `${(idx + 4) * 75 + 200}ms` : "0ms",
                  transitionProperty: "opacity, transform, color",
                  transitionDuration: "700ms",
                  transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)"
                }}
              >
                {link.label}
                {link.external && <ArrowUpRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
