import type { Metadata } from "next";

import { CoachPage } from "@/components/pages";
import { createSeoMetadata } from "@/lib/seo/metadata";

export function generateMetadata(): Metadata {
  return createSeoMetadata({
    title: "AI Chess Coach",
    description: "Find recurring chess weaknesses across multiple games with Chessfork AI coaching and Stockfish-backed evidence.",
    path: "/coach",
  });
}

export default function Page() {
  return <CoachPage />;
}
