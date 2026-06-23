import { NextResponse } from "next/server";

import { checkDatabaseHealth } from "@/server/db/client";
import { databaseEnabled, env, redisEnabled } from "@/server/env";

export async function GET() {
  const dbHealthy = await checkDatabaseHealth();

  return NextResponse.json({
    ok: env.BACKEND_DRIVER === "memory" ? true : dbHealthy || !databaseEnabled(),
    mode: env.BACKEND_DRIVER,
    services: {
      databaseConfigured: databaseEnabled(),
      databaseHealthy: dbHealthy,
      redisConfigured: redisEnabled(),
    },
  });
}
