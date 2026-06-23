import { NextResponse } from "next/server";

import { getAnalysisResponse } from "@/lib/platform-service";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const analysis = await getAnalysisResponse(id);

  if (!analysis) {
    return NextResponse.json({ message: "Report not found." }, { status: 404 });
  }

  return NextResponse.json(analysis);
}
