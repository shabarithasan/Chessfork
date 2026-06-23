import { Queue } from "bullmq";
import Redis from "ioredis";

import { env, redisEnabled } from "@/server/env";

const connection = redisEnabled()
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    })
  : null;

export const analysisQueue = connection
  ? new Queue("analysis-runs", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    })
  : null;

export async function enqueueAnalysisRun(payload: {
  analysisId: string;
  pgn: string;
  depth: "quick" | "deep";
  source: "pgn" | "chesscom" | "lichess";
}) {
  if (!analysisQueue) {
    return null;
  }

  return analysisQueue.add("analyze", payload, {
    jobId: `${payload.analysisId}:${payload.depth}`,
  });
}
