import { NextResponse } from "next/server";

import { respondAsCoach } from "@/lib/platform-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(await respondAsCoach(body));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Coach request failed." },
      { status: 400 },
    );
  }
}
