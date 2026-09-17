import type { Metadata } from "next";

import { NextMovePage } from "@/components/pages";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `Chess AI Next Move Calculator | ${siteConfig.name}`,
  description:
    "Find the best chess move instantly. Paste a FEN or play from any position. Powered by Stockfish 18 running in your browser. Free and no signup.",
};

export default function Page() {
  return <NextMovePage />;
}
