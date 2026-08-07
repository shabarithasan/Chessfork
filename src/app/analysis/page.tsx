import { AnalysisPageFlow } from "@/components/analysis/AnalysisPageFlow";

export const metadata = {
  title: "Game Analysis - Chessigma",
  description: "Full game analysis with Stockfish 18 engine, multi-PV analysis, and AI coaching.",
};

export const dynamic = "force-dynamic";

export default function AnalysisPage() {
  return <AnalysisPageFlow />;
}
