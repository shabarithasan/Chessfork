import { baseAnalysis, sampleCoachSnapshot } from "@/data/sample-data";
import { persistAnalysisRun } from "@/server/repositories/analysis-repository";
import { persistCoachSnapshot } from "@/server/repositories/coach-repository";
import { upsertSampleLeaderboards } from "@/server/repositories/leaderboard-repository";
import { upsertSamplePuzzles } from "@/server/repositories/puzzle-repository";
import { databaseEnabled, env } from "@/server/env";

async function main() {
  if (!databaseEnabled()) {
    throw new Error(
      "Database backend is disabled. Set BACKEND_DRIVER=database or hybrid and provide DATABASE_URL before seeding.",
    );
  }

  await upsertSamplePuzzles();
  await upsertSampleLeaderboards();
  await persistAnalysisRun(baseAnalysis, "pgn");
  await persistCoachSnapshot(sampleCoachSnapshot);

  console.log(`Seeded backend using ${env.DATABASE_URL}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
