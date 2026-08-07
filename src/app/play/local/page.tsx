import type { Metadata } from "next";

import { LocalGamePage } from "@/components/play/local-game-page";

export const metadata: Metadata = {
  title: "Local Chess Game | Chessfork",
  description: "Play a local player-versus-player chess game, then review it with Chessfork.",
};

export default function Page() {
  return <LocalGamePage />;
}
