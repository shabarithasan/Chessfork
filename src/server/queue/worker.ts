import { Worker } from "bullmq";
import Redis from "ioredis";

import { persistAnalysisRun } from "@/server/repositories/analysis-repository";
import { analyzePgnWithBestEngine } from "@/server/chess/stockfish-report";
import { env, redisEnabled } from "@/server/env";

async function main() {
  if (!redisEnabled()) {
    throw new Error("Redis backend is disabled. Set REDIS_URL to run the analysis worker.");
  }

  const worker = new Worker(
    "analysis-runs",
    async (job) => {
      const { pgn, depth, source } = job.data as {
        pgn: string;
        depth: "quick" | "deep";
        source: "pgn" | "chesscom" | "lichess";
      };

      const run = await analyzePgnWithBestEngine(pgn, {
        requestedDepth: depth,
        source,
      });

      await persistAnalysisRun(run, source);
      return { analysisId: run.id };
    },
    {
      connection: new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
      }),
    },
  );

  worker.on("completed", (job) => {
    console.log(`Completed analysis job ${job.id}`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Analysis job ${job?.id ?? "unknown"} failed`, error);
  });

  console.log("Analysis worker listening on queue: analysis-runs");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
