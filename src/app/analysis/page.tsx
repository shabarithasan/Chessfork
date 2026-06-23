import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GameReviewPage } from "@/components/review/game-review-page";
import { createSeoMetadata } from "@/lib/seo/metadata";

export function generateMetadata(): Metadata {
  return createSeoMetadata({
    title: "Chess Game Review",
    description: "Paste a PGN and review the game with engine classifications, accuracy, win probability, and best-move explanations.",
    path: "/analysis",
  });
}

function firstSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const pgn = firstSearchValue(resolvedSearchParams.pgn);

  if (!pgn?.trim()) {
    redirect("/");
  }

  return <GameReviewPage initialPgn={pgn} />;
}
