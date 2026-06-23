import type { Metadata } from "next";

import { AnalyzePage } from "@/components/pages";
import { createSeoMetadata } from "@/lib/seo/metadata";

export function generateMetadata(): Metadata {
  return createSeoMetadata({
    title: "Analyze Chess Games Online",
    description: "Import PGNs, Chess.com games, or Lichess games and get Stockfish 18 accuracy, blunder, and best-move analysis.",
    path: "/analyze",
  });
}

export default function Page() {
  return <AnalyzePage />;
}
