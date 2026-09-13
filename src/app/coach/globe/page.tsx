import type { Metadata } from "next";

import { ChessGlobePage } from "@/components/coach/chess-globe";
import { createSeoMetadata } from "@/lib/seo/metadata";

export function generateMetadata(): Metadata {
  return createSeoMetadata({
    title: "Chess Globe",
    description: "Watch live chess games stream around the world on a 3D globe, with live games, countries, and openings.",
    path: "/coach/globe",
  });
}

export default function Page() {
  return (
    <div className="absolute inset-0 bg-[#040914] overflow-hidden">
      <ChessGlobePage />
    </div>
  );
}
