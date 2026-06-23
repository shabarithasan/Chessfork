import { AnalysisLoadingExperience } from "@/components/analysis/analysis-loading-overlay";

export default function Loading() {
  return (
    <AnalysisLoadingExperience
      black="Black"
      depth="quick"
      openingLabel="Preparing analysis"
      presentation="page"
      source="pgn"
      timeControl="10:00"
      white="White"
    />
  );
}
