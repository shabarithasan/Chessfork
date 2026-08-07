import { NextResponse } from "next/server";

import { checkMongoDatabaseHealth, getMongoClient } from "@/server/mongodb/client";
import { env, mongoDatabaseEnabled } from "@/server/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {
    mongoConfigured: mongoDatabaseEnabled(),
    mongoUriPresent: env.MONGODB_URI.length > 0,
  };

  if (mongoDatabaseEnabled()) {
    try {
      const client = getMongoClient();
      await client.connect();
      result.connected = true;
      result.ping = await client.db(env.MONGODB_DB).command({ ping: 1 });
      result.health = await checkMongoDatabaseHealth();
      const runs = client.db(env.MONGODB_DB).collection("analysisRuns");
      result.runCount = await runs.countDocuments();
      result.sampleRun = await runs.findOne({}, { projection: { _id: 1 } });
    } catch (error) {
      result.connected = false;
      result.error = error instanceof Error ? error.message : String(error);
    }
  }

  return NextResponse.json(result);
}
