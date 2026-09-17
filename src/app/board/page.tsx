import type { Metadata } from "next";

import { BoardPage } from "@/components/pages";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `Chess Analysis Board — Free Online Stockfish 18 Engine | ${siteConfig.name}`,
  description:
    "Free online chess analysis board powered by Stockfish 18. Paste a PGN, FEN, or play moves to evaluate positions with the strongest engine directly in your browser.",
};

export default function Page() {
  return <BoardPage />;
}
