import type { Metadata } from "next";

import { GameReviewPage } from "@/components/review/game-review-page";

export const metadata: Metadata = {
  title: "Game Review — ChessFork",
  description: "Pick a game from a Chess.com archive (or paste a PGN) and review it move by move with Stockfish-powered analysis.",
};

export default function Page() {
  return <GameReviewPage initialPgn="" />;
}