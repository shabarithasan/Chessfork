import type { Metadata } from "next";

import { GamesPage } from "@/components/pages";
import { createSeoMetadata } from "@/lib/seo/metadata";

export function generateMetadata(): Metadata {
  return createSeoMetadata({
    title: "Chess Games Library",
    description: "Browse saved Chessfork chess analyses, compare accuracy, review openings, and reopen Stockfish-backed reports.",
    path: "/games",
  });
}

export default function Page() {
  return <GamesPage />;
}
