import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ChessigmaPage } from "@/components/chessigma/ChessigmaPage";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "CHESSIGMA - Chess Analysis",
  description: "Advanced chess analysis with AI-powered insights",
};

export default function Page() {
  return (
    <div className={inter.className}>
      <ChessigmaPage />
    </div>
  );
}
