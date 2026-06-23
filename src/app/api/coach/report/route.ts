import { NextResponse } from "next/server";

import { createCoachReport } from "@/lib/platform-service";
import { getCurrentUser } from "@/server/auth/session";

export async function POST() {
  return NextResponse.json(await createCoachReport(await getCurrentUser()));
}
