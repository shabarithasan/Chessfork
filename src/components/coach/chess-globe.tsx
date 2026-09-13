"use client";

import dynamic from "next/dynamic";

/* Mapbox GL requires browser APIs (canvas, WebGL) — must skip SSR */
const ChessGlobe = dynamic(() => import("./Globe/ChessGlobe"), { ssr: false });

export function ChessGlobePage() {
  return (
    <div className="absolute inset-0 w-full h-full bg-black overflow-hidden font-mono">
      <style jsx global>{`
        /* Hide Mapbox watermark */
        .mapboxgl-ctrl-logo { display: none !important; }
        .mapboxgl-ctrl-attrib { display: none !important; }

        @keyframes shimmer {
          0%, 100% { transform: translateX(-200%); }
          50% { transform: translateX(200%); }
        }
        @keyframes icon-glow {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 0 rgba(0,0,0,0)); }
          50% { filter: brightness(1.3) drop-shadow(0 0 4px rgba(251,191,36,0.4)); }
        }
      `}</style>
      <ChessGlobe />
    </div>
  );
}