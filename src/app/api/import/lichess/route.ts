import { NextResponse } from "next/server";

import { importFromSource } from "@/lib/platform-service";
import { getCurrentUser } from "@/server/auth/session";
import { checkRateLimit } from "@/server/rate-limiter";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitResult = checkRateLimit(`import-lichess:${ip}`, 15, 60_000);

  if (!rateLimitResult.allowed) {
    return NextResponse.json({ message: "Too many requests." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const data = await importFromSource("lichess", body, await getCurrentUser());
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Import failed." },
      { status: 400 },
    );
  }
}
