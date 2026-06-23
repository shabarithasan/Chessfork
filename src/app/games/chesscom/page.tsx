import type { Metadata } from "next";

import { ChessComGameBrowserPage } from "@/components/analysis/chess-com-game-browser-page";
import { createSeoMetadata } from "@/lib/seo/metadata";
import { getCurrentUser } from "@/server/auth/session";
import { getAccountProfile } from "@/server/repositories/user-repository";

export function generateMetadata(): Metadata {
  return createSeoMetadata({
    title: "Chess.com Game Import",
    description: "Browse public Chess.com games, import a selected game, and generate a Chessfork Stockfish 18 analysis report.",
    path: "/games/chesscom",
  });
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ username?: string }>;
}) {
  const [{ username }, viewer] = await Promise.all([searchParams, getCurrentUser()]);
  const accountProfile = viewer ? await getAccountProfile(viewer.id) : null;
  const linkedChessComUsername = accountProfile?.linkedAccounts.find((account) => account.source === "chesscom")?.username;

  return (
    <ChessComGameBrowserPage
      initialUsername={username}
      linkedUsername={linkedChessComUsername}
      viewerDisplayName={viewer?.displayName}
    />
  );
}
