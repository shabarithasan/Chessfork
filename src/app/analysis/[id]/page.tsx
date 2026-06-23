import type { Metadata } from "next";

import { AnalysisReportPage } from "@/components/pages";
import { getAnalysisResponse } from "@/lib/platform-service";
import { buildReportCardDataFromAnalysis } from "@/lib/report-card-data";
import { createSeoMetadata, jsonLd } from "@/lib/seo/metadata";

type AnalysisPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: AnalysisPageProps): Promise<Metadata> {
  const { id } = await params;
  const analysis = await getAnalysisResponse(id);

  if (!analysis) {
    return createSeoMetadata({
      title: "Chess Analysis",
      description: "Chessfork chess analysis report",
      path: `/analysis/${encodeURIComponent(id)}`,
    });
  }

  const card = buildReportCardDataFromAnalysis(analysis);
  const title = `${card.whitePlayer} vs ${card.blackPlayer} Chess Analysis | Chessfork`;
  const description = `${card.whitePlayer} (${card.whiteAccuracy}%) vs ${card.blackPlayer} (${card.blackAccuracy}%) · ${card.opening} · Analyzed by Stockfish 18`;
  const imageUrl = `/api/generate-report-card?gameId=${encodeURIComponent(id)}`;

  return createSeoMetadata({
    title,
    description,
    image: imageUrl,
    path: `/analysis/${encodeURIComponent(id)}`,
    type: "article",
  });
}

export default async function Page({ params }: AnalysisPageProps) {
  const { id } = await params;
  const analysis = await getAnalysisResponse(id);
  const card = analysis ? buildReportCardDataFromAnalysis(analysis) : null;
  const description = card
    ? `${card.whitePlayer} (${card.whiteAccuracy}%) vs ${card.blackPlayer} (${card.blackAccuracy}%) · ${card.opening} · Analyzed by Stockfish 18`
    : "Chessfork chess analysis report";
  const imageUrl = `/api/generate-report-card?gameId=${encodeURIComponent(id)}`;

  return (
    <>
      {card ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@type": "Article",
              author: {
                "@type": "Organization",
                name: "Chessfork",
              },
              description,
              headline: `Chess Game Analysis: ${card.whitePlayer} vs ${card.blackPlayer}`,
              image: imageUrl,
              mainEntityOfPage: `/analysis/${encodeURIComponent(id)}`,
            }),
          }}
        />
      ) : null}
      <AnalysisReportPage analysisId={id} />
    </>
  );
}
