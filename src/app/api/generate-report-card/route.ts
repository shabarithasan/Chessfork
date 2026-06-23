import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { buildReportCardDataFromAnalysis, normalizeReportCardData } from "@/lib/report-card-data";
import { renderReportCardPng } from "@/lib/report-card-renderer";
import { getAnalysisResponse } from "@/lib/platform-service";

export const runtime = "nodejs";

const reportCardSchema = z.object({
  bestMove: z.string(),
  bestMoves: z.number().optional(),
  blackAccuracy: z.number(),
  blackPlayer: z.string(),
  blunders: z.number(),
  brilliantMoves: z.number(),
  date: z.string(),
  mistakes: z.number(),
  opening: z.string(),
  result: z.string(),
  totalMoves: z.number(),
  whiteAccuracy: z.number(),
  whitePlayer: z.string(),
  worstMove: z.string(),
});

function pngResponse(png: Uint8Array) {
  const body = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      "Content-Type": "image/png",
    },
  });
}

export async function GET(request: NextRequest) {
  const analysisId =
    request.nextUrl.searchParams.get("gameId") ??
    request.nextUrl.searchParams.get("analysisId") ??
    request.nextUrl.searchParams.get("id");

  if (!analysisId) {
    return NextResponse.json({ message: "Missing analysisId." }, { status: 400 });
  }

  const analysis = await getAnalysisResponse(analysisId);

  if (!analysis) {
    return NextResponse.json({ message: "Report not found." }, { status: 404 });
  }

  const png = await renderReportCardPng(buildReportCardDataFromAnalysis(analysis));
  return pngResponse(png);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reportCardSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid report card payload.", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const png = await renderReportCardPng(normalizeReportCardData(parsed.data));
  return pngResponse(png);
}
